// In-memory mock for @vercel/kv in AI Studio
const store = new Map();

export const kv = {
  async get(key) {
    if (!store.has(key)) return null;
    const item = store.get(key);
    // Return a clone to prevent external mutation
    return typeof item === 'object' && item !== null ? JSON.parse(JSON.stringify(item)) : item;
  },

  async set(key, value, options) {
    store.set(key, typeof value === 'object' && value !== null ? JSON.parse(JSON.stringify(value)) : value);
    return 'OK';
  },

  async del(key) {
    return store.delete(key) ? 1 : 0;
  },

  async incr(key) {
    const current = Number(store.get(key) || 0) + 1;
    store.set(key, current);
    return current;
  },

  async incrby(key, amount) {
    const current = Number(store.get(key) || 0) + Number(amount);
    store.set(key, current);
    return current;
  },

  async mget(...keys) {
    // Handle array or spread arguments
    const flatKeys = Array.isArray(keys[0]) ? keys[0] : keys;
    return flatKeys.map((k) => {
      if (!store.has(k)) return null;
      const item = store.get(k);
      return typeof item === 'object' && item !== null ? JSON.parse(JSON.stringify(item)) : item;
    });
  },

  async scan(cursor, options = {}) {
    const match = options?.match;
    let prefix = '';
    if (match && match.endsWith('*')) {
      prefix = match.slice(0, -1);
    }
    const allKeys = Array.from(store.keys()).filter((k) => !prefix || k.startsWith(prefix));
    return ['0', allKeys];
  },
};

export function createClient() {
  return kv;
}

export default { kv, createClient };
