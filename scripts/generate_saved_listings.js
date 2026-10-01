import fs from 'fs';
import path from 'path';
import { buildOverlaySets, buildProgramReviewSets } from '../api/overlay-classification.js';
import { getProgramReviewConfiguration } from '../api/program-review-config.js';

// Seeded random helper for deterministic mock generation
function createRandom(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
const STREET_NAMES = ["Main St", "Oak Ave", "Pine Rd", "Maple Dr", "Cedar Ln", "Washington St", "Park Blvd", "Elm St", "View Ridge Way", "River Rd", "Hillside Dr", "Highland Ave", "Sunset Blvd", "Forest Dr", "Valley View Way"];
const AGENT_BROKERAGES = ["Cascade Hasson Sotheby's", "Windermere Real Estate", "RE/MAX Equity Group", "eXp Realty", "Keller Williams Realty", "Coldwell Banker Bain", "John L. Scott Real Estate"];

function generateCityListings(cityName, state, county, zipCode, centerLat, centerLng, count, snapshotId) {
  const rand = createRandom(cityName + count);
  const listings = [];

  for (let i = 1; i <= count; i++) {
    const isMultiFamily = i % 7 === 0;
    const isDuplex = i % 5 === 0 && !isMultiFamily;
    const isCondo = i % 8 === 0 && !isMultiFamily && !isDuplex;
    
    let propType = "Single Family";
    let units = 1;
    let beds = Math.floor(2 + rand() * 3);
    let baths = Math.floor(1 + rand() * 3);
    let sqft = Math.floor(1000 + rand() * 1800);
    let price = Math.floor(250000 + rand() * 350000);

    if (isMultiFamily) {
      propType = rand() > 0.5 ? "Triplex" : "Fourplex";
      units = propType === "Fourplex" ? 4 : 3;
      beds = units * 2;
      baths = units;
      sqft = units * 850;
      price = Math.floor(550000 + rand() * 450000);
    } else if (isDuplex) {
      propType = "Duplex";
      units = 2;
      beds = 4;
      baths = 2;
      sqft = 2100;
      price = Math.floor(420000 + rand() * 250000);
    } else if (isCondo) {
      propType = "Condo";
      sqft = Math.floor(800 + rand() * 500);
      price = Math.floor(210000 + rand() * 180000);
    }

    // Spread coordinates slightly around city center
    const latOffset = (rand() - 0.5) * 0.06;
    const lngOffset = (rand() - 0.5) * 0.08;
    const lat = Number((centerLat + latOffset).toFixed(6));
    const lng = Number((centerLng + lngOffset).toFixed(6));

    const streetNum = Math.floor(100 + rand() * 9000);
    const streetName = STREET_NAMES[Math.floor(rand() * STREET_NAMES.length)];
    const address = `${streetNum} ${streetName}`;
    const formattedAddress = `${address}, ${cityName}, ${state} ${zipCode}`;

    const fnIdx = Math.floor(rand() * FIRST_NAMES.length);
    const lnIdx = Math.floor(rand() * LAST_NAMES.length);
    const agentFirstName = FIRST_NAMES[fnIdx] || "Agent";
    const agentLastName = LAST_NAMES[lnIdx] || "Representative";
    const agentName = `${agentFirstName} ${agentLastName}`;
    const brokerage = AGENT_BROKERAGES[Math.floor(rand() * AGENT_BROKERAGES.length)];
    const phoneNum = `541-${Math.floor(200 + rand() * 700)}-${Math.floor(1000 + rand() * 9000)}`;
    const email = `${agentFirstName.toLowerCase()}.${agentLastName.toLowerCase()}@${brokerage.toLowerCase().replace(/[^a-z]/g, '')}.com`;

    listings.push({
      id: `${snapshotId}-prop-${i}`,
      formattedAddress,
      address,
      city: cityName,
      county,
      state,
      zipCode,
      latitude: lat,
      longitude: lng,
      price,
      bedrooms: beds,
      bathrooms: baths,
      squareFootage: sqft,
      propertyType: propType,
      units,
      yearBuilt: Math.floor(1965 + rand() * 58),
      daysOnMarket: Math.floor(1 + rand() * 45),
      mlsNumber: `OR${Math.floor(22000000 + rand() * 9000000)}`,
      mlsName: "RMLS",
      listingAgent: {
        name: `${agentName} (${brokerage})`,
        phone: phoneNum,
        email: email,
        website: `https://${brokerage.toLowerCase().replace(/[^a-z]/g, '')}.com`
      }
    });
  }

  return listings;
}

async function main() {
  console.log("Generating 200+ Rentcast saved listing snapshots...");

  const citiesConfig = [
    {
      cityName: "Cottage Grove",
      state: "OR",
      county: "Lane",
      zipCode: "97424",
      centerLat: 43.7976,
      centerLng: -123.0593,
      count: 63,
      savedAt: "2026-09-16T15:57:06.000Z",
      cacheKey: "listings:cottage-grove:lane:97424:or"
    },
    {
      cityName: "Eugene",
      state: "OR",
      county: "Lane",
      zipCode: "97401",
      centerLat: 44.0521,
      centerLng: -123.0867,
      count: 55,
      savedAt: "2026-09-18T10:15:22.000Z",
      cacheKey: "listings:eugene:lane:97401:or"
    },
    {
      cityName: "Roseburg",
      state: "OR",
      county: "Douglas",
      zipCode: "97470",
      centerLat: 43.2165,
      centerLng: -123.3417,
      count: 48,
      savedAt: "2026-09-20T14:22:11.000Z",
      cacheKey: "listings:roseburg:douglas:97470:or"
    },
    {
      cityName: "Salem",
      state: "OR",
      county: "Marion",
      zipCode: "97301",
      centerLat: 44.9429,
      centerLng: -123.0351,
      count: 42,
      savedAt: "2026-09-22T09:40:05.000Z",
      cacheKey: "listings:salem:marion:97301:or"
    },
    {
      cityName: "Bend",
      state: "OR",
      county: "Deschutes",
      zipCode: "97701",
      centerLat: 44.0582,
      centerLng: -121.3153,
      count: 38,
      savedAt: "2026-09-25T11:12:00.000Z",
      cacheKey: "listings:bend:deschutes:97701:or"
    },
    {
      cityName: "Portland",
      state: "OR",
      county: "Multnomah",
      zipCode: "97201",
      centerLat: 45.5152,
      centerLng: -122.6784,
      count: 50,
      savedAt: "2026-09-28T16:05:30.000Z",
      cacheKey: "listings:portland:multnomah:97201:or"
    }
  ];

  const snapshots = [];

  for (const cfg of citiesConfig) {
    const rawListings = generateCityListings(
      cfg.cityName, cfg.state, cfg.county, cfg.zipCode,
      cfg.centerLat, cfg.centerLng, cfg.count, cfg.cacheKey
    );

    const overlaySets = await buildOverlaySets(rawListings, cfg.state);
    const programReviewSets = buildProgramReviewSets(overlaySets.all);

    const snapshot = {
      snapshotId: `${cfg.cacheKey}:${new Date(cfg.savedAt).getTime()}`,
      cacheKey: cfg.cacheKey,
      area: {
        city: cfg.cityName,
        county: cfg.county,
        zipCode: cfg.zipCode,
        state: cfg.state,
        label: `${cfg.cityName} · ${cfg.state}`
      },
      savedAt: cfg.savedAt,
      count: overlaySets.all.length,
      totalFetched: overlaySets.all.length,
      overlaySets,
      programReviewSets,
      programReviewConfiguration: getProgramReviewConfiguration()
    };

    snapshots.push(snapshot);
  }

  const outputPath = path.resolve(process.cwd(), 'data/saved-listings-cache.json');
  fs.writeFileSync(outputPath, JSON.stringify(snapshots, null, 2), 'utf8');
  console.log(`Successfully generated ${snapshots.length} saved snapshots with ${snapshots.reduce((acc, s) => acc + s.count, 0)} total listings to ${outputPath}`);
}

main().catch(console.error);
