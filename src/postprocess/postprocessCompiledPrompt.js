import { loadAliases } from '../dictionary/tagNormalize.js';
import { loadConflicts, resolveConflicts } from '../dictionary/tagConflicts.js';
import { flattenTags, mergeTags } from './mergeTags.js';
import { normalizeTags } from './normalizeTags.js';
import { applyReplacements } from './applyReplacements.js';
import { applyTagBudget } from './tagBudget.js';
import { compilePrompt } from './compilePrompt.js';

function ensureArray(value) {
  return flattenTags(value);
}

export async function postprocessCompiledPrompt(compiledPrompt = {}, { settings = {} } = {}) {
  const aliases = await loadAliases();
  const conflicts = await loadConflicts();
  const trace = [];

  const fixedPositive = ensureArray(settings.fixedPositive);
  const fixedNegative = ensureArray(settings.fixedNegative);
  const rawPositive = mergeTags(compiledPrompt.positiveBlocks, compiledPrompt.positive, fixedPositive);
  const rawNegative = mergeTags(compiledPrompt.negative, fixedNegative);
  trace.push({ step: 'flatten', positiveCount: rawPositive.length, negativeCount: rawNegative.length });

  const replacedPositive = applyReplacements(rawPositive, settings);
  const replacedNegative = applyReplacements(rawNegative, settings);
  trace.push({ step: 'replacements', positive: replacedPositive.trace, negative: replacedNegative.trace });

  const normalizedPositive = normalizeTags(replacedPositive.tags, { aliases });
  const normalizedNegative = normalizeTags(replacedNegative.tags, { aliases });
  trace.push({ step: 'normalize-dedupe', positive: normalizedPositive.trace, negative: normalizedNegative.trace });

  const conflictedPositive = resolveConflicts(normalizedPositive.tags, conflicts);
  trace.push({ step: 'conflicts', positive: conflictedPositive.trace });

  const budgeted = applyTagBudget({
    positive: conflictedPositive.tags,
    negative: normalizedNegative.tags,
    budget: settings.tagBudget,
  });
  trace.push({ step: 'budget', changes: budgeted.trace });

  const finalPrompt = compilePrompt({ positive: budgeted.positive, negative: budgeted.negative });

  return {
    shouldGenerate: compiledPrompt.shouldGenerate !== false,
    positiveTags: budgeted.positive,
    negativeTags: budgeted.negative,
    positive: finalPrompt.positive,
    negative: finalPrompt.negative,
    warnings: Array.isArray(compiledPrompt.warnings) ? compiledPrompt.warnings : [],
    params: compiledPrompt.params ?? {},
    trace,
  };
}

export default postprocessCompiledPrompt;
