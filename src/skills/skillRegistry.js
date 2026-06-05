export const FALLBACK_SKILLS = Object.freeze([
  {
    id: 'visual_extraction',
    label: 'Visual Extraction',
    category: 'baseline',
    priority: 100,
    maxPerCategory: 4,
    keywords: ['look', 'appear', 'wear', 'hair', 'eyes', 'body', 'visual', '外观', '穿', '头发', '眼睛'],
    patterns: ['\\b(looks?|wear(?:ing)?|hair|eyes?)\\b'],
    instructions: ['Extract only visible character and scene facts.', 'Prefer concrete drawing tags over prose.'],
    outputBlocks: ['subject', 'identity', 'character', 'face', 'hair', 'eyes', 'body', 'clothing', 'environment'],
    examples: [{ context: 'white hair and blue eyes', tags: ['white hair', 'blue eyes'] }],
  },
  {
    id: 'character_identity_lock',
    label: 'Character Identity Lock',
    category: 'baseline',
    priority: 95,
    maxPerCategory: 4,
    keywords: ['character', 'name', 'identity', 'consistent', 'same person', '角色', '身份', '姓名'],
    patterns: ['\\b(name|identity|same character|consistent)\\b'],
    instructions: ['Preserve stable identity traits from context.'],
    outputBlocks: ['identity', 'character', 'hair', 'eyes', 'clothing'],
    examples: [{ context: 'same heroine in a new scene', tags: ['consistent character'] }],
  },
  {
    id: 'pose_resolver',
    label: 'Pose Resolver',
    category: 'pose',
    priority: 50,
    keywords: ['stand', 'sit', 'kneel', 'lie', 'pose', 'gesture', '站', '坐', '跪', '躺', '姿势'],
    patterns: ['\\b(standing|sitting|kneeling|lying|pose|gesture)\\b'],
    instructions: ['Resolve the dominant pose and important limb gestures.'],
    outputBlocks: ['pose'],
    examples: [{ context: 'she kneels beside the bed', tags: ['kneeling', 'bed'] }],
  },
  {
    id: 'concept_expander',
    label: 'Concept Expander',
    category: 'style',
    priority: 20,
    keywords: ['theme', 'mood', 'concept', 'fantasy', 'cyberpunk', '氛围', '主题', '概念'],
    patterns: ['\\b(theme|mood|concept|fantasy|cyberpunk)\\b'],
    instructions: ['Expand abstract concepts into a few visual tags.'],
    outputBlocks: ['environment', 'lighting', 'style'],
  },
  {
    id: 'film_camera',
    label: 'Film Camera',
    category: 'camera',
    priority: 40,
    keywords: ['camera', 'shot', 'lens', 'angle', 'close-up', 'wide', '镜头', '构图', '角度'],
    patterns: ['\\b(camera|shot|lens|angle|close-up|wide shot|portrait)\\b'],
    instructions: ['Add camera distance, angle, and composition tags when supported.'],
    outputBlocks: ['camera'],
    examples: [{ context: 'close portrait from above', tags: ['close-up', 'from above'] }],
  },
  {
    id: 'lighting_designer',
    label: 'Lighting Designer',
    category: 'lighting',
    priority: 40,
    keywords: ['light', 'lighting', 'shadow', 'sunset', 'neon', '灯光', '光影', '阴影'],
    patterns: ['\\b(light(?:ing)?|shadow|sunset|neon|backlit)\\b'],
    instructions: ['Choose lighting tags that match the scene mood and time.'],
    outputBlocks: ['lighting'],
    examples: [{ context: 'rainy neon night', tags: ['neon lighting', 'night'] }],
  },
  {
    id: 'interaction_resolver',
    label: 'Interaction Resolver',
    category: 'interaction',
    priority: 55,
    keywords: ['hug', 'kiss', 'hold', 'touch', 'together', 'straddle', 'pin', '抱', '吻', '牵手', '互动'],
    patterns: ['\\b(hug(?:ging)?|kiss(?:ing)?|holding hands|touch(?:ing)?|straddl(?:e|ing)|pinn(?:ed|ing))\\b'],
    instructions: ['Represent character interactions as ordinary prompt tags.'],
    outputBlocks: ['interaction', 'pose'],
    examples: [{ context: 'two characters embrace', tags: ['hugging'] }],
  },
  {
    id: 'backend_sd_pack',
    label: 'Stable Diffusion Pack',
    category: 'backend',
    priority: 90,
    appliesToBackend: ['sd', 'sdWebui', 'comfyui'],
    keywords: ['stable diffusion', 'sd', 'lora', 'negative', 'prompt', '采样', '模型'],
    patterns: ['\\b(stable diffusion|\\bsd\\b|lora|negative prompt)\\b'],
    instructions: ['Prefer comma-separated danbooru-style tags for Stable Diffusion backends.'],
    outputBlocks: ['backendSpecific', 'lora'],
    examples: [{ context: 'SD prompt with LoRA trigger', tags: ['<lora:name:0.8>'] }],
  },
  {
    id: 'backend_novelai_pack',
    label: 'NovelAI Pack',
    category: 'backend',
    priority: 90,
    appliesToBackend: ['novelai'],
    keywords: ['novelai', 'nai', 'quality tags', 'undesired'],
    patterns: ['\\b(novelai|\\bnai\\b|undesired content)\\b'],
    instructions: ['Prefer concise anime-oriented tags for NovelAI style backends.'],
    outputBlocks: ['quality', 'backendSpecific'],
    examples: [{ context: 'NovelAI anime image', tags: ['best quality', 'anime style'] }],
  },
  {
    id: 'expression_gaze_resolver',
    label: 'Expression & Gaze Resolver',
    category: 'expression',
    priority: 58,
    keywords: ['smile', 'cry', 'blush', 'tears', 'look', 'gaze', 'expression', '微笑', '哭', '脸红', '视线', '表情', '看着'],
    patterns: ['\\b(smile|cry(?:ing)?|blush(?:ing)?|tears?|gaze|looking (?:at|away))\\b'],
    instructions: ['Translate emotional prose only into visible facial cues: gaze, mouth, blush, tears, eyelids.', 'Do not output internal emotions unless they have visible evidence.'],
    outputBlocks: ['expression', 'eyes', 'face'],
  },
  {
    id: 'clothing_state_resolver',
    label: 'Clothing State Resolver',
    category: 'clothing',
    priority: 56,
    keywords: ['clothes', 'dress', 'shirt', 'wet', 'open', 'torn', 'bare shoulders', '衣服', '裙子', '衬衫', '湿衣', '露肩', '凌乱'],
    patterns: ['\\b(wet clothes|open clothes|torn clothes|bare shoulders|shirt|dress|kimono|uniform)\\b'],
    instructions: ['Separate clothing items from temporary clothing states.', 'Prefer visible state tags such as wet clothes, open clothes, bare shoulders only when currently visible.'],
    outputBlocks: ['clothing', 'clothingState'],
  },
  {
    id: 'scene_composition_director',
    label: 'Scene Composition Director',
    category: 'camera',
    priority: 54,
    keywords: ['composition', 'close-up', 'upper body', 'full body', 'angle', 'lens', '构图', '特写', '上半身', '全身', '俯视', '仰视'],
    patterns: ['\\b(close-up|upper body|full body|cowboy shot|from above|from below|wide shot)\\b'],
    instructions: ['Choose camera distance and subject framing from current visible scene.', 'Avoid conflicting framing unless multiple shots are explicitly requested.'],
    outputBlocks: ['camera', 'composition'],
  },
  {
    id: 'body_visibility_resolver',
    label: 'Body Visibility Resolver',
    category: 'body',
    priority: 60,
    keywords: ['nude', 'explicit', 'exposed', 'breasts', 'thighs', 'underwear', '裸', '裸体', '乳', '胸', '大腿', '内衣', '露出'],
    patterns: ['\\b(nude|explicit|exposed|breasts?|thighs?|underwear)\\b'],
    instructions: ['Describe visible body exposure and body-state facts accurately when they are present.', 'Do not suppress explicit visible facts; do not invent unseen exposure from mood or past events.'],
    outputBlocks: ['body', 'clothingState', 'negative'],
  },
  {
    id: 'negative_guardrail',
    label: 'Negative Prompt Guardrail',
    category: 'negative',
    priority: 52,
    keywords: ['negative', 'bad hands', 'low quality', 'watermark', 'text', '负面', '坏手', '水印', '文字'],
    patterns: ['\\b(negative prompt|bad hands|bad anatomy|watermark|low quality|extra fingers)\\b'],
    instructions: ['Keep negative tags compact and generation-focused.', 'Do not move visible desired facts into negative tags.'],
    outputBlocks: ['negative'],
  },
]);

const SKILL_FILES = [
  'visual_extraction',
  'character_identity_lock',
  'pose_resolver',
  'concept_expander',
  'film_camera',
  'lighting_designer',
  'interaction_resolver',
  'backend_sd_pack',
  'backend_novelai_pack',
  'expression_gaze_resolver',
  'clothing_state_resolver',
  'scene_composition_director',
  'body_visibility_resolver',
  'negative_guardrail',
];

const REFERENCE_SKILL_FILES = [
  'reference_tag_extraction',
  'reference_character_dna',
  'reference_prompt_profile',
];

let cachedSkills = null;

function enrichSkill(skill = {}) {
  const fallback = FALLBACK_SKILLS.find((item) => item.id === skill.id) ?? {};
  return {
    ...fallback,
    ...skill,
    category: skill.category ?? fallback.category ?? 'general',
    priority: Number(skill.priority ?? fallback.priority ?? 0),
    keywords: Array.isArray(skill.keywords) ? skill.keywords : (fallback.keywords ?? []),
    patterns: Array.isArray(skill.patterns) ? skill.patterns : (fallback.patterns ?? []),
    instructions: Array.isArray(skill.instructions) ? skill.instructions : (fallback.instructions ?? []),
    appliesToBackend: Array.isArray(skill.appliesToBackend) ? skill.appliesToBackend : fallback.appliesToBackend,
    conflicts: Array.isArray(skill.conflicts) ? skill.conflicts : (fallback.conflicts ?? []),
    outputBlocks: Array.isArray(skill.outputBlocks) ? skill.outputBlocks : (fallback.outputBlocks ?? []),
    examples: Array.isArray(skill.examples) ? skill.examples : (fallback.examples ?? []),
  };
}

function mergeSkills(...skillGroups) {
  const byId = new Map();
  for (const group of skillGroups) {
    for (const skill of group ?? []) {
      if (!skill?.id) continue;
      byId.set(skill.id, enrichSkill({ ...(byId.get(skill.id) ?? {}), ...skill }));
    }
  }
  return [...byId.values()];
}

export async function loadSkillRegistry() {
  if (cachedSkills) {
    return cachedSkills;
  }
  if (typeof fetch === 'function') {
    try {
      const builtin = SKILL_FILES.map((id) => new URL(`../../assets/compiled/skills/${id}.skill.json`, import.meta.url));
      const reference = REFERENCE_SKILL_FILES.map((id) => new URL(`../../assets/compiled/skills/reference/${id}.skill.json`, import.meta.url));
      const loaded = await Promise.all([...builtin, ...reference].map(async (url) => {
        const response = await fetch(url);
        return response.ok ? response.json() : null;
      }));
      cachedSkills = mergeSkills(FALLBACK_SKILLS, loaded.filter(Boolean));
      if (cachedSkills.length) {
        return cachedSkills;
      }
    } catch {
      // Use static fallback.
    }
  }
  cachedSkills = FALLBACK_SKILLS.map(enrichSkill);
  return cachedSkills;
}

export function getFallbackSkills() {
  return FALLBACK_SKILLS.map(enrichSkill);
}

export default { loadSkillRegistry, getFallbackSkills };
