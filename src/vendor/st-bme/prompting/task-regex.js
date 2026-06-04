export function applyHostRegexReuse(_settings = {}, _taskType = "", text = "", options = {}) {
  const formatter = globalThis.__stLittlePainterRegexFormatter || globalThis.TavernHelper?.formatAsTavernRegexedString || globalThis.SillyTavern?.TavernHelper?.formatAsTavernRegexedString;
  if (typeof formatter !== "function") {
    return { text: String(text ?? ""), changed: false, formatterAvailable: false, formatterSource: "", executionMode: "host-unavailable", fallbackReason: "Vendored Little Painter worldbook resolver has no host regex formatter", skippedDisplayOnlyRuleCount: 0 };
  }
  try {
    const next = formatter(String(text ?? ""), options?.regexSourceType || options?.sourceType || "world_info", "prompt", options?.formatterOptions || {});
    return { text: String(next ?? ""), changed: String(next ?? "") !== String(text ?? ""), formatterAvailable: true, formatterSource: "global-helper", executionMode: "host-formatter", fallbackReason: "", skippedDisplayOnlyRuleCount: 0 };
  } catch (error) {
    return { text: String(text ?? ""), changed: false, formatterAvailable: true, formatterSource: "global-helper", executionMode: "host-error", fallbackReason: error instanceof Error ? error.message : String(error), skippedDisplayOnlyRuleCount: 0 };
  }
}

export function applyTaskRegex(_settings = {}, _taskType = "", payload = {}) {
  return payload;
}

export function inspectTaskRegexReuse() {
  return { formatterAvailable: Boolean(globalThis.__stLittlePainterRegexFormatter || globalThis.TavernHelper?.formatAsTavernRegexedString || globalThis.SillyTavern?.TavernHelper?.formatAsTavernRegexedString), executionMode: "little-painter-shim" };
}
