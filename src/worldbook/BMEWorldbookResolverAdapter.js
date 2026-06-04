import { initializeHostAdapter } from '../vendor/st-bme/host/adapter/index.js';
import { resolveTaskWorldInfo } from '../vendor/st-bme/prompting/task-worldinfo.js';
import { createLittlePainterWorldbookDelegate } from './createLittlePainterWorldbookDelegate.js';

let bmeWorldbookResolveQueue = Promise.resolve();

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function readMessages(context = {}) {
  if (Array.isArray(context?.chat?.recentMessages)) return context.chat.recentMessages;
  if (Array.isArray(context?.chatMessages)) return context.chatMessages;
  if (Array.isArray(context?.chat)) return context.chat;
  if (Array.isArray(context?.messages)) return context.messages;
  return [];
}

function readMessageText(message = {}) {
  return String(message?.content ?? message?.mes ?? message?.message ?? message?.text ?? '');
}

function runSerializedResolve(task) {
  const run = bmeWorldbookResolveQueue.catch(() => {}).then(task);
  bmeWorldbookResolveQueue = run.catch(() => {});
  return run;
}

function sanitizeActivatedEntry(entry = {}) {
  return {
    uid: Number(entry.uid ?? 0),
    name: String(entry.name || ''),
    sourceName: String(entry.sourceName || entry.source_name || entry.name || ''),
    worldbook: String(entry.worldbook || ''),
    content: String(entry.content || ''),
    role: String(entry.role || 'system'),
    position: Number(entry.position ?? 0),
    depth: Number(entry.depth ?? 0),
    order: Number(entry.order ?? 100),
    index: Number(entry.index ?? 0),
  };
}

function sanitizeAdditionalMessage(message = {}) {
  return {
    role: String(message.role || 'system'),
    content: String(message.content || ''),
    depth: Number(message.depth ?? 0),
    order: Number(message.order ?? 100),
    uid: Number(message.uid ?? 0),
    index: Number(message.index ?? 0),
    name: String(message.name || ''),
    sourceName: String(message.sourceName || message.name || ''),
    worldbook: String(message.worldbook || ''),
    source: String(message.source || 'worldInfo-atDepth'),
    sourceKey: String(message.sourceKey || 'taskAdditionalMessages'),
  };
}

function buildResolvedPromptContext(resolved = {}, activatedEntries = []) {
  const activatedEntryNames = Array.isArray(resolved.activatedEntryNames)
    ? resolved.activatedEntryNames.map((name) => String(name || '')).filter(Boolean)
    : [];

  return {
    beforeText: String(resolved.beforeText || ''),
    afterText: String(resolved.afterText || ''),
    additionalMessages: Array.isArray(resolved.additionalMessages)
      ? resolved.additionalMessages.map(sanitizeAdditionalMessage).filter((message) => message.content)
      : [],
    activatedEntryNames,
    activatedEntries: activatedEntries.map(sanitizeActivatedEntry).filter((entry) => entry.content),
  };
}

export function createBMEWorldbookResolverAdapter({ delegate = null } = {}) {
  return {
    async resolveWorldbookContext({ context = {}, settings = {} } = {}) {
      const worldbookSettings = settings.worldbook ?? {};
      if (worldbookSettings.enabled === false) {
        const resolvedPromptContext = {
          beforeText: '',
          afterText: '',
          additionalMessages: [],
          activatedEntryNames: [],
          activatedEntries: [],
        };
        return {
          visualFacts: [],
          constraints: [],
          entries: [],
          activatedEntries: [],
          beforeText: '',
          afterText: '',
          additionalMessages: [],
          activatedEntryNames: [],
          resolvedPromptContext,
          debug: {},
          diagnostics: { source: 'st-bme-vendored', enabled: false, skipped: true, reason: 'worldbook disabled' },
        };
      }

      if (delegate && typeof delegate.resolveWorldbookContext === 'function') {
        return delegate.resolveWorldbookContext({ context, settings });
      }

      return runSerializedResolve(async () => {
        const littlePainterDelegate = createLittlePainterWorldbookDelegate({ context });
        const previousContext = globalThis.__stLittlePainterBmeContext;
        const previousGetContext = globalThis.__stLittlePainterBmeGetContext;
        globalThis.__stLittlePainterBmeContext = littlePainterDelegate.getContext();
        globalThis.__stLittlePainterBmeGetContext = littlePainterDelegate.getContext;

        try {
          initializeHostAdapter({ getContext: littlePainterDelegate.getContext, worldbookProvider: littlePainterDelegate.provider });

          const chatMessages = readMessages(context);
          const userMessage = String(context?.userIntent?.raw || context?.chat?.latestMessage || readMessageText(chatMessages.at(-1)) || '');
          const recentMessages = chatMessages.map(readMessageText).filter(Boolean).join('\n');
          const templateContext = {
            userMessage,
            user_input: userMessage,
            recentMessages,
            chatMessages,
            dialogueText: chatMessages.map((message) => `${message?.role || 'assistant'}: ${readMessageText(message)}`).join('\n'),
            charName: context?.character?.name || context?.name2 || '',
            userName: context?.user?.name || context?.name1 || '',
            charDescription: context?.character?.description || '',
            ...(context?.templateContext || {}),
          };
          const flatSettings = {
            ...settings,
            ...worldbookSettings,
            worldInfoFilterMode: worldbookSettings.worldInfoFilterMode ?? settings.worldInfoFilterMode ?? 'default',
            worldInfoFilterCustomKeywords: worldbookSettings.worldInfoFilterCustomKeywords ?? settings.worldInfoFilterCustomKeywords ?? '',
            worldInfoMaxResolvePasses: worldbookSettings.worldInfoMaxResolvePasses ?? settings.worldInfoMaxResolvePasses ?? 10,
          };

          const resolved = await resolveTaskWorldInfo({ settings: flatSettings, chatMessages, userMessage, templateContext });
          const activatedEntries = [
            ...(Array.isArray(resolved.beforeEntries) ? resolved.beforeEntries : []),
            ...(Array.isArray(resolved.afterEntries) ? resolved.afterEntries : []),
            ...(Array.isArray(resolved.atDepthEntries) ? resolved.atDepthEntries : []),
          ];
          const resolvedPromptContext = buildResolvedPromptContext(resolved, activatedEntries);

          return {
            visualFacts: [...asArray(worldbookSettings.manualVisualFacts), ...resolvedPromptContext.activatedEntries.map((entry) => entry.content).filter(Boolean)],
            constraints: asArray(worldbookSettings.manualConstraints),
            entries: [],
            activatedEntries: resolvedPromptContext.activatedEntries,
            beforeText: resolvedPromptContext.beforeText,
            afterText: resolvedPromptContext.afterText,
            additionalMessages: resolvedPromptContext.additionalMessages,
            activatedEntryNames: resolvedPromptContext.activatedEntryNames,
            resolvedPromptContext,
            diagnostics: {
              source: 'st-bme-vendored',
              enabled: true,
              entryCount: Array.isArray(resolved.allEntries) ? resolved.allEntries.length : 0,
              activatedEntryCount: resolvedPromptContext.activatedEntries.length,
              activatedEntryNames: resolvedPromptContext.activatedEntryNames,
              beforeLength: resolvedPromptContext.beforeText.length,
              afterLength: resolvedPromptContext.afterText.length,
            },
            debug: resolved.debug || {},
          };
        } finally {
          if (previousContext === undefined) delete globalThis.__stLittlePainterBmeContext;
          else globalThis.__stLittlePainterBmeContext = previousContext;
          if (previousGetContext === undefined) delete globalThis.__stLittlePainterBmeGetContext;
          else globalThis.__stLittlePainterBmeGetContext = previousGetContext;
          initializeHostAdapter({});
        }
      });
    },
  };
}

export default createBMEWorldbookResolverAdapter;
