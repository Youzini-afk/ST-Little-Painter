function asText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map(asText).filter(Boolean).join('\n');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value).trim();
}

function firstText(...values) {
  for (const value of values) {
    const text = asText(value);
    if (text) {
      return text;
    }
  }
  return '';
}

function normalizeKey(value, fallback) {
  if (Array.isArray(value)) {
    return value.map(asText).filter(Boolean).join(', ');
  }
  return firstText(value, fallback);
}

function pushEntry(entries, raw, path) {
  const key = normalizeKey(raw?.key ?? raw?.keys ?? raw?.name, raw?.title);
  const content = firstText(raw?.content, raw?.comment, raw?.description, raw?.name, raw?.key);

  if (!key && !content) {
    return;
  }

  entries.push({
    sourcePath: path ?? '',
    sourceIndex: entries.length,
    key,
    content,
    comment: firstText(raw?.comment),
    name: firstText(raw?.name),
    raw,
  });
}

function walkWorldbookNode(node, entries, path) {
  if (!node) {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => walkWorldbookNode(item, entries, path));
    return;
  }

  if (typeof node !== 'object') {
    return;
  }

  const isRawEntry = 'content' in node || 'comment' in node || 'key' in node || 'keys' in node || 'name' in node;
  if (isRawEntry) {
    pushEntry(entries, node, path);
  }

  if (node.entries && (Array.isArray(node.entries) || typeof node.entries === 'object')) {
    walkWorldbookNode(node.entries, entries, path);
    return;
  }

  if (!isRawEntry) {
    Object.values(node).forEach((value) => walkWorldbookNode(value, entries, path));
  }
}

function extractJsonEntries(parsed, path) {
  const entries = [];
  if (parsed && typeof parsed === 'object' && 'entries' in parsed) {
    walkWorldbookNode(parsed.entries, entries, path);
  } else {
    walkWorldbookNode(parsed, entries, path);
  }
  return entries.map((entry, sourceIndex) => ({ ...entry, sourceIndex }));
}

function extractTextEntries(text, path) {
  const normalized = String(text ?? '').replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const chunks = normalized
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const sourceChunks = chunks.length ? chunks : [normalized];
  return sourceChunks.map((chunk, sourceIndex) => {
    const [firstLine = '', ...rest] = chunk.split('\n');
    const key = firstLine.length <= 80 ? firstLine.replace(/^#+\s*/, '').trim() : '';
    return {
      sourcePath: path ?? '',
      sourceIndex,
      key,
      content: rest.length && key ? rest.join('\n').trim() : chunk,
      comment: '',
      name: key,
      raw: chunk,
    };
  });
}

export function parseSourceDocument(text, { path } = {}) {
  const sourcePath = path ?? '';
  const trimmed = String(text ?? '').trim();
  const document = {
    sourcePath,
    type: 'text',
    entries: [],
    errors: [],
  };

  if (/\.json$/i.test(sourcePath) || /^[\[{]/.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed || 'null');
      document.type = 'json';
      document.entries = extractJsonEntries(parsed, sourcePath);
      return document;
    } catch (error) {
      document.errors.push(error?.message || String(error));
      if (/\.json$/i.test(sourcePath)) {
        return document;
      }
    }
  }

  document.type = 'text';
  document.entries = extractTextEntries(text, sourcePath);
  return document;
}

export default parseSourceDocument;
