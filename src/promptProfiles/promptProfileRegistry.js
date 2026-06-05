export const FALLBACK_PROMPT_PROFILES = Object.freeze([
  {
    id: 'generic',
    label: 'Generic Tag Compiler',
    backendTypes: ['generic', 'unknown'],
    systemInstructions: [
      'Use concise visual tags grouped in the unified CompiledPrompt positiveBlocks.',
      'Prefer directly visible facts and avoid prose-only descriptions.',
    ],
    userGuidance: [
      'Use dictionary aliases, including Chinese aliases, to translate context into canonical English tags.',
      'Keep backend-specific syntax in backendSpecific/lora only when it is clearly needed.',
    ],
    preferredBlocks: ['quality', 'subject', 'identity', 'character', 'clothing', 'pose', 'environment', 'camera', 'lighting', 'style'],
    negativeGuidance: ['Use common quality/anatomy/artifact negatives only when relevant.'],
    tagOrdering: ['quality', 'subject', 'identity', 'character', 'face', 'hair', 'eyes', 'body', 'clothing', 'clothingState', 'pose', 'interaction', 'expression', 'environment', 'props', 'camera', 'lighting', 'style', 'backendSpecific', 'lora'],
    requiredSkills: ['visual_extraction', 'character_identity_lock'],
  },
  {
    id: 'sd',
    label: 'Stable Diffusion / SD WebUI',
    backendTypes: ['sd', 'sdwebui', 'stable-diffusion', 'stable diffusion', 'a1111', 'forge'],
    systemInstructions: [
      'Prefer comma-separated Danbooru-style English tags suitable for Stable Diffusion prompt fields.',
      'Separate positive tags from negative tags; do not emit generation parameters in the CompiledPrompt by default.',
    ],
    userGuidance: [
      'Put LoRA/model trigger phrases in lora or backendSpecific when explicitly supported by context.',
      'Use weighted tag syntax only when the context strongly emphasizes a detail.',
    ],
    preferredBlocks: ['quality', 'subject', 'identity', 'character', 'body', 'clothing', 'clothingState', 'pose', 'interaction', 'environment', 'camera', 'lighting', 'style', 'backendSpecific', 'lora'],
    negativeGuidance: ['Keep a compact SD negative prompt: low quality, anatomy, hands, blur, watermark/text artifacts.'],
    tagOrdering: ['quality', 'subject', 'identity', 'character', 'face', 'hair', 'eyes', 'body', 'clothing', 'clothingState', 'pose', 'interaction', 'expression', 'environment', 'props', 'camera', 'lighting', 'style', 'backendSpecific', 'lora'],
    requiredSkills: ['visual_extraction', 'character_identity_lock', 'backend_sd_pack'],
  },
  {
    id: 'novelai',
    label: 'NovelAI',
    backendTypes: ['novelai', 'nai', 'novel ai'],
    systemInstructions: [
      'Prefer compact anime-oriented tags and NovelAI-friendly quality/undesired-content wording.',
      'Keep character identity and visible clothing state close to the front of the relevant blocks.',
    ],
    userGuidance: [
      'Use UC/negative concepts through the unified negative array rather than custom schema fields.',
      'Avoid backend parameters; the adapter owns NovelAI request settings.',
    ],
    preferredBlocks: ['quality', 'subject', 'identity', 'character', 'hair', 'eyes', 'clothing', 'pose', 'interaction', 'expression', 'environment', 'camera', 'lighting', 'style', 'backendSpecific'],
    negativeGuidance: ['Prefer undesired-content concepts such as low quality, bad anatomy, artifacts, text, watermark, extra/missing fingers.'],
    tagOrdering: ['quality', 'subject', 'identity', 'character', 'hair', 'eyes', 'face', 'body', 'clothing', 'clothingState', 'pose', 'interaction', 'expression', 'environment', 'props', 'camera', 'lighting', 'style', 'backendSpecific', 'lora'],
    requiredSkills: ['visual_extraction', 'character_identity_lock', 'backend_novelai_pack'],
  },
  {
    id: 'comfyui',
    label: 'ComfyUI',
    backendTypes: ['comfyui', 'comfy'],
    systemInstructions: [
      'Produce the same unified CompiledPrompt tags; workflow node patching is handled by the ComfyUI adapter.',
      'Keep positive/negative content clean because the workflow may route them to separate nodes.',
    ],
    userGuidance: [
      'Use backendSpecific for workflow trigger tokens only when requested by context/settings.',
      'Do not include workflow JSON, node IDs, or generation parameters in the tagger output.',
    ],
    preferredBlocks: ['quality', 'subject', 'identity', 'character', 'clothing', 'pose', 'environment', 'camera', 'lighting', 'style', 'backendSpecific', 'lora'],
    negativeGuidance: ['Use workflow-safe concise negatives: low quality, blur, bad anatomy, artifact/text/watermark issues.'],
    tagOrdering: ['quality', 'subject', 'identity', 'character', 'face', 'hair', 'eyes', 'body', 'clothing', 'clothingState', 'pose', 'interaction', 'expression', 'environment', 'props', 'camera', 'lighting', 'style', 'backendSpecific', 'lora'],
    requiredSkills: ['visual_extraction', 'character_identity_lock', 'backend_sd_pack'],
  },
  {
    id: 'naturalImage',
    label: 'Natural Image Provider',
    backendTypes: ['naturalimage', 'natural-image', 'openaiimages', 'openai-images', 'chat-image'],
    systemInstructions: [
      'The adapter may turn tags into a natural-language image request, but the tagger must still return the unified CompiledPrompt schema.',
      'Prefer descriptive, photographic, and composition tags over backend syntax.',
    ],
    userGuidance: [
      'Use style/camera/lighting/environment blocks to preserve natural-language image quality.',
      'Avoid LoRA/model tokens unless the user explicitly provides them as visual prompt tokens.',
    ],
    preferredBlocks: ['subject', 'identity', 'character', 'clothing', 'pose', 'interaction', 'environment', 'props', 'camera', 'lighting', 'style'],
    negativeGuidance: ['Use only broad natural-image negatives when useful: blurry, low quality, text, watermark, deformed anatomy.'],
    tagOrdering: ['subject', 'identity', 'character', 'face', 'hair', 'eyes', 'body', 'clothing', 'clothingState', 'pose', 'interaction', 'expression', 'environment', 'props', 'camera', 'lighting', 'style', 'quality', 'backendSpecific', 'lora'],
    requiredSkills: ['visual_extraction', 'character_identity_lock'],
  },
]);

const PROFILE_IDS = ['generic', 'sd', 'novelai', 'comfyui', 'naturalImage'];
const PROFILE_URLS = PROFILE_IDS.map((id) => new URL(`../../assets/compiled/prompt-profiles/${id}.json`, import.meta.url));

let cachedProfiles = null;

export function normalizeBackendType(type = '') {
  return String(type || 'generic').trim().toLowerCase().replace(/[_\s]+/g, '-');
}

function normalizeProfile(profile = {}) {
  const fallback = FALLBACK_PROMPT_PROFILES.find((item) => item.id === profile.id) ?? FALLBACK_PROMPT_PROFILES[0];
  return {
    ...fallback,
    ...profile,
    backendTypes: Array.isArray(profile.backendTypes) ? profile.backendTypes : fallback.backendTypes,
    systemInstructions: Array.isArray(profile.systemInstructions) ? profile.systemInstructions : fallback.systemInstructions,
    userGuidance: Array.isArray(profile.userGuidance) ? profile.userGuidance : fallback.userGuidance,
    preferredBlocks: Array.isArray(profile.preferredBlocks) ? profile.preferredBlocks : fallback.preferredBlocks,
    negativeGuidance: Array.isArray(profile.negativeGuidance) ? profile.negativeGuidance : fallback.negativeGuidance,
    tagOrdering: Array.isArray(profile.tagOrdering) ? profile.tagOrdering : fallback.tagOrdering,
    requiredSkills: Array.isArray(profile.requiredSkills) ? profile.requiredSkills : (fallback.requiredSkills ?? []),
  };
}

export async function loadPromptProfiles() {
  if (cachedProfiles) return cachedProfiles;

  if (typeof fetch === 'function') {
    try {
      const loaded = await Promise.all(PROFILE_URLS.map(async (url) => {
        const response = await fetch(url);
        return response.ok ? response.json() : null;
      }));
      const profiles = loaded.filter(Boolean).map(normalizeProfile);
      if (profiles.length) {
        cachedProfiles = profiles;
        return cachedProfiles;
      }
    } catch {
      // Extension hosts and Node test runs may not expose compiled assets through fetch.
    }
  }

  cachedProfiles = FALLBACK_PROMPT_PROFILES.map(normalizeProfile);
  return cachedProfiles;
}

export function selectPromptProfile(profiles = FALLBACK_PROMPT_PROFILES, settings = {}) {
  const explicitId = settings?.compilerProfileId || settings?.promptProfileId || settings?.promptProfile?.id;
  if (explicitId) {
    const explicit = profiles.find((profile) => profile.id === explicitId);
    if (explicit) return explicit;
  }

  const backendType = normalizeBackendType(settings?.backend?.type || settings?.backendType || 'generic');
  const aliases = new Set([
    backendType,
    backendType.replace(/-/g, ''),
    backendType === 'sdwebui' ? 'sd' : '',
    backendType === 'sd-webui' ? 'sd' : '',
    backendType === 'naturalimage' ? 'natural-image' : '',
  ].filter(Boolean));

  return profiles.find((profile) => (profile.backendTypes ?? [])
    .some((type) => aliases.has(normalizeBackendType(type)) || aliases.has(normalizeBackendType(type).replace(/-/g, ''))))
    ?? profiles.find((profile) => profile.id === 'generic')
    ?? profiles[0]
    ?? FALLBACK_PROMPT_PROFILES[0];
}

export async function selectPromptProfileForSettings(settings = {}) {
  return selectPromptProfile(await loadPromptProfiles(), settings);
}

export default { loadPromptProfiles, selectPromptProfile, selectPromptProfileForSettings };
