import { FALLBACK_SKILLS } from './skillRegistry.js';

function contextToText(context = {}) {
  const values = [];
  const visit = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      values.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  };
  try {
    visit(context);
    return values.join('\n').toLowerCase();
  } catch {
    return values.join('\n').toLowerCase();
  }
}

function skillScore(skill, text) {
  const hits = [];
  for (const keyword of skill.keywords ?? []) {
    if (text.includes(String(keyword).toLowerCase())) {
      hits.push({ type: 'keyword', value: keyword });
    }
  }
  for (const pattern of skill.patterns ?? []) {
    try {
      if (new RegExp(pattern, 'i').test(text)) {
        hits.push({ type: 'pattern', value: pattern });
      }
    } catch {
      // Ignore malformed asset patterns.
    }
  }
  return hits;
}

function normalizeBackendType(type = '') {
  return String(type || '').trim().toLowerCase().replace(/[_\s-]+/g, '');
}

function backendMatches(skill, settings = {}, promptProfile = {}) {
  const applies = skill.appliesToBackend ?? skill.backendTypes;
  if (!Array.isArray(applies) || applies.length === 0) return true;
  const backend = normalizeBackendType(settings?.backend?.type || settings?.backendType || 'generic');
  const profileBackends = (promptProfile?.backendTypes ?? []).map(normalizeBackendType);
  const wanted = new Set([backend, ...profileBackends, normalizeBackendType(promptProfile?.id)]);
  return applies.some((type) => wanted.has(normalizeBackendType(type)));
}

function explicitSkillIds({ settings = {}, promptProfile = {} } = {}) {
  return new Set([
    'visual_extraction',
    'character_identity_lock',
    ...(promptProfile?.requiredSkills ?? []),
    ...(settings?.requiredSkills ?? []),
  ].filter(Boolean));
}

function scoreItem(skill, hits, { requiredIds, backendRequired }) {
  const priority = Number(skill.priority ?? 0);
  const hitScore = hits.reduce((score, hit) => score + (hit.type === 'pattern' ? 3 : 2), 0);
  const requiredScore = requiredIds.has(skill.id) ? 1000 : 0;
  const backendScore = backendRequired ? 500 : 0;
  return priority + hitScore + requiredScore + backendScore;
}

function reasonFor(skill, hits, { requiredIds, backendRequired }) {
  if (requiredIds.has(skill.id)) return 'required';
  if (backendRequired) return 'backend';
  if (hits.length) return 'context';
  if (skill.category === 'baseline') return 'baseline';
  return 'candidate';
}

export function selectSkills({ context = {}, settings = {}, skills = FALLBACK_SKILLS, promptProfile = {}, limit = 5 } = {}) {
  const text = contextToText({
    chat: context?.chat,
    text: context?.text,
    character: context?.character,
    worldbook: context?.worldbook,
    scenePlan: context?.scenePlan,
    userIntent: context?.userIntent,
  });
  const requiredIds = explicitSkillIds({ settings, promptProfile });
  const scored = skills
    .filter((skill) => skill && skill.id && backendMatches(skill, settings, promptProfile))
    .map((skill) => {
      const hits = skillScore(skill, text);
      const backendRequired = skill.category === 'backend' && backendMatches(skill, settings, promptProfile)
        && ((skill.appliesToBackend ?? skill.backendTypes)?.length || requiredIds.has(skill.id));
      const score = scoreItem(skill, hits, { requiredIds, backendRequired });
      return {
        skill,
        hits,
        score,
        category: skill.category ?? 'general',
        reason: reasonFor(skill, hits, { requiredIds, backendRequired }),
      };
    });

  const conflicts = new Set();
  const selectedItems = [];
  const categoryCounts = new Map();
  const sorted = scored
    .filter((item) => item.hits.length || item.score >= 500 || item.skill.category === 'baseline')
    .sort((a, b) => b.score - a.score || b.hits.length - a.hits.length || String(a.skill.id).localeCompare(String(b.skill.id)));

  for (const item of sorted) {
    if (conflicts.has(item.skill.id)) continue;
    const category = item.category;
    const categoryCount = categoryCounts.get(category) ?? 0;
    const maxForCategory = Number(item.skill.maxPerCategory ?? (category === 'baseline' ? 4 : category === 'backend' ? 1 : 1));
    const isRequired = requiredIds.has(item.skill.id) || item.reason === 'backend';
    if (!isRequired && categoryCount >= maxForCategory) continue;
    if (!isRequired && selectedItems.length >= limit) continue;
    selectedItems.push(item);
    categoryCounts.set(category, categoryCount + 1);
    for (const conflict of item.skill.conflicts ?? []) {
      conflicts.add(conflict);
    }
  }

  for (const id of requiredIds) {
    if (selectedItems.some((item) => item.skill.id === id)) continue;
    const item = scored.find((candidate) => candidate.skill.id === id);
    if (item) selectedItems.unshift({ ...item, reason: 'required', score: Math.max(item.score, 1000) });
  }

  const limited = selectedItems
    .filter((item, index, arr) => arr.findIndex((other) => other.skill.id === item.skill.id) === index)
    .sort((a, b) => b.score - a.score || String(a.skill.id).localeCompare(String(b.skill.id)))
    .slice(0, Math.max(limit, requiredIds.size));

  return {
    skills: limited.map((item) => item.skill),
    trace: limited.map((item) => ({
      id: item.skill.id,
      label: item.skill.label,
      reason: item.reason,
      score: item.score,
      category: item.category,
      hits: item.hits.length ? item.hits : [{ type: item.reason, value: item.reason }],
    })),
  };
}

export default selectSkills;
