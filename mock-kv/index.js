import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc, increment, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let firebaseConfig = null;
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  // Config optional
}

const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
const db = firebaseConfig ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : null;

const COLLECTION_NAME = 'kv_store';
const LOCAL_STORE_PATH = path.resolve(process.cwd(), 'data/local-kv-store.json');

// Memory + disk cache
let localStore = {};
let quotaExhausted = false;

function loadLocalStore() {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      localStore = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, 'utf8'));
    }
  } catch (e) {
    localStore = {};
  }
}

function persistLocalStore() {
  try {
    const dir = path.dirname(LOCAL_STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(localStore, null, 2), 'utf8');
  } catch (e) {
    // Ignore write issues
  }
}

loadLocalStore();

function isQuotaError(err) {
  const msg = String(err?.message || err || '');
  return msg.includes('Quota limit exceeded') || msg.includes('resource-exhausted') || msg.includes('429');
}

export const kv = {
  async get(key) {
    if (key in localStore) return localStore[key];
    if (!db || quotaExhausted) return null;

    try {
      const docRef = doc(db, COLLECTION_NAME, encodeURIComponent(key));
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      
      const data = snap.data();
      let val = data.value;
      if (data.isChunked) {
          let fullString = '';
          for (let i = 0; i < data.chunkCount; i++) {
              const chunkRef = doc(db, COLLECTION_NAME, `${encodeURIComponent(key)}_chunk_${i}`);
              const chunkSnap = await getDoc(chunkRef);
              if (chunkSnap.exists()) fullString += chunkSnap.data().value;
          }
          val = JSON.parse(fullString);
      }
      localStore[key] = val;
      persistLocalStore();
      return val;
    } catch (e) {
      if (isQuotaError(e)) quotaExhausted = true;
      return localStore[key] ?? null;
    }
  },

  async set(key, value, options) {
    localStore[key] = value;
    persistLocalStore();

    if (!db || quotaExhausted) return 'OK';

    try {
      const valueString = typeof value === 'string' ? value : JSON.stringify(value);
      if (valueString.length > 1000000) {
          const chunks = [];
          for (let i = 0; i < valueString.length; i += 1000000) {
              chunks.push(valueString.slice(i, i + 1000000));
          }
          for (let i = 0; i < chunks.length; i++) {
              const chunkRef = doc(db, COLLECTION_NAME, `${encodeURIComponent(key)}_chunk_${i}`);
              await setDoc(chunkRef, { value: chunks[i] });
          }
          const docRef = doc(db, COLLECTION_NAME, encodeURIComponent(key));
          await setDoc(docRef, { isChunked: true, chunkCount: chunks.length });
      } else {
          const docRef = doc(db, COLLECTION_NAME, encodeURIComponent(key));
          await setDoc(docRef, { value, isChunked: false });
      }
    } catch (e) {
      if (isQuotaError(e)) quotaExhausted = true;
    }
    return 'OK';
  },

  async del(key) {
    delete localStore[key];
    persistLocalStore();

    if (!db || quotaExhausted) return 1;

    try {
      const docRef = doc(db, COLLECTION_NAME, encodeURIComponent(key));
      await deleteDoc(docRef);
    } catch (e) {
      if (isQuotaError(e)) quotaExhausted = true;
    }
    return 1;
  },

  async incr(key) {
    const current = Number(localStore[key] || 0) + 1;
    localStore[key] = current;
    persistLocalStore();

    if (!db || quotaExhausted) return current;

    try {
      const docRef = doc(db, COLLECTION_NAME, encodeURIComponent(key));
      await updateDoc(docRef, { value: increment(1) });
    } catch (e) {
      if (isQuotaError(e)) quotaExhausted = true;
    }
    return current;
  },

  async incrby(key, amount) {
    const add = Number(amount || 0);
    const current = Number(localStore[key] || 0) + add;
    localStore[key] = current;
    persistLocalStore();

    if (!db || quotaExhausted) return current;

    try {
      const docRef = doc(db, COLLECTION_NAME, encodeURIComponent(key));
      await updateDoc(docRef, { value: increment(add) });
    } catch (e) {
      if (isQuotaError(e)) quotaExhausted = true;
    }
    return current;
  },

  async mget(...keys) {
    const flatKeys = Array.isArray(keys[0]) ? keys[0] : keys;
    if (flatKeys.length === 0) return [];
    return Promise.all(flatKeys.map(k => this.get(k)));
  },

  async scan(cursor, options = {}) {
    const match = options?.match;
    let prefix = '';
    if (match && match.endsWith('*')) {
      prefix = match.slice(0, -1);
    }

    // Try Firestore first if available and not exhausted
    if (db && !quotaExhausted) {
      try {
        const colRef = collection(db, COLLECTION_NAME);
        const snap = await getDocs(colRef);
        const keys = [];
        snap.forEach(document => {
            const key = decodeURIComponent(document.id);
            if (!key.includes('_chunk_') && (!prefix || key.startsWith(prefix))) {
                keys.push(key);
            }
        });
        return ['0', keys];
      } catch (e) {
        if (isQuotaError(e)) quotaExhausted = true;
      }
    }

    // Fallback to local memory/file store scan
    const localKeys = Object.keys(localStore).filter(k => !k.includes('_chunk_') && (!prefix || k.startsWith(prefix)));
    return ['0', localKeys];
  }
};

export function createClient() {
  return kv;
}
export default { kv, createClient };
