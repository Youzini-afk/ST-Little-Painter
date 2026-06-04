const generationRecords = [];
const MAX_GENERATION_RECORDS = 20;
let nextRecordId = 1;
const SCHEMA_VERSION = 2;

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function summarizeImage(result = {}) {
  return {
    mimeType: result.mimeType ?? 'image/png',
    byteLength: result.base64 ? Math.floor(String(result.base64).length * 0.75) : 0,
    dataUrlLength: result.dataUrl ? String(result.dataUrl).length : 0,
  };
}

function createRecordId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `stlp-generation-${timestamp}-${random}`;
}

function resolveChatTarget(insertionPlan = null, context = {}) {
  const chat = {
    chatId: context?.metadata?.chatId ?? context?.metadata?.chat_id ?? '',
    target: insertionPlan?.target ?? 'latest_assistant',
  };

  if (insertionPlan?.target === 'message_id') {
    chat.messageId = insertionPlan.messageId ?? '';
  } else if (insertionPlan?.target === 'message_index') {
    chat.messageIndex = insertionPlan.messageIndex;
  }

  return chat;
}

export function saveGenerationRecord({ backendType, finalPrompt, compiledRequest, result, context } = {}) {
  const insertionPlan = finalPrompt?.insertionPlan ?? null;
  const record = {
    schemaVersion: SCHEMA_VERSION,
    id: createRecordId(),
    sequence: nextRecordId,
    createdAt: new Date().toISOString(),
    backendType: backendType || compiledRequest?.type || result?.backendType || 'unknown',
    prompt: {
      positive: finalPrompt?.positive ?? '',
      negative: finalPrompt?.negative ?? '',
      warnings: Array.isArray(finalPrompt?.warnings) ? finalPrompt.warnings : [],
      insertionPlan,
    },
    insertionPlan,
    resolvedInsertion: insertionPlan ? { ...insertionPlan } : null,
    chat: resolveChatTarget(insertionPlan, context),
    request: compiledRequest ? {
      type: compiledRequest.type,
      endpoint: compiledRequest.endpoint,
      payload: compiledRequest.payload,
    } : null,
    image: {
      dataUrl: result?.dataUrl ?? '',
      mimeType: result?.mimeType ?? 'image/png',
      info: result?.info,
      parameters: result?.parameters,
      summary: summarizeImage(result),
    },
  };

  nextRecordId += 1;
  generationRecords.unshift(record);
  if (generationRecords.length > MAX_GENERATION_RECORDS) {
    generationRecords.splice(MAX_GENERATION_RECORDS);
  }
  return clone(record);
}

export function getGenerationRecords() {
  return clone(generationRecords);
}

export function getLatestGenerationRecord() {
  return clone(generationRecords[0] ?? null);
}

export function clearGenerationRecords() {
  generationRecords.splice(0, generationRecords.length);
}

export default {
  saveGenerationRecord,
  getGenerationRecords,
  getLatestGenerationRecord,
  clearGenerationRecords,
};
