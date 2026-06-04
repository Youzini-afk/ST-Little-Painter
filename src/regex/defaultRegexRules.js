import { final_tag_cleanup, input_cleanup, llm_output_cleanup } from './regexStages.js';

const COMMON_POLLUTION_RULES = Object.freeze([
  {
    id: 'bme-default-strip-thinking-analysis-reasoning',
    name: 'Strip thinking/analysis/reasoning blocks',
    findRegex: '/<(think|thinking|analysis|reasoning)\\b[^>]*>[\\s\\S]*?<\\/\\1>/gi',
    replaceString: ' ',
  },
  {
    id: 'bme-default-strip-choice-blocks',
    name: 'Strip choice blocks and tags',
    findRegex: '/(?:<choice\\b[^>]*>[\\s\\S]*?<\\/choice>|<choice\\b[^>]*\\/?>)/gi',
    replaceString: ' ',
  },
  {
    id: 'bme-default-strip-updatevariable-blocks',
    name: 'Strip UpdateVariable blocks and tags',
    findRegex: '/(?:<updatevariable\\b[^>]*>[\\s\\S]*?<\\/updatevariable>|<updatevariable\\b[^>]*\\/?>)/gi',
    replaceString: ' ',
  },
  {
    id: 'bme-default-strip-status-current-variable-blocks',
    name: 'Strip status_current_variable blocks and tags',
    findRegex: '/(?:<status_current_variables?\\b[^>]*>[\\s\\S]*?<\\/status_current_variables?>|<status_current_variables?\\b[^>]*\\/?>)/gi',
    replaceString: ' ',
  },
  {
    id: 'bme-default-strip-status-placeholder',
    name: 'Strip StatusPlaceHolderImpl tags',
    findRegex: '/<StatusPlaceHolderImpl\\b[^>]*\\/?>/gi',
    replaceString: ' ',
  },
]);

const MVU_ARTIFACT_RULES = Object.freeze([
  {
    id: 'bme-default-strip-mvu-variable-macros',
    name: 'Strip MVU stat/display/delta variable macros',
    findRegex: '/\\{\\{\\s*(?:get_message_variable::(?:stat_data|display_data|delta_data)(?:\\.[^}]+)?|(?:getvar|setvar|incvar|decvar)::(?:stat_data|display_data|delta_data)(?:\\.[^}]+)?)\\s*\\}\\}/gi',
    replaceString: ' ',
  },
  {
    id: 'bme-default-strip-mvu-stateful-ejs',
    name: 'Strip EJS state access snippets',
    findRegex: '/<%[-=]?[\\s\\S]*?(?:SafeGetValue|getvar\\s*\\(|stat_data|display_data|delta_data)[\\s\\S]*?%>/gi',
    replaceString: ' ',
  },
]);

function withStage(rule, stage, enabled = true) {
  return {
    ...rule,
    source: rule.id,
    stage,
    enabled,
    defaultRule: true,
  };
}

export function getDefaultRegexRules({ includeOutputCleanup = false } = {}) {
  return [
    ...COMMON_POLLUTION_RULES.map((rule) => withStage(rule, input_cleanup)),
    ...MVU_ARTIFACT_RULES.map((rule) => withStage(rule, input_cleanup)),
    ...COMMON_POLLUTION_RULES.map((rule) => withStage(rule, final_tag_cleanup)),
    ...MVU_ARTIFACT_RULES.map((rule) => withStage(rule, final_tag_cleanup)),
    ...(includeOutputCleanup ? COMMON_POLLUTION_RULES.map((rule) => withStage(rule, llm_output_cleanup)) : []),
  ];
}

export function buildRegexRules(settings = {}) {
  const regexSettings = settings.regex ?? {};
  const userRules = Array.isArray(regexSettings.rules) ? regexSettings.rules : [];
  if (regexSettings.enabled === false) {
    return userRules;
  }
  const defaultRules = regexSettings.enableDefaultRules === false
    ? []
    : getDefaultRegexRules({ includeOutputCleanup: regexSettings.enableOutputCleanup === true });
  return [...defaultRules, ...userRules];
}

export default { buildRegexRules, getDefaultRegexRules };
