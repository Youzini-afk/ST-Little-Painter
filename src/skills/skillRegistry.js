export const FALLBACK_SKILLS = Object.freeze([
  {
    id: 'visual_extraction',
    label: 'Visual Extraction',
    keywords: ['look', 'appear', 'wear', 'hair', 'eyes', 'body', 'visual', '外观', '穿', '头发', '眼睛'],
    patterns: ['\\b(looks?|wear(?:ing)?|hair|eyes?)\\b'],
    instructions: ['Extract only visible character and scene facts.', 'Prefer concrete drawing tags over prose.'],
  },
  {
    id: 'character_identity_lock',
    label: 'Character Identity Lock',
    keywords: ['character', 'name', 'identity', 'consistent', 'same person', '角色', '身份', '姓名'],
    patterns: ['\\b(name|identity|same character|consistent)\\b'],
    instructions: ['Preserve stable identity traits from context.'],
  },
  {
    id: 'pose_resolver',
    label: 'Pose Resolver',
    keywords: ['stand', 'sit', 'kneel', 'lie', 'pose', 'gesture', '站', '坐', '跪', '躺', '姿势'],
    patterns: ['\\b(standing|sitting|kneeling|lying|pose|gesture)\\b'],
    instructions: ['Resolve the dominant pose and important limb gestures.'],
  },
  {
    id: 'concept_expander',
    label: 'Concept Expander',
    keywords: ['theme', 'mood', 'concept', 'fantasy', 'cyberpunk', '氛围', '主题', '概念'],
    patterns: ['\\b(theme|mood|concept|fantasy|cyberpunk)\\b'],
    instructions: ['Expand abstract concepts into a few visual tags.'],
  },
  {
    id: 'film_camera',
    label: 'Film Camera',
    keywords: ['camera', 'shot', 'lens', 'angle', 'close-up', 'wide', '镜头', '构图', '角度'],
    patterns: ['\\b(camera|shot|lens|angle|close-up|wide shot|portrait)\\b'],
    instructions: ['Add camera distance, angle, and composition tags when supported.'],
  },
  {
    id: 'lighting_designer',
    label: 'Lighting Designer',
    keywords: ['light', 'lighting', 'shadow', 'sunset', 'neon', '灯光', '光影', '阴影'],
    patterns: ['\\b(light(?:ing)?|shadow|sunset|neon|backlit)\\b'],
    instructions: ['Choose lighting tags that match the scene mood and time.'],
  },
  {
    id: 'interaction_resolver',
    label: 'Interaction Resolver',
    keywords: ['hug', 'kiss', 'hold', 'touch', 'together', 'straddle', 'pin', '抱', '吻', '牵手', '互动'],
    patterns: ['\\b(hug(?:ging)?|kiss(?:ing)?|holding hands|touch(?:ing)?|straddl(?:e|ing)|pinn(?:ed|ing))\\b'],
    instructions: ['Represent character interactions as ordinary prompt tags.'],
  },
  {
    id: 'backend_sd_pack',
    label: 'Stable Diffusion Pack',
    keywords: ['stable diffusion', 'sd', 'lora', 'negative', 'prompt', '采样', '模型'],
    patterns: ['\\b(stable diffusion|\\bsd\\b|lora|negative prompt)\\b'],
    instructions: ['Prefer comma-separated danbooru-style tags for Stable Diffusion backends.'],
  },
  {
    id: 'backend_novelai_pack',
    label: 'NovelAI Pack',
    keywords: ['novelai', 'nai', 'quality tags', 'undesired'],
    patterns: ['\\b(novelai|\\bnai\\b|undesired content)\\b'],
    instructions: ['Prefer concise anime-oriented tags for NovelAI style backends.'],
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
];

let cachedSkills = null;

export async function loadSkillRegistry() {
  if (cachedSkills) {
    return cachedSkills;
  }
  if (typeof fetch === 'function') {
    try {
      const loaded = await Promise.all(SKILL_FILES.map(async (id) => {
        const response = await fetch(new URL(`../../assets/compiled/skills/${id}.skill.json`, import.meta.url));
        return response.ok ? response.json() : null;
      }));
      cachedSkills = loaded.filter(Boolean);
      if (cachedSkills.length) {
        return cachedSkills;
      }
    } catch {
      // Use static fallback.
    }
  }
  cachedSkills = [...FALLBACK_SKILLS];
  return cachedSkills;
}

export function getFallbackSkills() {
  return [...FALLBACK_SKILLS];
}

export default { loadSkillRegistry, getFallbackSkills };
