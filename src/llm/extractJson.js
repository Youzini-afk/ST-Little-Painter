function tryParse(candidate, errors) {
  try {
    return JSON.parse(candidate);
  } catch (error) {
    errors.push(error?.message || String(error));
    return undefined;
  }
}

function scanJson(text, startIndex) {
  const open = text[startIndex];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return '';
}

export function extractJson(text) {
  const source = String(text ?? '');
  const errors = [];
  const fencePattern = /```(?:json)?\s*([\s\S]*?)```/gi;
  let fenceMatch;

  while ((fenceMatch = fencePattern.exec(source))) {
    const parsed = tryParse(fenceMatch[1].trim(), errors);
    if (parsed !== undefined) {
      return { parsed, raw: fenceMatch[1].trim(), errors };
    }
  }

  const whole = tryParse(source.trim(), errors);
  if (whole !== undefined) {
    return { parsed: whole, raw: source.trim(), errors };
  }

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== '{' && source[index] !== '[') {
      continue;
    }

    const candidate = scanJson(source, index);
    if (!candidate) {
      continue;
    }

    const parsed = tryParse(candidate, errors);
    if (parsed !== undefined) {
      return { parsed, raw: candidate, errors };
    }
  }

  return { parsed: null, raw: '', errors: errors.length ? errors : ['No JSON object or array found.'] };
}

export default extractJson;
