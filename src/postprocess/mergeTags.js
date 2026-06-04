export function flattenTags(value) {
  if (!value) {
    return [];
  }
  if (typeof value === 'string') {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenTags(item));
  }
  if (typeof value === 'object') {
    return Object.values(value).flatMap((item) => flattenTags(item));
  }
  return [];
}

export function mergeTags(...groups) {
  return groups.flatMap((group) => flattenTags(group));
}

export default mergeTags;
