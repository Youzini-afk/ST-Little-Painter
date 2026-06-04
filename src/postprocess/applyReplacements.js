function toReplacementList(replacements = []) {
  if (Array.isArray(replacements)) {
    return replacements;
  }
  if (replacements && typeof replacements === 'object') {
    return Object.entries(replacements).map(([from, to]) => ({ from, to }));
  }
  return [];
}

export function applyReplacements(tags = [], { replacements = [], blocklist = [], allowlist = [] } = {}) {
  const rules = toReplacementList(replacements);
  const blocked = new Set(blocklist.map((tag) => String(tag).toLowerCase()));
  const allowed = new Set(allowlist.map((tag) => String(tag).toLowerCase()));
  const trace = [];

  const next = [];
  for (const tag of tags) {
    let current = tag;
    const rule = rules.find((item) => String(item.from ?? '').toLowerCase() === current.toLowerCase());
    if (rule) {
      current = String(rule.to ?? '').trim();
      trace.push({ from: tag, to: current, reason: 'replacement' });
    }
    if (!current) {
      trace.push({ removed: tag, reason: 'empty replacement' });
      continue;
    }
    if (blocked.has(current.toLowerCase()) && !allowed.has(current.toLowerCase())) {
      trace.push({ removed: current, reason: 'blocklist' });
      continue;
    }
    next.push(current);
  }

  return { tags: next, trace };
}

export default applyReplacements;
