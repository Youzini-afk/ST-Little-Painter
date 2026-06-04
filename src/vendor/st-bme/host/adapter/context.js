import { buildCapabilityStatus, mergeVersionHints } from "./capabilities.js";
import { debugDebug } from "../../runtime/debug-logging.js";

function resolveContextGetter(providedGetter = null) {
  if (typeof providedGetter === "function") return providedGetter;
  if (typeof globalThis.__stLittlePainterBmeGetContext === "function") return globalThis.__stLittlePainterBmeGetContext;
  if (typeof globalThis.getContext === "function") return globalThis.getContext;
  const globalGetter = globalThis?.SillyTavern?.getContext;
  return typeof globalGetter === "function" ? globalGetter.bind(globalThis.SillyTavern) : null;
}

function detectContextMode(getContext, providedGetter) {
  if (typeof getContext !== "function") return "unavailable";
  if (providedGetter && getContext === providedGetter) return "provided";
  if (getContext === globalThis.__stLittlePainterBmeGetContext) return "little-painter-bridge";
  return "global-api";
}

export function createContextHostFacade(options = {}) {
  const getContext = resolveContextGetter(options.getContext);
  const available = typeof getContext === "function";
  const mode = detectContextMode(getContext, options.getContext);

  return Object.freeze({
    available,
    mode,
    fallbackReason: available ? "" : "未检测到 getContext 宿主接口",
    versionHints: mergeVersionHints(
      {
        getter: "getContext",
        source: mode,
        littlePainterBridge: typeof globalThis.__stLittlePainterBmeGetContext === "function" ? "available" : "missing",
        sillyTavernGlobal: globalThis?.SillyTavern && typeof globalThis.SillyTavern === "object" ? "available" : "missing",
      },
      options.versionHints,
    ),
    getContext: (...args) => {
      if (!available) return null;
      try {
        return getContext(...args);
      } catch (error) {
        debugDebug("[ST-BME] host-adapter/context getContext 调用失败", error);
        return null;
      }
    },
    readContextSnapshot: (...args) => {
      if (!available) return null;
      try {
        const context = getContext(...args);
        return context && typeof context === "object" ? context : null;
      } catch (error) {
        debugDebug("[ST-BME] host-adapter/context 读取上下文失败", error);
        return null;
      }
    },
  });
}

export function inspectContextHostCapability(options = {}) {
  const facade = createContextHostFacade(options);
  return buildCapabilityStatus(facade);
}

export function readHostContext(options = {}) {
  return createContextHostFacade(options).readContextSnapshot();
}
