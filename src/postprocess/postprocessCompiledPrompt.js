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
  const rawPositive = mergeTags(fixedPositive, compiledPrompt.positiveBlocks, compiledPrompt.positive);
  const rawNegative = mergeTags(fixedNegative, compiledPrompt.negative);
  trace.push({ step: 'flatten', positiveCount: rawPositive.length, negativeCount: rawNegative.length });

  const normalizedPositive = normalizeTags(rawPositive, { aliases });
  const normalizedNegative = normalizeTags(rawNegative, { aliases });
  trace.push({ step: 'normalize-dedupe', positive: normalizedPositive.trace, negative: normalizedNegative.trace });

  const replacedPositive = applyReplacements(normalizedPositive.tags, settings);
  const replacedNegative = applyReplacements(normalizedNegative.tags, settings);
  trace.push({ step: 'replacements', positive: replacedPositive.trace, negative: replacedNegative.trace });

  const finalNormalizedPositive = normalizeTags(replacedPositive.tags, { aliases });
  const finalNormalizedNegative = normalizeTags(replacedNegative.tags, { aliases });
  trace.push({ step: 'normalize-after-replacements', positive: finalNormalizedPositive.trace, negative: finalNormalizedNegative.trace });

  const policyPositive = applyReplacements(finalNormalizedPositive.tags, { ...settings, replacements: [] });
  const policyNegative = applyReplacements(finalNormalizedNegative.tags, { ...settings, replacements: [] });
  trace.push({ step: 'policy-after-normalize', positive: policyPositive.trace, negative: policyNegative.trace });

  const fixedPositiveAfterPolicy = normalizeTags(
    applyReplacements(normalizeTags(fixedPositive, { aliases }).tags, settings).tags,
    { aliases },
  );
  const fixedNegativeAfterPolicy = normalizeTags(
    applyReplacements(normalizeTags(fixedNegative, { aliases }).tags, settings).tags,
    { aliases },
  );

  const conflictedPositive = resolveConflicts(policyPositive.tags, conflicts);
  trace.push({ step: 'conflicts', positive: conflictedPositive.trace });

  const budgeted = applyTagBudget({
    positive: conflictedPositive.tags,
    negative: policyNegative.tags,
    budget: settings.tagBudget,
    fixedPositive: fixedPositiveAfterPolicy.tags,
    fixedNegative: fixedNegativeAfterPolicy.tags,
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
    insertionPlan: compiledPrompt.insertionPlan,
    trace,
  };
}

export default postprocessCompiledPrompt;
