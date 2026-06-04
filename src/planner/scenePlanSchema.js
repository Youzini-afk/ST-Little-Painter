const DEFAULT_SCENE_PLAN = Object.freeze({
  summary: '',
  subjects: [],
  setting: '',
  actions: [],
  composition: [],
  camera: [],
  lighting: [],
  mood: [],
  style: [],
  constraints: [],
  negative: [],
  tags: [],
  warnings: [],
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function asStringArray(value) {
  const source = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  return source
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (item && typeof item === 'object') {
        return JSON.stringify(item);
      }
      return String(item ?? '').trim();
    })
    .filter(Boolean);
}

function normalizeSubjects(value) {
  const source = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  return source
    .map((subject) => {
      if (typeof subject === 'string') {
        return { name: subject.trim(), description: '', traits: [] };
      }

      if (!subject || typeof subject !== 'object') {
        return null;
      }

      return {
        name: asString(subject.name ?? subject.key ?? subject.id ?? subject.label),
        description: asString(subject.description ?? subject.content ?? subject.comment),
        traits: asStringArray(subject.traits ?? subject.tags ?? subject.attributes),
      };
    })
    .filter((subject) => subject && (subject.name || subject.description || subject.traits.length));
}

export function createEmptyScenePlan() {
  return clone(DEFAULT_SCENE_PLAN);
}

export function normalizeScenePlan(plan = {}) {
  const source = plan && typeof plan === 'object' ? plan : {};
  return {
    summary: asString(source.summary ?? source.scene ?? source.description),
    subjects: normalizeSubjects(source.subjects ?? source.characters),
    setting: asString(source.setting ?? source.environment ?? source.location),
    actions: asStringArray(source.actions ?? source.interactions ?? source.pose),
    composition: asStringArray(source.composition),
    camera: asStringArray(source.camera),
    lighting: asStringArray(source.lighting),
    mood: asStringArray(source.mood ?? source.atmosphere),
    style: asStringArray(source.style ?? source.styles),
    constraints: asStringArray(source.constraints ?? source.mustKeep),
    negative: asStringArray(source.negative ?? source.avoid),
    tags: asStringArray(source.tags ?? source.promptTags),
    warnings: asStringArray(source.warnings),
  };
}

export default normalizeScenePlan;
