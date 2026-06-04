export const CORE_ZH_ALIASES = Object.freeze({
  半身: 'upper body',
  全身: 'full body',
  特写: 'close-up',
  逆光: 'backlighting',
  卧室: 'bedroom',
  教室: 'school classroom',
  雨夜: 'rainy night',
  坐: 'sitting',
  站: 'standing',
  跪: 'kneeling',
  躺: 'lying down',
  拥抱: 'hugging',
  接吻: 'kissing',
  牵手: 'holding hands',
  银发: 'silver hair',
  白发: 'white hair',
  红眼: 'red eyes',
  蓝眼: 'blue eyes',
  白裙: 'white dress',
  和服: 'kimono',
  女仆装: 'maid outfit',
  校服: 'school uniform',
  透视: 'see-through clothes',
  湿衣: 'wet clothes',
  开衫: 'cardigan',
  柔光: 'soft lighting',
  霓虹: 'neon lighting',
  景深: 'depth of field',
  回头: 'looking back',
  背影: 'from behind',
  遮眼: 'blindfold',
  室内: 'indoors',
  室外: 'outdoors',
  森林: 'forest',
  街道: 'street',
  床: 'bed',
  窗户: 'window',
  长发: 'long hair',
  短发: 'short hair',
  黑发: 'black hair',
  金发: 'blonde hair',
  红裙: 'red dress',
  黑裙: 'black dress',
  连衣裙: 'dress',
  水手服: 'serafuku',
  低角度: 'low angle',
  高角度: 'high angle',
  正面: 'front view',
  侧面: 'side view',
  俯视: 'from above',
  仰视: 'from below',
  夜晚: 'night',
  雨: 'rain',
  月光: 'moonlight',
  沙发: 'sofa',
  客厅: 'living room',
});

const TAG_CATEGORY_HINTS = [
  ['quality', /\b(masterpiece|quality|detailed|sharp focus|clean lineart)\b/i],
  ['camera', /\b(close-up|wide shot|low angle|high angle|from above|from below|depth of field|bokeh|pov|portrait|shot|focus|angle|view)\b/i],
  ['lighting', /\b(light|lighting|backlighting|rim lighting|neon|shadow|moonlight|sunlight|golden hour)\b/i],
  ['pose', /\b(standing|sitting|kneeling|lying|looking|squatting|spread legs|arms crossed|hands on hips)\b/i],
  ['interaction', /\b(hugging|kissing|holding hands|embrace|kiss|touching|face to face)\b/i],
  ['environment', /\b(bedroom|classroom|street|forest|indoors|outdoors|bed|window|alley|room|school|rainy night|night|city)\b/i],
  ['clothing', /\b(dress|kimono|maid outfit|school uniform|shirt|skirt|cardigan|serafuku|jacket|thighhighs|shoes)\b/i],
  ['clothingState', /\b(wet clothes|open clothes|see-through|torn clothes|strap slip|undressed)\b/i],
  ['hair', /\b(hair|bangs|braid|ponytail|sidetail)\b/i],
  ['eyes', /\b(eyes|pupils)\b/i],
  ['negative', /\b(low quality|bad anatomy|extra fingers|missing fingers|watermark|text|blurry|artifact|worst quality)\b/i],
];

const SHORT_TAG_ALLOWLIST = new Set(['sd', 'nai', 'pov', '1girl', '1boy', '2girls', '2boys', '3girls', '3boys', '4girls', '4boys']);
const REFERENCE_STOP_TAGS = new Set([
  'a', 'an', 'the', 'in', 'on', 'up', 'to', 'of', 'or', 'and', 'd', 'j', 'tag', 'tags', 'prompt', 'image', 'scene', 'composition',
  'character', 'background', 'elements', 'current', 'example', 'examples', 'must', 'should', 'would', 'could', 'with', 'this', 'that',
  'man', 'woman', 'boy', 'girl', 'sex', 'cum', 'hat', 'tan', 'line', 'lines', 'rule', 'rules', 'format', 'template',
]);

const DEFAULT_TAG_ORDERING = ['quality', 'subject', 'identity', 'character', 'face', 'hair', 'eyes', 'body', 'clothing', 'clothingState', 'pose', 'interaction', 'expression', 'environment', 'props', 'camera', 'lighting', 'style', 'backendSpecific', 'lora'];

function textOfEntry(entry = {}) {
  return [entry.title, entry.key, entry.comment, entry.content].filter(Boolean).join('\n');
}

function cleanWeightedTag(fragment) {
  return String(fragment ?? '')
    .replace(/\d+(?:\.\d+)?::([^:]+)::/g, '$1')
    .replace(/[()\[\]{}<>#*`"“”'；;|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function extractEnglishTagsFromText(text = '') {
  const tags = new Set();
  for (const raw of String(text ?? '').split(/[,，\n]/)) {
    const tag = cleanWeightedTag(raw);
    if (!tag) continue;
    if (tag.length > 48) continue;
    if (/https?:|www\.|<\/?|{{|}}|\$\{|[:=]/i.test(raw)) continue;
    if (!/^[a-z][a-z0-9' -]*$/i.test(tag)) continue;
    const words = tag.split(/[\s-]+/).filter(Boolean);
    if (words.length < 1 || words.length > 5) continue;
    if (tag.length < 3 && !SHORT_TAG_ALLOWLIST.has(tag)) continue;
    if (REFERENCE_STOP_TAGS.has(tag)) continue;
    if (/^(a|an|the)\s+/i.test(tag)) continue;
    if (words.some((word) => word.length > 18)) continue;
    if (/\b(the|and|or|with|this|that|must|should|would|could|because|current|example|prompt|character prompt|scene composition|straddles|stands|sits|walks|looks|wears)\b/i.test(tag)) continue;
    tags.add(tag);
  }
  return [...tags].sort();
}

function categorizeTag(tag) {
  return TAG_CATEGORY_HINTS.find(([, pattern]) => pattern.test(tag))?.[0] ?? 'unknown';
}

function buildDictionaryEntries(tags, aliases = CORE_ZH_ALIASES) {
  const zhByTag = new Map();
  for (const [zh, tag] of Object.entries(aliases)) {
    const key = tag.toLowerCase();
    zhByTag.set(key, [...(zhByTag.get(key) ?? []), zh]);
  }
  const allTags = new Set([...tags, ...Object.values(aliases).map((tag) => tag.toLowerCase())]);
  return [...allTags].sort()
    .map((tag) => ({
      tag,
      category: categorizeTag(tag),
      aliases: [],
      zhAliases: zhByTag.get(tag) ?? [],
      keywords: zhByTag.get(tag) ?? [],
      weight: zhByTag.has(tag) ? 5 : 1,
      source: 'reference-curated',
    }))
    .filter((entry) => entry.category !== 'unknown' || entry.zhAliases.length || entry.keywords.length)
    .slice(0, 2500);
}

function detectProfiles(entries = []) {
  const text = entries.map(textOfEntry).join('\n').toLowerCase();
  const profiles = new Set(['generic', 'sd', 'novelai', 'comfyui', 'naturalImage']);
  if (/\b(sd|stable diffusion|danbooru|lora|webui|forge)\b|【sd】/i.test(text)) profiles.add('sd');
  if (/\b(novelai|nai|undesired|uc)\b|【nai】/i.test(text)) profiles.add('novelai');
  if (/\bcomfyui|workflow|node\b/i.test(text)) profiles.add('comfyui');
  if (/\bnatural image|photorealistic|openai images|gpt-image\b/i.test(text)) profiles.add('naturalImage');
  return [...profiles];
}

function makeProfile(id) {
  const labels = {
    generic: 'Reference Generic Profile',
    sd: 'Reference SD Profile',
    novelai: 'Reference NovelAI Profile',
    comfyui: 'Reference ComfyUI Profile',
    naturalImage: 'Reference Natural Image Profile',
  };
  const backendTypes = {
    generic: ['generic'],
    sd: ['sd', 'sdWebui'],
    novelai: ['novelai', 'nai'],
    comfyui: ['comfyui'],
    naturalImage: ['naturalImage'],
  };
  return {
    id,
    label: labels[id] ?? labels.generic,
    backendTypes: backendTypes[id] ?? backendTypes.generic,
    systemInstructions: ['Use curated reference knowledge as quality guidance only.', 'Return the unified CompiledPrompt schema without backend parameters.'],
    userGuidance: ['Translate Chinese aliases to canonical English tags.', 'Keep visible character DNA before transient pose/expression details.'],
    preferredBlocks: id === 'naturalImage'
      ? ['subject', 'identity', 'character', 'environment', 'camera', 'lighting', 'style']
      : ['quality', 'subject', 'identity', 'character', 'clothing', 'pose', 'interaction', 'environment', 'camera', 'lighting', 'style', 'backendSpecific'],
    negativeGuidance: ['Use low quality, blurry, bad anatomy, extra fingers, missing fingers, watermark, and text as compact negatives when needed.'],
    tagOrdering: DEFAULT_TAG_ORDERING,
    requiredSkills: id === 'novelai' ? ['visual_extraction', 'character_identity_lock', 'backend_novelai_pack']
      : id === 'sd' || id === 'comfyui' ? ['visual_extraction', 'character_identity_lock', 'backend_sd_pack']
        : ['visual_extraction', 'character_identity_lock'],
  };
}

function makeSkills(tags = [], profiles = []) {
  const tagKeywords = tags.slice(0, 30);
  return [
    {
      id: 'reference_tag_extraction',
      label: 'Reference Tag Extraction',
      category: 'reference',
      priority: 45,
      keywords: ['tag', 'prompt', '提示词', '标签', ...tagKeywords.slice(0, 12)],
      patterns: ['\\b(tag|prompt|danbooru|quality|lighting|camera)\\b'],
      instructions: ['Use curated reference tags as canonical English vocabulary.', 'Prefer short comma-style tags over long prose.'],
      outputBlocks: ['quality', 'character', 'pose', 'environment', 'camera', 'lighting', 'style'],
      examples: [{ input: '半身特写, 逆光', output: ['upper body', 'close-up', 'backlighting'] }],
    },
    {
      id: 'reference_character_dna',
      label: 'Reference Character DNA',
      category: 'identity',
      priority: 60,
      keywords: ['dna', 'identity', '角色', '外貌', '服饰', 'hair', 'eyes'],
      patterns: ['\\b(character|identity|hair|eyes|clothing)\\b|角色|外貌|服饰'],
      instructions: ['Keep stable character identity, hair, eyes, and outfit tags before temporary action tags.'],
      outputBlocks: ['identity', 'character', 'hair', 'eyes', 'clothing', 'clothingState'],
      examples: [{ input: '银发红眼白裙', output: ['silver hair', 'red eyes', 'white dress'] }],
    },
    {
      id: 'reference_prompt_profile',
      label: 'Reference Prompt Profile',
      category: 'profile',
      priority: 65,
      appliesToBackend: profiles.filter((id) => id !== 'generic'),
      keywords: ['sd', 'novelai', 'nai', 'comfyui', 'backend', '后端'],
      patterns: ['\\b(sd|novelai|nai|comfyui|backend)\\b|后端'],
      instructions: ['Apply backend profile style guidance while preserving the unified schema.'],
      outputBlocks: ['backendSpecific'],
      examples: [{ input: 'SD format', output: ['danbooru-style tags'] }],
    },
  ];
}

export function compileCuratedReferenceAssets(rawEntries = []) {
  const entries = Array.isArray(rawEntries) ? rawEntries : [];
  const allText = entries.map(textOfEntry).join('\n');
  const tags = extractEnglishTagsFromText(allText);
  const dictionary = buildDictionaryEntries(tags);
  const aliases = Object.fromEntries(Object.entries(CORE_ZH_ALIASES).map(([zh, tag]) => [zh, tag.toLowerCase()]));
  const profiles = detectProfiles(entries).map(makeProfile);
  const negativeTags = dictionary.filter((entry) => entry.category === 'negative').map((entry) => entry.tag);
  const negativePacks = {
    reference_default: [...new Set(['low quality', 'blurry', 'bad anatomy', 'extra fingers', 'missing fingers', 'watermark', 'text', ...negativeTags])],
  };
  const skills = makeSkills(tags, profiles.map((profile) => profile.id));

  return {
    dictionary,
    aliases,
    negativePacks,
    promptProfiles: profiles,
    skills,
    stats: {
      rawEntries: entries.length,
      tags: dictionary.length,
      aliases: Object.keys(aliases).length,
      promptProfiles: profiles.length,
      skills: skills.length,
    },
  };
}

export default compileCuratedReferenceAssets;
