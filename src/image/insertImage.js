import { SELECTORS } from '../core/constants.js';

function getImageDataUrl(record = {}) {
  return record.image?.dataUrl || record.dataUrl || '';
}

function createImageElement(record = {}) {
  const image = document.createElement('img');
  image.className = 'stlp-generated-image';
  image.src = getImageDataUrl(record);
  image.alt = `ST-Little Painter generation ${record.id ?? ''}`.trim();
  image.loading = 'lazy';
  return image;
}

function ensurePreviewList() {
  const existing = document.querySelector(SELECTORS.imagePreviewList);
  if (existing) {
    return existing;
  }

  const root = document.querySelector(SELECTORS.settingsRoot);
  if (!root) {
    return null;
  }

  const section = document.createElement('section');
  section.className = 'stlp-section';

  const heading = document.createElement('h4');
  heading.textContent = 'Image Preview';

  const list = document.createElement('div');
  list.id = SELECTORS.imagePreviewList.slice(1);
  list.className = 'stlp-image-preview-list';

  section.append(heading, list);
  root.append(section);
  return list;
}

export function appendSettingsPreview(record = {}) {
  const trace = { target: 'settings-preview', inserted: false };

  if (typeof document === 'undefined') {
    return { ...trace, reason: 'document unavailable' };
  }

  const dataUrl = getImageDataUrl(record);
  if (!dataUrl) {
    return { ...trace, reason: 'image data unavailable' };
  }

  const list = ensurePreviewList();
  if (!list) {
    return { ...trace, reason: 'settings root unavailable' };
  }

  const item = document.createElement('div');
  item.className = 'stlp-image-preview-item';

  const caption = document.createElement('div');
  caption.className = 'stlp-image-preview-caption';
  caption.textContent = record.createdAt ? `${record.id} · ${record.createdAt}` : record.id ?? 'Generated image';

  item.append(createImageElement(record), caption);
  list.prepend(item);

  return { ...trace, inserted: true, recordId: record.id };
}

function findChatTarget() {
  const selectors = [
    '#chat .mes:last-child .mes_text',
    '#chat .mes:last-child',
    '#chat',
    '.chat .mes:last-child .mes_text',
    '.chat .mes:last-child',
    '.chat',
  ];

  for (const selector of selectors) {
    const target = document.querySelector(selector);
    if (target) {
      return { selector, target };
    }
  }

  return { selector: '', target: null };
}

export function insertToChatShell(record = {}) {
  const trace = [appendSettingsPreview(record)];

  if (typeof document === 'undefined') {
    trace.push({ target: 'chat-shell', inserted: false, reason: 'document unavailable' });
    return trace;
  }

  const dataUrl = getImageDataUrl(record);
  if (!dataUrl) {
    trace.push({ target: 'chat-shell', inserted: false, reason: 'image data unavailable' });
    return trace;
  }

  const { selector, target } = findChatTarget();
  if (!target) {
    trace.push({ target: 'chat-shell', inserted: false, reason: 'chat shell unavailable' });
    return trace;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'stlp-chat-image-preview';
  wrapper.append(createImageElement(record));
  target.append(wrapper);

  trace.push({ target: 'chat-shell', inserted: true, selector, recordId: record.id });
  return trace;
}

export default { appendSettingsPreview, insertToChatShell };
