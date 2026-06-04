import { SELECTORS } from '../core/constants.js';
import { getGenerationRecords } from './imageStore.js';
import { resolveInsertionPlan } from './insertionPlan.js';
import { resolveMessageAnchor } from './messageAnchor.js';
import { renderImageAttachment } from './renderImageAttachment.js';

function getImageDataUrl(record = {}) {
  return record.image?.dataUrl || record.dataUrl || '';
}

function hasValidImageData(record = {}) {
  return /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/]+=*$/i.test(getImageDataUrl(record));
}

function getExistingRenderedNode(record = {}) {
  const id = String(record.id ?? '');
  if (!id || typeof document === 'undefined') {
    return null;
  }

  return Array.from(document.querySelectorAll?.('[data-stlp-generation-id]') ?? [])
    .find((node) => node.dataset?.stlpGenerationId === id) ?? null;
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
  if (!hasValidImageData(record)) {
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

export function insertToChatShell(record = {}) {
  const trace = [appendSettingsPreview(record)];

  if (typeof document === 'undefined') {
    trace.push({ target: 'chat-shell', inserted: false, reason: 'document unavailable' });
    return trace;
  }

  if (!hasValidImageData(record)) {
    trace.push({ target: 'chat-shell', inserted: false, reason: 'image data unavailable' });
    return trace;
  }

  const insertionPlan = resolveInsertionPlan({ insertionPlan: record.insertionPlan, finalPrompt: record.prompt });
  const anchor = resolveMessageAnchor(insertionPlan);
  const renderResult = renderImageAttachment(record, anchor, { insertionPlan });

  trace.push({
    target: 'chat-shell',
    inserted: renderResult.inserted,
    reason: renderResult.reason,
    recordId: record.id,
    targetMessageFound: anchor.targetMessageFound,
    anchorFound: anchor.anchorFound,
    fallbackUsed: anchor.fallbackUsed,
    renderedDomNodeId: renderResult.node?.id || '',
  });
  return trace;
}

export function rerenderAllGenerationRecords() {
  return getGenerationRecords().map((record) => {
    if (!hasValidImageData(record)) {
      return {
        recordId: record.id,
        inserted: false,
        reason: 'image data unavailable',
      };
    }

    const existingNode = getExistingRenderedNode(record);
    if (existingNode) {
      return {
        recordId: record.id,
        inserted: false,
        reason: 'already inserted',
        renderedDomNodeId: existingNode.id || '',
      };
    }

    const insertionPlan = resolveInsertionPlan({ insertionPlan: record.insertionPlan, finalPrompt: record.prompt });
    const anchor = resolveMessageAnchor(insertionPlan);
    const renderResult = renderImageAttachment(record, anchor, { insertionPlan });
    return {
      recordId: record.id,
      inserted: renderResult.inserted,
      reason: renderResult.reason,
      targetMessageFound: anchor.targetMessageFound,
      anchorFound: anchor.anchorFound,
      fallbackUsed: anchor.fallbackUsed,
      renderedDomNodeId: renderResult.node?.id || '',
    };
  });
}

export default { appendSettingsPreview, insertToChatShell, rerenderAllGenerationRecords };
