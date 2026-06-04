const DEFAULT_LOCAL_WORLDBOOK_NAME = 'little-painter-context';

function isObjectLike(value) {
  return value != null && (typeof value === 'object' || typeof value === 'function');
}

function bindFunction(container, name) {
  const fn = container?.[name];
  return typeof fn === 'function' ? fn.bind(container) : null;
}

function safeCall(fn, fallback = null, ...args) {
  if (typeof fn !== 'function') return fallback;
  try {
    return fn(...args);
  } catch {
    return fallback;
  }
}

function normalizeContextMessage(message, index = 0) {
  const content = String(message?.mes ?? message?.message ?? message?.content ?? message?.text ?? '');
  const role = String(message?.role || (message?.is_user ? 'user' : message?.is_system ? 'system' : 'assistant'));
  return {
    ...message,
    mes: content,
    content,
    role,
    is_user: role === 'user' || Boolean(message?.is_user),
    is_system: role === 'system' || Boolean(message?.is_system),
    index: Number.isFinite(Number(message?.index)) ? Number(message.index) : index,
  };
}

function normalizeGetContextSnapshot(context = {}) {
  const messages = Array.isArray(context?.chat)
    ? context.chat
    : Array.isArray(context?.messages)
      ? context.messages
      : Array.isArray(context?.chatMessages)
        ? context.chatMessages
        : Array.isArray(context?.chat?.recentMessages)
          ? context.chat.recentMessages
          : [];
  const recentMessages = messages.map(normalizeContextMessage);
  const character = context?.character && typeof context.character === 'object' ? context.character : {};
  const worldbook = context?.worldbook || context?.worldInfo || context?.world_info || {};

  return {
    ...context,
    chat: recentMessages,
    messages: recentMessages,
    name1: context?.name1 || context?.user?.name || context?.userName || '',
    name2: context?.name2 || character.name || context?.charName || '',
    character: {
      ...character,
      name: character.name || context?.name2 || context?.charName || '',
      description: character.description || character.desc || '',
    },
    chatId: context?.metadata?.chatId || context?.chatId || context?.chat?.id || '',
    chatMetadata: {
      ...(context?.chatMetadata || {}),
      world: context?.chatMetadata?.world || worldbook?.chat || worldbook?.chatLorebook || '',
    },
    extensionSettings: context?.extensionSettings || {},
    powerUserSettings: context?.powerUserSettings || {},
  };
}

function normalizeNameList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(normalizeNameList);
  if (typeof value === 'string') {
    return value.split(',').map((name) => name.trim()).filter(Boolean);
  }
  return [];
}

function resolveCurrentCharacter(context = {}) {
  const characterId = context?.this_chid ?? context?.characterId;
  return context?.character
    || context?.characters?.[Number(characterId)]
    || context?.characters?.[characterId]
    || {};
}

function collectConfiguredWorldbookNames(context = {}) {
  const character = resolveCurrentCharacter(context);
  const primaryCandidates = [
    context?.worldbook?.primary,
    context?.worldInfo?.primary,
    context?.worldbook?.name,
    context?.worldInfo?.name,
    character?.data?.extensions?.world,
    character?.extensions?.world,
    context?.characters?.[Number(context?.this_chid ?? context?.characterId)]?.data?.extensions?.world,
    context?.characters?.[context?.this_chid ?? context?.characterId]?.data?.extensions?.world,
  ].flatMap(normalizeNameList);
  const configuredAdditional = [
    ...(Array.isArray(context?.worldbook?.additional) ? context.worldbook.additional : []),
    ...(Array.isArray(context?.worldInfo?.additional) ? context.worldInfo.additional : []),
    ...normalizeNameList(context?.chatMetadata?.world),
    ...normalizeNameList(context?.extensionSettings?.persona_description_lorebook),
    ...normalizeNameList(context?.powerUserSettings?.persona_description_lorebook),
    ...normalizeNameList(context?.power_user?.persona_description_lorebook),
  ];

  return {
    primary: primaryCandidates[0] || '',
    additional: [...new Set([...primaryCandidates.slice(1), ...configuredAdditional].filter(Boolean))],
  };
}

function discoverContext() {
  const candidates = [
    () => globalThis.__stLittlePainterBmeContext,
    () => globalThis.SillyTavern?.getContext?.(),
    () => globalThis.getContext?.(),
  ];
  for (const read of candidates) {
    const value = safeCall(read, null);
    if (value && typeof value === 'object') return value;
  }
  return {};
}

function discoverHostApis(context = {}) {
  const candidates = [
    context?.worldbook,
    context?.worldInfo,
    context?.world_info,
    context?.host?.worldbook,
    context?.hostAdapter?.worldbook,
    context?.providers?.worldbook,
    context?.TavernHelper,
    context?.sillyTavern?.TavernHelper,
    globalThis.TavernHelper,
    globalThis.SillyTavern?.TavernHelper,
    globalThis.SillyTavern,
    globalThis,
  ].filter(isObjectLike);

  const result = { getWorldbook: null, getLorebookEntries: null, getCharWorldbookNames: null };
  for (const candidate of candidates) {
    result.getWorldbook ||= bindFunction(candidate, 'getWorldbook');
    result.getLorebookEntries ||= bindFunction(candidate, 'getLorebookEntries');
    result.getCharWorldbookNames ||= bindFunction(candidate, 'getCharWorldbookNames');
    if (result.getWorldbook && result.getLorebookEntries && result.getCharWorldbookNames) break;
  }
  return result;
}

function normalizeEntry(raw = {}, index = 0) {
  const uid = Number(raw.uid ?? raw.id ?? index + 1) || index + 1;
  const name = String(raw.name ?? raw.key ?? raw.title ?? raw.comment ?? `entry-${uid}`);
  const comment = String(raw.comment ?? raw.memo ?? raw.displayName ?? name);
  const content = String(raw.content ?? raw.text ?? raw.value ?? raw.prompt ?? '');
  const enabled = raw.enabled !== false && raw.disable !== true;
  const keys = Array.isArray(raw.strategy?.keys)
    ? raw.strategy.keys
    : Array.isArray(raw.keys)
      ? raw.keys
      : Array.isArray(raw.key)
        ? raw.key
        : typeof raw.key === 'string'
          ? [raw.key]
          : [];
  const keysSecondary = Array.isArray(raw.strategy?.keys_secondary?.keys)
    ? raw.strategy.keys_secondary.keys
    : Array.isArray(raw.keysSecondary)
      ? raw.keysSecondary
      : Array.isArray(raw.secondary_keys)
        ? raw.secondary_keys
        : [];
  const strategyType = raw.strategy?.type || (raw.constant === false || keys.length ? 'selective' : 'constant');

  return {
    ...raw,
    uid,
    name,
    comment,
    content,
    enabled,
    disable: !enabled,
    position: raw.position && typeof raw.position === 'object'
      ? raw.position
      : {
        type: raw.positionType || raw.position_type || 'before_character_definition',
        role: raw.role || 'system',
        depth: Number(raw.depth ?? 0),
        order: Number(raw.order ?? index + 1),
      },
    strategy: {
      ...(raw.strategy || {}),
      type: strategyType,
      keys,
      keys_secondary: {
        logic: raw.strategy?.keys_secondary?.logic || raw.secondaryLogic || raw.selectiveLogic || 'and_any',
        keys: keysSecondary,
      },
    },
    probability: Number(raw.probability ?? 100),
    extra: raw.extra || {},
    extensions: raw.extensions || {},
  };
}

function entriesFromValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(normalizeEntry);
  if (Array.isArray(value.entries)) return value.entries.map(normalizeEntry);
  if (value.entries && typeof value.entries === 'object') return Object.values(value.entries).map(normalizeEntry);
  return [];
}

function collectLocalWorldbooks(context = {}) {
  const books = new Map();
  const add = (name, entries) => {
    const normalizedName = String(name || DEFAULT_LOCAL_WORLDBOOK_NAME).trim() || DEFAULT_LOCAL_WORLDBOOK_NAME;
    const normalizedEntries = entriesFromValue(entries);
    if (normalizedEntries.length > 0) books.set(normalizedName, normalizedEntries);
  };

  const candidates = [context?.worldbook, context?.worldInfo, context?.world_info, context?.worldBook];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) {
      add(DEFAULT_LOCAL_WORLDBOOK_NAME, candidate);
      continue;
    }
    if (Array.isArray(candidate.entries) || (candidate.entries && typeof candidate.entries === 'object')) {
      add(candidate.name || candidate.world || candidate.worldbook || DEFAULT_LOCAL_WORLDBOOK_NAME, candidate.entries);
    }
    if (candidate.books && typeof candidate.books === 'object') {
      for (const [name, entries] of Object.entries(candidate.books)) add(name, entries);
    }
    if (candidate.worldbooks && typeof candidate.worldbooks === 'object') {
      for (const [name, entries] of Object.entries(candidate.worldbooks)) add(name, entries);
    }
    if (candidate.world_names && typeof candidate.world_names === 'object') {
      if (Array.isArray(candidate.world_names)) {
        for (const name of candidate.world_names) add(name, candidate.worldbooks?.[name] || candidate.books?.[name] || candidate.entries || []);
      } else {
        for (const [name, entries] of Object.entries(candidate.world_names)) add(name, entries);
      }
    }
  }
  return books;
}

export function createLittlePainterWorldbookDelegate({ context = {} } = {}) {
  let currentContext = context && typeof context === 'object' ? context : {};
  const readContext = () => normalizeGetContextSnapshot({ ...discoverContext(), ...currentContext });
  const localBooks = () => collectLocalWorldbooks(readContext());

  const provider = {
    async getWorldbook(worldbookName) {
      const ctx = readContext();
      const hostApis = discoverHostApis(ctx);
      if (typeof hostApis.getWorldbook === 'function') {
        const hosted = await hostApis.getWorldbook(worldbookName);
        if (Array.isArray(hosted) && hosted.length > 0) return hosted;
      }
      return localBooks().get(String(worldbookName || '').trim()) || [];
    },
    async getLorebookEntries(worldbookName) {
      const ctx = readContext();
      const hostApis = discoverHostApis(ctx);
      if (typeof hostApis.getLorebookEntries === 'function') {
        const hosted = await hostApis.getLorebookEntries(worldbookName);
        if (Array.isArray(hosted) && hosted.length > 0) return hosted;
      }
      return (localBooks().get(String(worldbookName || '').trim()) || []).map((entry) => ({ uid: entry.uid, comment: entry.comment || entry.name }));
    },
    getCharWorldbookNames(which = 'current') {
      const ctx = readContext();
      const hostApis = discoverHostApis(ctx);
      const hosted = safeCall(hostApis.getCharWorldbookNames, null, which);
      const localNames = [...localBooks().keys()];
      const configured = collectConfiguredWorldbookNames(ctx);
      if (hosted && typeof hosted === 'object') {
        return {
          primary: hosted.primary || configured.primary || localNames[0] || '',
          additional: [...new Set([...(Array.isArray(hosted.additional) ? hosted.additional : []), ...configured.additional].filter(Boolean))],
        };
      }
      return { primary: configured.primary || localNames[0] || DEFAULT_LOCAL_WORLDBOOK_NAME, additional: [...new Set(configured.additional.filter(Boolean))] };
    },
  };

  return {
    provider,
    getContext: () => readContext(),
    setContext(nextContext = {}) {
      currentContext = nextContext && typeof nextContext === 'object' ? nextContext : {};
    },
  };
}

export default createLittlePainterWorldbookDelegate;
