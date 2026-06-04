export function compilePrompt({ positive = [], negative = [], delimiter = ', ' } = {}) {
  return {
    positive: positive.filter(Boolean).join(delimiter),
    negative: negative.filter(Boolean).join(delimiter),
  };
}

export default compilePrompt;
