import { applyTaskRegex } from './taskRegex.js';

function resolveHostContext(getContext) {
  try {
    if (typeof getContext === 'function') {
      return getContext() ?? {};
    }
    if (typeof globalThis.getContext === 'function') {
      return globalThis.getContext() ?? {};
    }
    if (typeof globalThis.SillyTavern?.getContext === 'function') {
      return globalThis.SillyTavern.getContext() ?? {};
    }
  } catch (error) {
    return {};
  }

  return {};
}

function pickRegexList(context) {
  const candidates = [
    context?.regex,
    context?.regexes,
    context?.extensionSettings?.regex,
    context?.extensionSettings?.regexes,
    globalThis.regex,
    globalThis.regexes,
  ];

  return candidates.find(Array.isArray) ?? [];
}

export function createRegexHostFacade({ getContext } = {}) {
  return {
    getTavernRegexes() {
      return pickRegexList(resolveHostContext(getContext));
    },

    applyHostRegexReuse(text, { stage, rules } = {}) {
      const hostRules = this.getTavernRegexes();
      const mergedRules = [
        ...(Array.isArray(hostRules) ? hostRules : []),
        ...(Array.isArray(rules) ? rules : []),
      ];

      if (!mergedRules.length) {
        return { text: text === undefined || text === null ? '' : String(text), transforms: [] };
      }

      return applyTaskRegex(text, mergedRules, { stage });
    },
  };
}

export default createRegexHostFacade;
