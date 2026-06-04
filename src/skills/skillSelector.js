import { FALLBACK_SKILLS } from './skillRegistry.js';

function contextToText(context = {}) {
  try {
    return JSON.stringify(context).toLowerCase();
  } catch {
    return String(context ?? '').toLowerCase();
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

export function selectSkills({ context = {}, settings = {}, skills = FALLBACK_SKILLS, limit = 6 } = {}) {
  const text = contextToText({ context, mode: settings.mode, tagApi: { model: settings.tagApi?.model } });
  const scored = skills.map((skill) => ({ skill, hits: skillScore(skill, text) }));
  const selected = scored
    .filter((item) => item.hits.length)
    .sort((a, b) => b.hits.length - a.hits.length)
    .slice(0, limit)
    .map((item) => item.skill);

  for (const id of ['visual_extraction', 'character_identity_lock']) {
    const fallback = skills.find((skill) => skill.id === id);
    if (fallback && !selected.some((skill) => skill.id === id)) {
      selected.unshift(fallback);
    }
  }

  const limited = selected.slice(0, limit);
  return {
    skills: limited,
    trace: limited.map((skill) => ({
      id: skill.id,
      label: skill.label,
      hits: scored.find((item) => item.skill.id === skill.id)?.hits ?? [{ type: 'default', value: 'baseline' }],
    })),
  };
}

export default selectSkills;
