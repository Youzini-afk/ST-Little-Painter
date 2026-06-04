function budgetValue(budget, key, fallback) {
  if (typeof budget === 'number') {
    return budget;
  }
  return Number(budget?.[key]) || fallback;
}

export function applyTagBudget({ positive = [], negative = [], budget = {} } = {}) {
  const positiveMax = Math.max(1, budgetValue(budget, 'positive', 80));
  const negativeMax = Math.max(1, budgetValue(budget, 'negative', 40));
  const nextPositive = positive.slice(0, positiveMax);
  const nextNegative = negative.slice(0, negativeMax);
  const trace = [];

  if (positive.length > nextPositive.length) {
    trace.push({ type: 'positive', removed: positive.slice(nextPositive.length), reason: 'tag budget' });
  }
  if (negative.length > nextNegative.length) {
    trace.push({ type: 'negative', removed: negative.slice(nextNegative.length), reason: 'tag budget' });
  }

  return { positive: nextPositive, negative: nextNegative, trace };
}

export default applyTagBudget;
