import { kv } from '../mock-kv/index.js';

async function main() {
    const keysRes = await kv.scan('0', { match: 'listings:*' });
    const keys = keysRes[1];
    
    console.log(`Found ${keys.length} keys in Firestore mock-kv:`);
    
    let totalItems = 0;
    for (const key of keys) {
        try {
            const data = await kv.get(key);
            // Some listings might be double stringified, some might just be objects
            let parsed = typeof data === 'string' ? JSON.parse(data) : data;
            
            // Rentcast data format from Upstash
            const count = Array.isArray(parsed) ? parsed.length : 
                          (parsed.listings && Array.isArray(parsed.listings) ? parsed.listings.length : 0);
                          
            console.log(`- ${key}: ${count} properties`);
            totalItems += count;
        } catch (e) {
            console.log(`- ${key}: Error parsing - ${e.message}`);
        }
    }
    
    console.log(`Total properties imported: ${totalItems}`);
    process.exit(0);
}

main().catch(console.error);
