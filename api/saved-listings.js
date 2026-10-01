import { timingSafeEqual } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { kv } from "@vercel/kv";
import { buildOverlaySets, buildProgramReviewSets } from "./overlay-classification.js";
import { getProgramReviewConfiguration } from "./program-review-config.js";

const CACHE_KEY_PREFIX = "listings:";
const MAX_SCAN_PAGES = 100;
const SCAN_COUNT = 100;
const BUNDLED_CACHE_PATH = path.join(process.cwd(), "data/saved-listings-cache.json");

function sendJson(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(payload);
}

function tokenMatches(provided, expected) {
  if (!provided || !expected) return false;
  const actualBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function areaFromCacheKey(cacheKey) {
  const segments = cacheKey.slice(CACHE_KEY_PREFIX.length).split(":");
  return { label: segments.filter(Boolean).join(" · "), cacheKey };
}

function normalizeSnapshot(cacheKey, raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.listings)) return null;
  const all = raw.overlaySets?.all ?? raw.listings;
  return {
    snapshotId: raw.snapshotId ?? `${cacheKey}:${raw.savedAt ?? raw.cachedAt ?? 0}`,
    cacheKey,
    area: raw.area ?? areaFromCacheKey(cacheKey),
    savedAt: raw.savedAt ?? raw.cachedAt ?? null,
    count: raw.count ?? all.length,
    totalFetched: raw.totalFetched ?? all.length,
    overlaySets: {
      all,
      lmi: raw.overlaySets?.lmi ?? [],
      usda: raw.overlaySets?.usda ?? [],
      lmiUsda: raw.overlaySets?.lmiUsda ?? [],
    },
    programReviewSets: raw.programReviewSets ?? buildProgramReviewSets(all),
    programReviewConfiguration: raw.programReviewConfiguration ?? getProgramReviewConfiguration(),
  };
}

async function listSnapshotKeys() {
  const keys = [];
  let cursor = "0";
  for (let page = 0; page < MAX_SCAN_PAGES; page++) {
    const [nextCursor, batch] = await kv.scan(cursor, { match: `${CACHE_KEY_PREFIX}*`, count: SCAN_COUNT });
    if (Array.isArray(batch)) keys.push(...batch);
    cursor = String(nextCursor ?? "0");
    if (cursor === "0") break;
  }
  return [...new Set(keys)];
}

async function readSnapshots(keys) {
  const snapshots = [];
  for (let index = 0; index < keys.length; index += SCAN_COUNT) {
    const chunk = keys.slice(index, index + SCAN_COUNT);
    const values = await kv.mget(...chunk);
    if (Array.isArray(values)) {
      values.forEach((value, valueIndex) => {
        const snapshot = normalizeSnapshot(chunk[valueIndex], value);
        if (snapshot && snapshot.count > 0) snapshots.push(snapshot);
      });
    }
  }
  return snapshots.sort((a, b) => Number(b.savedAt ?? 0) - Number(a.savedAt ?? 0));
}

function needsOverlayRefresh(snapshot) {
  return snapshot.overlaySets.all.some((listing) =>
    !listing?.overlayEligibility ||
    typeof listing.overlayEligibility.lmi !== "boolean" ||
    typeof listing.overlayEligibility.usda !== "boolean" ||
    listing.overlayEligibility.usdaInterpretation !== "outside-ineligible-v1" ||
    typeof listing.overlayEligibility.firstHome?.available !== "boolean" ||
    typeof listing.overlayEligibility.lakeviewNational?.reviewReady !== "boolean"
  );
}

async function refreshLegacyOverlaySets(snapshot) {
  if (!needsOverlayRefresh(snapshot)) return snapshot;

  const overlaySets = await buildOverlaySets(snapshot.overlaySets.all, snapshot.area?.state ?? "OR");
  return {
    ...snapshot,
    count: overlaySets.all.length,
    overlaySets,
    programReviewSets: buildProgramReviewSets(overlaySets.all),
    programReviewConfiguration: getProgramReviewConfiguration(),
  };
}

async function loadBundledSnapshots() {
  try {
    const rawText = await readFile(BUNDLED_CACHE_PATH, "utf8");
    const json = JSON.parse(rawText);
    if (Array.isArray(json)) return json;
  } catch (e) {
    console.warn("Could not read bundled saved listings cache:", e.message);
  }
  return [];
}

export async function saveLocalListingSnapshot(snapshot) {
  try {
    const existing = await loadBundledSnapshots();
    const filtered = existing.filter(s => s.cacheKey !== snapshot.cacheKey && s.snapshotId !== snapshot.snapshotId);
    filtered.unshift(snapshot);
    await writeFile(BUNDLED_CACHE_PATH, JSON.stringify(filtered.slice(0, 50), null, 2), "utf8");
  } catch (e) {
    console.warn("Local snapshot backup save failed:", e.message);
  }
}

/** Shared cache-only reader for the protected dashboard export and the map UI. */
export async function readSavedListingPulls() {
  let kvSnapshots = [];
  try {
    const keys = await listSnapshotKeys();
    if (keys.length > 0) {
      kvSnapshots = await readSnapshots(keys);
    }
  } catch (e) {
    console.warn("KV snapshot fetch encountered an issue, checking disk cache fallback:", e.message);
  }

  // Combine KV snapshots and bundled disk cache, deduplicating by snapshotId / cacheKey
  const bundledSnapshots = await loadBundledSnapshots();
  const mapByCacheKey = new Map();

  // Load bundled snapshots first as base
  bundledSnapshots.forEach(s => {
    if (s && s.cacheKey) mapByCacheKey.set(s.cacheKey, s);
  });

  // Overwrite with newer KV snapshots if available
  kvSnapshots.forEach(s => {
    if (s && s.cacheKey) mapByCacheKey.set(s.cacheKey, s);
  });

  const allSnapshots = Array.from(mapByCacheKey.values()).sort((a, b) => new Date(b.savedAt ?? 0) - new Date(a.savedAt ?? 0));
  return Promise.all(allSnapshots.map(refreshLegacyOverlaySets));
}

/**
 * Server-to-server export of cache-only Rentcast snapshots. It never calls
 * Rentcast. Consumers must provide the shared GEOSPHERE_SYNC_TOKEN header.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
  if (!tokenMatches(req.headers["x-geosphere-sync-token"], process.env.GEOSPHERE_SYNC_TOKEN)) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }

  try {
    const pulls = await readSavedListingPulls();
    return sendJson(res, 200, {
      version: 1,
      generatedAt: new Date().toISOString(),
      pulls,
    });
  } catch (error) {
    console.error("Saved listing export failed:", error.message);
    return sendJson(res, 500, { error: "Unable to export saved listings" });
  }
}
