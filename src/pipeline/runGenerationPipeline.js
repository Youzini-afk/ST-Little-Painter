import { TRACE_STATUS, EXTENSION_NAME } from '../core/constants.js';
import { collectContext } from '../context/collectContext.js';
import { sanitizeContext } from '../context/sanitizeContext.js';
import { addTraceStep, createTrace, finalizeTrace } from '../debug/trace.js';
import { callJson } from '../llm/callJson.js';
import { buildPlannerPrompt } from '../planner/buildPlannerPrompt.js';
import { callPlanner } from '../planner/callPlanner.js';
import { createEmptyScenePlan } from '../planner/scenePlanSchema.js';
import { buildTaggerPrompt, buildTaggerPromptHints } from '../tagger/buildTaggerPrompt.js';
import { isCompiledPromptUsable, normalizeCompiledPrompt } from '../tagger/compiledPromptSchema.js';
import { postprocessCompiledPrompt } from '../postprocess/postprocessCompiledPrompt.js';
import { compile as compileBackendRequest, generate as generateBackendImage } from '../backend/backendRegistry.js';
import { saveGenerationRecord } from '../image/imageStore.js';
import { insertToChatShell } from '../image/insertImage.js';

function flattenPositiveBlocks(positiveBlocks = {}) {
  return Object.values(positiveBlocks).filter(Array.isArray).flat().filter(Boolean);
}

function renderCompiledPrompt(compiledPrompt) {
  if (!compiledPrompt) return { positive: '', negative: '', insertionPlan: undefined };
  return {
    shouldGenerate: compiledPrompt.shouldGenerate !== false,
    positive: flattenPositiveBlocks(compiledPrompt.positiveBlocks).join(', '),
    negative: Array.isArray(compiledPrompt.negative) ? compiledPrompt.negative.filter(Boolean).join(', ') : '',
    warnings: Array.isArray(compiledPrompt.warnings) ? compiledPrompt.warnings : [],
    insertionPlan: compiledPrompt.insertionPlan,
  };
}

function renderFinalPrompt(finalPrompt) {
  if (!finalPrompt) return { shouldGenerate: false, positive: '', negative: '', warnings: [] };
  return {
    shouldGenerate: finalPrompt.shouldGenerate !== false,
    positive: finalPrompt.positive ?? '',
    negative: finalPrompt.negative ?? '',
    warnings: Array.isArray(finalPrompt.warnings) ? finalPrompt.warnings : [],
    insertionPlan: finalPrompt.insertionPlan,
  };
}

function tracePayload(settings, full, summary) {
  return settings?.debug?.enabled ? full : summary;
}

function summarizeValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return { type: 'string', length: value.length };
  if (Array.isArray(value)) return { type: 'array', count: value.length };
  if (typeof value === 'object') return { type: 'object', keys: Object.keys(value), keyCount: Object.keys(value).length };
  return { type: typeof value };
}

function summarizeContext(context = {}) {
  return Object.fromEntries(Object.entries(context ?? {}).map(([key, value]) => [key, summarizeValue(value)]));
}

function summarizeMessages(messages = []) {
  return {
    count: Array.isArray(messages) ? messages.length : 0,
    messages: (Array.isArray(messages) ? messages : []).map((message) => ({
      role: message?.role,
      contentLength: typeof message?.content === 'string' ? message.content.length : 0,
    })),
  };
}

function sanitizeWorldbookForPromptMerge(worldbook = {}) {
  const source = worldbook?.resolvedPromptContext && typeof worldbook.resolvedPromptContext === 'object'
    ? worldbook.resolvedPromptContext
    : worldbook;
  return {
    beforeText: String(source?.beforeText || ''),
    afterText: String(source?.afterText || ''),
    additionalMessages: Array.isArray(source?.additionalMessages) ? source.additionalMessages : [],
    activatedEntryNames: Array.isArray(source?.activatedEntryNames) ? source.activatedEntryNames : [],
    activatedEntries: Array.isArray(source?.activatedEntries) ? source.activatedEntries : [],
  };
}

function summarizeCompiledPrompt(compiledPrompt = {}) {
  const positiveBlocks = compiledPrompt?.positiveBlocks && typeof compiledPrompt.positiveBlocks === 'object' ? compiledPrompt.positiveBlocks : {};
  return {
    shouldGenerate: compiledPrompt?.shouldGenerate !== false,
    positiveBlockCount: Object.keys(positiveBlocks).length,
    positiveCount: flattenPositiveBlocks(positiveBlocks).length,
    inlinePositiveCount: Array.isArray(compiledPrompt?.positive) ? compiledPrompt.positive.length : 0,
    negativeCount: Array.isArray(compiledPrompt?.negative) ? compiledPrompt.negative.length : 0,
    warningCount: Array.isArray(compiledPrompt?.warnings) ? compiledPrompt.warnings.length : 0,
  };
}

function summarizeCallJsonResponse(response = {}) {
  return {
    rawLength: typeof response.raw === 'string' ? response.raw.length : 0,
    hasParsed: Boolean(response.parsed),
    parsed: response.parsed ? summarizeCompiledPrompt(response.parsed) : null,
    errorCount: Array.isArray(response.errors) ? response.errors.length : 0,
    errors: Array.isArray(response.errors) ? response.errors : [],
  };
}

function summarizeRenderedPrompt(rendered = {}) {
  return {
    shouldGenerate: rendered?.shouldGenerate !== false,
    positiveLength: typeof rendered?.positive === 'string' ? rendered.positive.length : 0,
    negativeLength: typeof rendered?.negative === 'string' ? rendered.negative.length : 0,
    warningCount: Array.isArray(rendered?.warnings) ? rendered.warnings.length : 0,
  };
}

function summarizeBackendRequest(request = {}) {
  const payload = request.payload ?? {};
  const parameters = payload.parameters ?? {};
  const prompt = payload.prompt ?? payload.input ?? parameters.prompt ?? request.prompt;
  const negativePrompt = payload.negative_prompt ?? parameters.negative_prompt;
  return {
    type: request.type,
    endpoint: request.endpoint,
    providerMode: request.providerMode,
    historyEndpoint: request.historyEndpoint,
    viewEndpoint: request.viewEndpoint,
    payload: summarizeValue(payload),
    promptLength: typeof prompt === 'string' ? prompt.length : 0,
    negativePromptLength: typeof negativePrompt === 'string' ? negativePrompt.length : 0,
    width: payload.width ?? parameters.width,
    height: payload.height ?? parameters.height,
    steps: payload.steps ?? parameters.steps,
  };
}

function summarizeGenerationRecord(record = {}) {
  if (!record) return null;
  return {
    id: record.id,
    createdAt: record.createdAt,
    backendType: record.backendType,
    prompt: summarizeRenderedPrompt(record.prompt),
    request: summarizeBackendRequest(record.request),
    image: record.image?.summary,
    insertionPlan: record.insertionPlan,
    chat: record.chat,
  };
}

function isScenePlanUsable(scenePlan = {}) {
  if (!scenePlan || typeof scenePlan !== 'object') return false;
  return Object.entries(scenePlan).some(([key, value]) => {
    if (key === 'warnings') return false;
    return Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? '').trim());
  });
}

function shouldUsePlanner(settings = {}, options = {}) {
  if (options.skipPlanner) return false;
  return settings.mode === 'smart' || settings.mode === 'expert';
}

async function runBackendGeneration({ rendered, settings, trace, context, skipBackend = false }) {
  if (skipBackend) {
    addTraceStep(trace, 'backend-skipped', { reason: 'skipBackend option enabled' });
    return null;
  }
  if (!settings.backend?.enabled) {
    addTraceStep(trace, 'backend-skipped', { reason: 'backend disabled' });
    return null;
  }
  if (rendered?.shouldGenerate === false) {
    addTraceStep(trace, 'backend-skipped', { reason: 'final prompt marked shouldGenerate=false' });
    return null;
  }

  const request = compileBackendRequest(rendered, settings);
  addTraceStep(trace, 'backend-compile', summarizeBackendRequest(request));
  const result = await generateBackendImage(request, settings);
  addTraceStep(trace, 'backend-generate', {
    backendType: result.backendType,
    mimeType: result.mimeType,
    image: {
      dataUrlLength: result.dataUrl ? result.dataUrl.length : 0,
      byteLength: result.base64 ? Math.floor(String(result.base64).length * 0.75) : 0,
    },
  });
  const record = saveGenerationRecord({ backendType: request.type, finalPrompt: rendered, compiledRequest: request, result, context });
  addTraceStep(trace, 'image-store', summarizeGenerationRecord(record));
  const insertionTrace = insertToChatShell(record);
  addTraceStep(trace, 'image-preview-insert', insertionTrace);
  return record;
}

export async function runGenerationPipeline({
  getContext,
  getSettings,
  worldbookContextProvider,
  mode = 'manual',
  skipBackend = false,
  skipPlanner = false,
} = {}) {
  if (typeof getContext !== 'function') throw new Error('runGenerationPipeline requires getContext');
  if (typeof getSettings !== 'function') throw new Error('runGenerationPipeline requires getSettings');
  if (!worldbookContextProvider?.resolveWorldbookContext) throw new Error('runGenerationPipeline requires worldbookContextProvider');

  const settings = getSettings();
  const trace = createTrace(mode === 'manual' ? 'manual-generate' : mode, {
    extension: EXTENSION_NAME,
    mode: settings.mode,
    tagApi: settings.tagApi,
    backend: settings.backend,
  });
  let rendered = null;
  let generationRecord = null;
  let normalizedCompiledPrompt = null;

  try {
    const rawContext = collectContext({ getContext, historyCount: settings.historyCount, mode });
    addTraceStep(trace, 'collect-context', tracePayload(settings, rawContext, summarizeContext(rawContext)));

    const sanitizedContext = sanitizeContext(rawContext, { settings });
    addTraceStep(trace, 'sanitize-context', tracePayload(settings, sanitizedContext, summarizeContext(sanitizedContext)));

    const resolvedWorldbook = await worldbookContextProvider.resolveWorldbookContext({ context: sanitizedContext, settings });
    addTraceStep(trace, 'resolve-worldbook-context', tracePayload(settings, resolvedWorldbook, summarizeContext(resolvedWorldbook)));

    let taggerContext = { ...sanitizedContext, worldbook: sanitizeWorldbookForPromptMerge(resolvedWorldbook) };

    if (shouldUsePlanner(settings, { skipPlanner })) {
      const plannerMessages = buildPlannerPrompt({ context: taggerContext, settings });
      addTraceStep(trace, 'build-planner-prompt', tracePayload(settings, { messages: plannerMessages }, summarizeMessages(plannerMessages)));
      const plannerResponse = await callPlanner({ settings, messages: plannerMessages });
      addTraceStep(trace, 'planner-response', tracePayload(settings, plannerResponse, summarizeCallJsonResponse(plannerResponse)));
      const plannerFailed = Boolean(plannerResponse.errors?.length) || !isScenePlanUsable(plannerResponse.parsed);
      if (plannerFailed) {
        addTraceStep(trace, 'planner-fallback', {
          reason: plannerResponse.parsed ? 'planner returned warnings or empty ScenePlan' : 'planner did not return usable ScenePlan',
          errorCount: Array.isArray(plannerResponse.errors) ? plannerResponse.errors.length : 0,
          errors: Array.isArray(plannerResponse.errors) ? plannerResponse.errors : [],
        });
        taggerContext = { ...taggerContext, scenePlan: createEmptyScenePlan() };
      } else {
        taggerContext = { ...taggerContext, scenePlan: plannerResponse.parsed };
      }
    }

    const promptHints = await buildTaggerPromptHints({ context: taggerContext, settings });
    addTraceStep(trace, 'select-skills-and-dictionary-hints', tracePayload(settings, promptHints, {
      selectedSkillCount: promptHints.skillSelection?.skills?.length ?? 0,
      dictionaryHintCount: promptHints.dictionaryHints?.length ?? 0,
    }));

    const messages = buildTaggerPrompt({ context: taggerContext, settings, promptHints });
    addTraceStep(trace, 'build-tagger-prompt', tracePayload(settings, { messages }, summarizeMessages(messages)));

    const response = await callJson({ settings, messages });
    addTraceStep(trace, 'tagger-response', tracePayload(settings, response, summarizeCallJsonResponse(response)));

    normalizedCompiledPrompt = normalizeCompiledPrompt(response.parsed, { context: taggerContext });
    const compiledPromptUsable = isCompiledPromptUsable(normalizedCompiledPrompt);
    addTraceStep(trace, 'normalize-compiled-prompt', tracePayload(settings, normalizedCompiledPrompt, {
      usable: compiledPromptUsable,
      parsedAvailable: Boolean(response.parsed),
      normalized: normalizedCompiledPrompt ? summarizeCompiledPrompt(normalizedCompiledPrompt) : null,
    }));

    const postprocessed = compiledPromptUsable ? await postprocessCompiledPrompt(normalizedCompiledPrompt, { settings }) : null;
    addTraceStep(trace, 'postprocess-compiled-prompt', tracePayload(settings, postprocessed, postprocessed ? summarizeRenderedPrompt(postprocessed) : null));

    rendered = postprocessed ? renderFinalPrompt(postprocessed) : renderCompiledPrompt(normalizedCompiledPrompt);
    addTraceStep(trace, 'render-final-prompt', tracePayload(settings, rendered, summarizeRenderedPrompt(rendered)));

    generationRecord = compiledPromptUsable ? await runBackendGeneration({ rendered, settings, trace, context: taggerContext, skipBackend }) : null;
    if (!compiledPromptUsable) addTraceStep(trace, 'backend-skipped', { reason: 'tagger parsed prompt unavailable or invalid' });

    if (!compiledPromptUsable || response.errors?.length) {
      finalizeTrace(trace, TRACE_STATUS.ERROR, {
        message: compiledPromptUsable ? 'Tagger returned JSON with extraction warnings.' : 'Tagger did not return usable CompiledPrompt JSON.',
        errors: response.errors,
        rendered: tracePayload(settings, rendered, summarizeRenderedPrompt(rendered)),
        generation: summarizeGenerationRecord(generationRecord),
      });
    } else {
      finalizeTrace(trace, TRACE_STATUS.SUCCESS, {
        message: generationRecord ? 'CompiledPrompt generated, postprocessed, and image generated successfully.' : 'CompiledPrompt generated and postprocessed successfully.',
        rendered: tracePayload(settings, rendered, summarizeRenderedPrompt(rendered)),
        generation: summarizeGenerationRecord(generationRecord),
      });
    }
    return { trace, compiled: normalizedCompiledPrompt, rendered, record: generationRecord };
  } catch (error) {
    addTraceStep(trace, 'pipeline-error', tracePayload(settings, { message: error?.message || String(error), stack: error?.stack }, { message: error?.message || String(error) }));
    finalizeTrace(trace, TRACE_STATUS.ERROR, { message: error?.message || String(error) });
    throw error;
  }
}

export default runGenerationPipeline;
