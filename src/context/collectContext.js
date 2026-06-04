function pickFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function safeString(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value);
}

function readGlobal(path) {
  let cursor = globalThis;
  for (const key of path) {
    if (!cursor || cursor[key] === undefined) {
      return undefined;
    }
    cursor = cursor[key];
  }
  return cursor;
}

function normalizeMessage(message, index = 0) {
  const role = pickFirst(message?.role, message?.is_user ? 'user' : undefined, message?.name, 'assistant');
  const content = pickFirst(message?.mes, message?.message, message?.content, message?.text, '');

  return {
    role: safeString(role),
    content: safeString(content),
    index: Number.isFinite(message?.index) ? message.index : index,
  };
}

function getChatMessages(context) {
  const candidates = [
    context?.chat,
    context?.messages,
    context?.chatMessages,
    readGlobal(['chat']),
  ];

  const messages = candidates.find((candidate) => Array.isArray(candidate));
  return messages ? messages.map(normalizeMessage) : [];
}

function getCharacter(context) {
  const characterId = pickFirst(context?.characterId, context?.this_chid);
  const character = pickFirst(
    context?.character,
    context?.characters?.[Number(characterId)],
    context?.characters?.[characterId],
    readGlobal(['characters', readGlobal(['this_chid'])]),
    {},
  );

  return {
    raw: character && typeof character === 'object' ? character : {},
    data: character?.data && typeof character.data === 'object' ? character.data : {},
    extensions: character?.extensions && typeof character.extensions === 'object' ? character.extensions : {},
    name: safeString(pickFirst(character?.name, context?.name2, readGlobal(['name2']))),
    aliases: Array.isArray(character?.aliases) ? character.aliases.map(safeString) : [],
    description: safeString(pickFirst(character?.description, character?.data?.description, character?.desc)),
    personality: safeString(pickFirst(character?.personality, character?.data?.personality)),
    scenario: safeString(pickFirst(character?.scenario, character?.data?.scenario)),
    stableAppearance: [],
    currentState: [],
  };
}

function resolveContext(getContext) {
  if (typeof getContext === 'function') {
    try {
      return getContext() ?? {};
    } catch (error) {
      return { collectionError: error?.message || String(error) };
    }
  }

  if (typeof globalThis.getContext === 'function') {
    try {
      return globalThis.getContext() ?? {};
    } catch (error) {
      return { collectionError: error?.message || String(error) };
    }
  }

  if (typeof globalThis.SillyTavern?.getContext === 'function') {
    try {
      return globalThis.SillyTavern.getContext() ?? {};
    } catch (error) {
      return { collectionError: error?.message || String(error) };
    }
  }

  return {};
}

export function collectContext({ getContext, historyCount = 8, mode = 'manual' } = {}) {
  const context = resolveContext(getContext);
  // Prefer SillyTavern chat data from getContext/global chat. Do not scrape chat DOM here;
  // render-only image previews live under .stlp-chat-image-preview/.stlp-generated-image
  // and must never re-enter prompt context.
  const messages = getChatMessages(context);
  const normalizedHistoryCount = Math.max(1, Number(historyCount) || 8);
  const recentMessages = messages.slice(-normalizedHistoryCount);
  const latest = [...messages].reverse().find((message) => message.content)?.content ?? '';

  return {
    name1: safeString(pickFirst(context?.name1, readGlobal(['name1']))),
    name2: safeString(pickFirst(context?.name2, getCharacter(context)?.name, readGlobal(['name2']))),
    this_chid: pickFirst(context?.this_chid, context?.characterId, readGlobal(['this_chid'])),
    characters: context?.characters ?? readGlobal(['characters']) ?? [],
    chatMetadata: context?.chatMetadata ?? {},
    extensionSettings: context?.extensionSettings ?? {},
    powerUserSettings: context?.powerUserSettings ?? {},
    persona: context?.persona,
    user: context?.user ?? {},
    chat: {
      latestMessage: latest,
      recentMessages,
    },
    character: getCharacter(context),
    worldbook: pickFirst(
      context?.worldbook,
      context?.worldBook,
      context?.worldInfo,
      context?.world_info,
      context?.worldbookContext,
      {},
    ),
    userIntent: {
      mode,
    },
    metadata: {
      chatId: safeString(pickFirst(
        context?.chatId,
        context?.chat_id,
        context?.getCurrentChatId?.(),
        globalThis.getCurrentChatId?.(),
        globalThis.SillyTavern?.getCurrentChatId?.(),
        context?.chatMetadata?.chat_id,
        context?.chatMetadata?.chatId,
        context?.chatMetadata?.session_id,
        context?.chatMetadata?.sessionId,
        context?.chat?.id,
      )),
      messageId: safeString(pickFirst(context?.messageId, context?.message_id, recentMessages.at(-1)?.index)),
      timestamp: Date.now(),
      resolverVersion: 'phase-2',
    },
    collectionError: context?.collectionError,
  };
}

export default collectContext;
