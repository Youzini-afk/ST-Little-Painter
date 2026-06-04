function budgetValue(budget, key, fallback) {
  if (typeof budget === 'number') {
    return budget;
  }
  return Number(budget?.[key]) || fallback;
}

function uniqueTags(tags = []) {
  const seen = new Set();
  const result = [];
  for (const tag of tags) {
    const key = String(tag ?? '').toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(tag);
  }
  return result;
}

function applyBudgetWithFixed(tags = [], fixedTags = [], max, type, trace) {
  const fixed = uniqueTags(fixedTags);
  const fixedKeys = new Set(fixed.map((tag) => String(tag).toLowerCase()));
  const dynamic = tags.filter((tag) => !fixedKeys.has(String(tag ?? '').toLowerCase()));
  const dynamicMax = Math.max(0, max - fixed.length);
  const keptDynamic = dynamic.slice(0, dynamicMax);

  if (dynamic.length > keptDynamic.length) {
    trace.push({ type, removed: dynamic.slice(keptDynamic.length), reason: 'tag budget' });
  }

  return [...fixed, ...keptDynamic];
}

export function applyTagBudget({ positive = [], negative = [], budget = {}, fixedPositive = [], fixedNegative = [] } = {}) {
  const positiveMax = Math.max(1, budgetValue(budget, 'positive', 80));
  const negativeMax = Math.max(1, budgetValue(budget, 'negative', 40));
  const trace = [];
  const nextPositive = applyBudgetWithFixed(positive, fixedPositive, positiveMax, 'positive', trace);
  const nextNegative = applyBudgetWithFixed(negative, fixedNegative, negativeMax, 'negative', trace);

  return { positive: nextPositive, negative: nextNegative, trace };
}

export default applyTagBudget;
