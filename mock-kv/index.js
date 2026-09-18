import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc, increment, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Read config
let firebaseConfig = null;
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.warn('Firebase config not found. KV operations will fail.');
}

const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
const db = firebaseConfig ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : null;

const COLLECTION_NAME = 'kv_store';
const MAX_CHUNK_SIZE = 1000000; // ~1MB safe limit for Firestore

export const kv = {
  async get(key) {
    if (!db) return null;
    const docRef = doc(db, COLLECTION_NAME, encodeURIComponent(key));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    
    const data = snap.data();
    
    // Handle chunked data
    if (data.isChunked) {
        let fullString = '';
        for (let i = 0; i < data.chunkCount; i++) {
            const chunkRef = doc(db, COLLECTION_NAME, `${encodeURIComponent(key)}_chunk_${i}`);
            const chunkSnap = await getDoc(chunkRef);
            if (chunkSnap.exists()) {
                fullString += chunkSnap.data().value;
            }
        }
        return JSON.parse(fullString);
    }
    
    return data.value;
  },
  async set(key, value, options) {
    if (!db) return 'OK';
    const valueString = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (valueString.length > MAX_CHUNK_SIZE) {
        // Chunk it up
        const chunks = [];
        for (let i = 0; i < valueString.length; i += MAX_CHUNK_SIZE) {
            chunks.push(valueString.slice(i, i + MAX_CHUNK_SIZE));
        }
        
        // Save chunks
        for (let i = 0; i < chunks.length; i++) {
            const chunkRef = doc(db, COLLECTION_NAME, `${encodeURIComponent(key)}_chunk_${i}`);
            await setDoc(chunkRef, { value: chunks[i] });
        }
        
        // Save main pointer
        const docRef = doc(db, COLLECTION_NAME, encodeURIComponent(key));
        await setDoc(docRef, { isChunked: true, chunkCount: chunks.length });
    } else {
        const docRef = doc(db, COLLECTION_NAME, encodeURIComponent(key));
        await setDoc(docRef, { value, isChunked: false });
    }
    return 'OK';
  },
  async del(key) {
    if (!db) return 0;
    const docRef = doc(db, COLLECTION_NAME, encodeURIComponent(key));
    
    // We should ideally clean up chunks here too, but for basic KV usage let's stick to the pointer
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data().isChunked) {
        const chunkCount = snap.data().chunkCount;
        for(let i=0; i<chunkCount; i++) {
             const chunkRef = doc(db, COLLECTION_NAME, `${encodeURIComponent(key)}_chunk_${i}`);
             await deleteDoc(chunkRef);
        }
    }
    
    await deleteDoc(docRef);
    return 1;
  },
  async incr(key) {
    if (!db) return 1;
    const docRef = doc(db, COLLECTION_NAME, encodeURIComponent(key));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
        await setDoc(docRef, { value: 1 });
        return 1;
    } else {
        await updateDoc(docRef, { value: increment(1) });
        return Number(snap.data().value || 0) + 1;
    }
  },
  async incrby(key, amount) {
    if (!db) return amount;
    const docRef = doc(db, COLLECTION_NAME, encodeURIComponent(key));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
        await setDoc(docRef, { value: Number(amount) });
        return Number(amount);
    } else {
        await updateDoc(docRef, { value: increment(Number(amount)) });
        return Number(snap.data().value || 0) + Number(amount);
    }
  },
  async mget(...keys) {
    const flatKeys = Array.isArray(keys[0]) ? keys[0] : keys;
    if (flatKeys.length === 0) return [];
    return Promise.all(flatKeys.map(k => this.get(k)));
  },
  async scan(cursor, options = {}) {
    if (!db) return ['0', []];
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    const match = options?.match;
    let prefix = '';
    if (match && match.endsWith('*')) {
      prefix = match.slice(0, -1);
    }
    
    let allKeys = [];
    snap.forEach(document => {
        const key = decodeURIComponent(document.id);
        if (!key.includes('_chunk_') && (!prefix || key.startsWith(prefix))) {
            allKeys.push(key);
        }
    });
    
    return ['0', allKeys];
  }
};

export function createClient() {
  return kv;
}
export default { kv, createClient };
