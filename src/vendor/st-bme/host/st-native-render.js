function getTemplateRuntime() {
  return globalThis.window?.EjsTemplate || globalThis.EjsTemplate || null;
}

function safeStringify(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function deepGet(target, path) {
  if (!target || !path) return undefined;
  const parts = String(path || "").split(".").filter(Boolean);
  let current = target;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function yamlish(value, indent = 0) {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) return value.map((item) => `${pad}- ${yamlish(item, indent + 2)}`).join("\n");
  return Object.entries(value)
    .map(([key, item]) => `${pad}${key}: ${typeof item === "object" && item != null ? `\n${yamlish(item, indent + 2)}` : yamlish(item, 0)}`)
    .join("\n");
}

export function getLatestMessageVarTable() {
  try {
    if (globalThis.window?.Mvu?.getMvuData) return globalThis.window.Mvu.getMvuData({ type: "message", message_id: "latest" }) || {};
  } catch {}
  try {
    const getVars = globalThis.window?.TavernHelper?.getVariables || globalThis.window?.Mvu?.getMvuData || globalThis.TavernHelper?.getVariables || globalThis.Mvu?.getMvuData;
    if (typeof getVars === "function") return getVars({ type: "message", message_id: "latest" }) || {};
  } catch {}
  return {};
}

export async function prepareStNativeEjsEnv() {
  try {
    const runtime = getTemplateRuntime();
    const prepare = runtime?.prepareContext || runtime?.preparecontext || null;
    if (typeof prepare !== "function") return null;
    return (await prepare.call(runtime, {})) || null;
  } catch {
    return null;
  }
}

function substituteMacrosViaST(text) {
  try {
    if (typeof globalThis.substituteParamsExtended === "function") return globalThis.substituteParamsExtended(text);
  } catch {}
  return text;
}

function resolveGetMessageVariableMacros(text, messageVars) {
  return String(text || "").replace(/\{\{\s*get_message_variable::([^}]+)\s*}}/g, (_, rawPath) => {
    const path = String(rawPath || "").trim();
    if (!path) return "";
    return safeStringify(deepGet(messageVars, path));
  });
}

function resolveFormatMessageVariableMacros(text, messageVars) {
  return String(text || "").replace(/\{\{\s*format_message_variable::([^}]+)\s*}}/g, (_, rawPath) => {
    const path = String(rawPath || "").trim();
    if (!path) return "";
    const value = deepGet(messageVars, path);
    if (value == null) return "";
    if (typeof value === "string") return value;
    return yamlish(value);
  });
}

export async function renderTemplateWithStSupport(text, { env = null, messageVars = null, evaluateEjs = true } = {}) {
  const originalText = String(text ?? "");
  const runtime = getTemplateRuntime();
  const effectiveEnv = env || null;
  const effectiveMessageVars = messageVars && typeof messageVars === "object" ? messageVars : getLatestMessageVarTable();
  let output = originalText;
  let ejsEvaluated = false;
  let ejsError = null;
  if (evaluateEjs && originalText.includes("<%")) {
    try {
      const evalTemplate = runtime?.evalTemplate || runtime?.evaltemplate || null;
      if (runtime && effectiveEnv && typeof evalTemplate === "function") {
        output = await evalTemplate.call(runtime, output, effectiveEnv);
        ejsEvaluated = true;
      }
    } catch (error) {
      ejsError = error;
    }
  }
  const afterMacroSubstitute = substituteMacrosViaST(output);
  const afterMessageVariableResolve = resolveFormatMessageVariableMacros(resolveGetMessageVariableMacros(afterMacroSubstitute, effectiveMessageVars), effectiveMessageVars);
  return {
    text: afterMessageVariableResolve,
    stNativeRuntimeAvailable: Boolean(runtime),
    envPrepared: Boolean(effectiveEnv),
    ejsEvaluated,
    ejsError,
    macroApplied: afterMacroSubstitute !== output,
    messageVariableMacrosApplied: afterMessageVariableResolve !== afterMacroSubstitute,
  };
}
