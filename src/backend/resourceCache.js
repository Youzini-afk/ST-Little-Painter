const cache = new Map();

function makeKey(parts = []) {
  return parts.map((part) => String(part ?? '')).join('::');
}

export function getResourceCache(parts = []) {
  return cache.get(makeKey(parts));
}

export function setResourceCache(parts = [], value) {
  const key = makeKey(parts);
  cache.set(key, value);
  return value;
}

export function clearResourceCache(parts = []) {
  if (!parts.length) {
    cache.clear();
    return;
  }
  cache.delete(makeKey(parts));
}

export default { clearResourceCache, getResourceCache, setResourceCache };
