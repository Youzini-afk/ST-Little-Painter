const CLASSIFIERS = [
  {
    type: 'skill',
    pattern: /\b(skill|workflow|instruction|步骤|流程|技巧|方法|规则|指南)\b/i,
  },
  {
    type: 'prompt_fragment',
    pattern: /\b(prompt|tag|negative|positive|lora|embedding|提示词|正向|负向|标签)\b/i,
  },
  {
    type: 'tag',
    pattern: /[,，]\s*[^,，]+|\b(masterpiece|quality|lighting|camera|pose|style|anime|realistic)\b/i,
  },
  {
    type: 'retrieval_card',
    pattern: /\b(character|world|lore|setting|background|角色|世界|设定|背景|条目)\b/i,
  },
];

function classifyEntry(entry) {
  const text = [entry?.key, entry?.name, entry?.comment, entry?.content].filter(Boolean).join('\n');
  const hit = CLASSIFIERS.find((classifier) => classifier.pattern.test(text));
  return hit?.type ?? 'retrieval_card';
}

function makeAssetId(entry, index) {
  const base = [entry?.sourcePath, entry?.sourceIndex ?? index, entry?.key ?? entry?.name ?? 'entry']
    .join(':')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return base || `reference-${index}`;
}

export function compileRawEntriesToAssets(entries = []) {
  return entries.map((entry, index) => ({
    id: makeAssetId(entry, index),
    type: classifyEntry(entry),
    title: entry?.name || entry?.key || `Reference ${index + 1}`,
    key: entry?.key ?? '',
    content: entry?.content ?? '',
    comment: entry?.comment ?? '',
    sourcePath: entry?.sourcePath ?? '',
    sourceIndex: Number.isFinite(Number(entry?.sourceIndex)) ? Number(entry.sourceIndex) : index,
    reviewStatus: 'pending',
  }));
}

export default compileRawEntriesToAssets;
