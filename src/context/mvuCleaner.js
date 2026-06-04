const BLOCK_PATTERNS = [
  { type: 'mvu', pattern: /<\s*(?:mvu|mvu_state)\b[^>]*>[\s\S]*?<\s*\/\s*(?:mvu|mvu_state)\s*>/gi },
  { type: 'state', pattern: /<\s*(?:status|state|states)\b[^>]*>[\s\S]*?<\s*\/\s*(?:status|state|states)\s*>/gi },
  { type: 'variable', pattern: /<\s*(?:variables|vars)\b[^>]*>[\s\S]*?<\s*\/\s*(?:variables|vars)\s*>/gi },
  { type: 'mvu', pattern: /```\s*(?:mvu|status|state|states|variables|vars)\b[\s\S]*?```/gi },
  { type: 'state', pattern: /\[(?:状态|state|status)\][\s\S]*?\[\/(?:状态|state|status)\]/gi },
  { type: 'state', pattern: /【(?:状态|state|status)】[\s\S]*?【\/(?:状态|state|status)】/gi },
  { type: 'variable', pattern: /\{\{\s*(?:setvar|getvar|incvar|decvar|var)::[\s\S]*?\}\}/gi },
];

export function cleanMvuBlocks(value) {
  let text = value === undefined || value === null ? '' : String(value);
  const removedBlocks = [];

  for (const { type, pattern } of BLOCK_PATTERNS) {
    text = text.replace(pattern, (match) => {
      removedBlocks.push({
        type,
        preview: match.slice(0, 120),
        length: match.length,
      });
      return ' ';
    });
  }

  return { text, removedBlocks };
}

export default cleanMvuBlocks;
