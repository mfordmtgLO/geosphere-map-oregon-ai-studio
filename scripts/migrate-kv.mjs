import fs from 'fs';
import path from 'path';

// Minimal Upstash REST client
async function fetchKV(url, token, command, ...args) {
  const reqUrl = new URL(`/${command}/${args.map(encodeURIComponent).join('/')}`, url);
  const res = await fetch(reqUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`KV API error: ${res.statusText}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

// Write migration script to export from old KV and import to Firebase
async function main() {
  const KV_REST_API_URL = 'https://uncommon-airedale-192266.upstash.io';
  const KV_REST_API_TOKEN = 'gQAAAAAAAu8KAAIgcDI0YWI2NmI3MjBlNDY0MjRiODhmZmU4ZjU0MmQ0ZGRiMA';
  
  console.log('Connecting to old KV store...');
  
  let allKeys = [];
  let cursor = '0';
  do {
    const res = await fetchKV(KV_REST_API_URL, KV_REST_API_TOKEN, 'scan', cursor, 'match', 'listings:*', 'count', 100);
    cursor = res[0];
    allKeys = allKeys.concat(res[1]);
  } while (cursor !== '0');
  
  console.log(`Found ${allKeys.length} snapshot keys. Starting migration...`);
  
  // Use our new Firestore-backed mock-kv client
  const { kv: fbKv } = await import('../mock-kv/index.js');
  
  for (let i = 0; i < allKeys.length; i++) {
     const key = allKeys[i];
     console.log(`[${i+1}/${allKeys.length}] Migrating ${key}...`);
     const rawValue = await fetchKV(KV_REST_API_URL, KV_REST_API_TOKEN, 'get', key);
     
     // Upstash REST API returns JSON strings for objects, parse it
     let value = rawValue;
     if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch (e) {
            // keep as string if it wasn't JSON
        }
     }
     
     await fbKv.set(key, value);
  }
  
  console.log('Migration complete!');
}

main().catch(console.error);
