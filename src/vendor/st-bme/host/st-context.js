function safeClone(value, fallback) {
  if (value == null) return fallback;
  try {
    if (typeof structuredClone === "function") return structuredClone(value);
  } catch {}
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback ?? value;
  }
}

function readContext() {
  if (globalThis.__stLittlePainterBmeContext && typeof globalThis.__stLittlePainterBmeContext === "object") return globalThis.__stLittlePainterBmeContext;
  try {
    if (typeof globalThis.__stLittlePainterBmeGetContext === "function") return globalThis.__stLittlePainterBmeGetContext() || {};
  } catch {}
  try {
    if (typeof globalThis.SillyTavern?.getContext === "function") return globalThis.SillyTavern.getContext() || {};
  } catch {}
  try {
    if (typeof globalThis.getContext === "function") return globalThis.getContext() || {};
  } catch {}
  return {};
}

function resolveCharacter(ctx) {
  const charId = ctx?.characterId ?? ctx?.this_chid;
  return ctx?.character || ctx?.characters?.[Number(charId)] || ctx?.characters?.[charId] || null;
}

function normalizeChatMessage(message, index = 0) {
  const content = String(message?.mes ?? message?.message ?? message?.content ?? message?.text ?? "");
  const role = String(message?.role || (message?.is_user ? "user" : message?.is_system ? "system" : "assistant"));
  return { ...message, mes: content, content, role, is_user: role === "user" || Boolean(message?.is_user), is_system: role === "system" || Boolean(message?.is_system), index: Number.isFinite(Number(message?.index)) ? Number(message.index) : index };
}

function resolveChat(ctx) {
  const messages = Array.isArray(ctx?.chat) ? ctx.chat : Array.isArray(ctx?.messages) ? ctx.messages : Array.isArray(ctx?.chatMessages) ? ctx.chatMessages : Array.isArray(ctx?.chat?.recentMessages) ? ctx.chat.recentMessages : [];
  return messages.map(normalizeChatMessage);
}

function resolveLastUserMessage(chat = []) {
  return chat.findLast?.((message) => message?.is_user)?.mes || [...chat].reverse().find((message) => message?.is_user)?.mes || "";
}

function buildStructuredSnapshot(ctx = {}) {
  const char = resolveCharacter(ctx) || {};
  const chat = resolveChat(ctx);
  const characterWorldbook = char?.data?.extensions?.world || char?.extensions?.world || ctx?.worldbook?.name || ctx?.worldInfo?.name || "";
  const personaLorebook = ctx?.extensionSettings?.persona_description_lorebook || ctx?.powerUserSettings?.persona_description_lorebook || ctx?.power_user?.persona_description_lorebook || "";
  const chatLorebook = ctx?.chatMetadata?.world || "";
  const globalVars = safeClone(ctx?.extensionSettings?.variables?.global || {}, {});
  const localVars = safeClone(ctx?.chatMetadata?.variables || {}, {});
  return {
    persona: { text: ctx?.powerUserSettings?.persona_description || ctx?.extensionSettings?.persona_description || ctx?.name1_description || ctx?.persona || "", lorebook: personaLorebook },
    character: { id: ctx?.characterId ?? ctx?.this_chid ?? null, name: ctx?.character?.name || ctx?.name2 || char?.name || "", description: ctx?.character?.description || char?.description || char?.data?.description || char?.data?.personality || "", avatar: char?.avatar ? `/characters/${char.avatar}` : "", worldbook: characterWorldbook, raw: safeClone(char, null) },
    user: { name: ctx?.name1 || ctx?.user?.name || "", avatar: ctx?.user?.avatar || "", raw: safeClone(ctx?.user || null, null) },
    chat: { id: ctx?.chatId || globalThis.getCurrentChatId?.() || "", messages: chat, lastUserMessage: resolveLastUserMessage(chat) },
    worldbook: { character: characterWorldbook, persona: personaLorebook, chat: chatLorebook },
    variables: { global: globalVars, local: localVars, merged: { ...globalVars, ...localVars } },
    time: { current: new Date().toLocaleString("zh-CN"), locale: "zh-CN" },
    host: { meta: { onlineStatus: ctx?.onlineStatus || "", selectedGroupId: ctx?.selectedGroupId ?? null }, capabilities: { hasGetContext: typeof globalThis.__stLittlePainterBmeGetContext === "function", hasGlobalGetContext: typeof globalThis.SillyTavern?.getContext === "function", hasCurrentChatId: typeof globalThis.getCurrentChatId === "function" } },
    raw: safeClone(ctx, {}),
  };
}

function buildCompatPromptAliases(snapshot) {
  return { userPersona: snapshot.persona.text, charDescription: snapshot.character.description, charName: snapshot.character.name, userName: snapshot.user.name, currentTime: snapshot.time.current };
}

export function getSTContextSnapshot() {
  const snapshot = buildStructuredSnapshot(readContext());
  return { snapshot, prompt: buildCompatPromptAliases(snapshot) };
}

export function getSTContextForPrompt() {
  return getSTContextSnapshot().prompt;
}
