function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeFlags(flags = '') {
  const uniqueFlags = new Set(String(flags).replace(/[^dgimsuvy]/g, '').split(''));
  return [...uniqueFlags].join('');
}

function ensureGlobalFlags(flags = '') {
  const normalized = normalizeFlags(flags);
  return normalized.includes('g') ? normalized : `${normalized}g`;
}

export function parseRegexFromString(value) {
  if (value instanceof RegExp) {
    return new RegExp(value.source, ensureGlobalFlags(value.flags));
  }

  if (value === undefined || value === null || value === '') {
    return null;
  }

  const raw = String(value);
  const literalMatch = raw.match(/^\/(.*)\/([dgimsuvy]*)$/);
  const source = literalMatch ? literalMatch[1] : raw;
  const flags = ensureGlobalFlags(literalMatch ? literalMatch[2] : 'g');

  try {
    return new RegExp(source, flags);
  } catch (error) {
    return null;
  }
}

export function normalizeRule(rule = {}) {
  const findRegex = rule.findRegex ?? rule.find ?? rule.pattern ?? rule.regex ?? '';
  const replaceString = rule.replaceString ?? rule.replace ?? rule.substitute ?? '';

  return {
    ...rule,
    findRegex,
    replaceString: String(replaceString),
    trimStrings: Array.isArray(rule.trimStrings) ? rule.trimStrings.map(String).filter(Boolean) : [],
    enabled: rule.enabled !== false,
    stage: rule.stage ?? rule.stages ?? null,
    source: rule.source ?? rule.id ?? rule.name ?? 'task-regex',
    regex: parseRegexFromString(findRegex),
  };
}

function stageMatches(ruleStage, requestedStage) {
  if (!requestedStage || !ruleStage) {
    return true;
  }

  if (Array.isArray(ruleStage)) {
    return ruleStage.includes(requestedStage);
  }

  return String(ruleStage) === String(requestedStage);
}

function trimConfiguredStrings(text, trimStrings) {
  let output = text;
  let trimmed = 0;

  for (const trimString of trimStrings) {
    if (!trimString) {
      continue;
    }

    const edgePattern = new RegExp(`^(?:${escapeRegExp(trimString)})+|(?:${escapeRegExp(trimString)})+$`, 'g');
    output = output.replace(edgePattern, (match) => {
      trimmed += match.length;
      return '';
    });
  }

  return { text: output, trimmed };
}

export function applyTaskRegex(text, rules = [], { stage } = {}) {
  let output = text === undefined || text === null ? '' : String(text);
  const transforms = [];
  const normalizedRules = Array.isArray(rules) ? rules.map(normalizeRule) : [];

  for (const rule of normalizedRules) {
    if (!rule.enabled || !stageMatches(rule.stage, stage)) {
      continue;
    }

    const before = output;
    let replaced = 0;

    if (rule.regex) {
      rule.regex.lastIndex = 0;
      const matches = output.match(rule.regex);
      replaced = matches ? matches.length : 0;
      rule.regex.lastIndex = 0;
      output = output.replace(rule.regex, rule.replaceString);
    }

    const trimResult = trimConfiguredStrings(output, rule.trimStrings);
    output = trimResult.text;

    if (before !== output) {
      transforms.push({
        source: rule.source,
        stage: stage ?? rule.stage ?? null,
        findRegex: String(rule.findRegex ?? ''),
        replaceString: rule.replaceString,
        replaced,
        trimmed: trimResult.trimmed,
      });
    }
  }

  return { text: output, transforms };
}

export default applyTaskRegex;
