function getPathValue(source = {}, path = '') {
  return String(path).split('.').filter(Boolean).reduce((value, key) => value?.[key], source);
}

function setPathValue(target = {}, path = '', value) {
  const parts = String(path).split('.').filter(Boolean);
  if (!parts.length) return target;
  const root = { ...target };
  let cursor = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    cursor[key] = Array.isArray(cursor[key]) ? [...cursor[key]] : { ...(cursor[key] ?? {}) };
    cursor = cursor[key];
  }
  cursor[parts.at(-1)] = value;
  return root;
}

function coerceValue(element, field) {
  const type = field.type || element.type;
  if (type === 'checkbox') return Boolean(element.checked);
  if (type === 'number' || type === 'range') {
    const number = Number(element.value);
    return Number.isFinite(number) ? number : field.fallback;
  }
  if (type === 'json') {
    return JSON.parse(element.value || field.emptyJson || '{}');
  }
  if (type === 'array') {
    return String(element.value || '').split('\n').map((item) => item.trim()).filter(Boolean);
  }
  return element.value;
}

function writeElementValue(element, field, value) {
  const type = field.type || element.type;
  if (type === 'checkbox') {
    element.checked = Boolean(value);
    return;
  }
  if (type === 'json') {
    element.value = JSON.stringify(value ?? {}, null, 2);
    return;
  }
  if (type === 'array') {
    element.value = Array.isArray(value) ? value.join('\n') : String(value ?? '');
    return;
  }
  element.value = value ?? '';
}

export function populateFields({ fields = [], getSettings }) {
  const settings = getSettings();
  fields.forEach((field) => {
    const element = document.querySelector(field.selector);
    if (!element) return;
    const value = typeof field.read === 'function'
      ? field.read(settings)
      : getPathValue(settings, field.path);
    writeElementValue(element, field, value);
  });
}

export function bindFields({ fields = [], getSettings, updateSettings, saveSettings, onChange }) {
  fields.forEach((field) => {
    const element = document.querySelector(field.selector);
    if (!element || element.dataset.stlpFieldBound === 'true') return;
    element.dataset.stlpFieldBound = 'true';
    element.addEventListener(field.event || 'change', () => {
      const rawValue = coerceValue(element, field);
      const value = typeof field.transform === 'function' ? field.transform(rawValue, { element, field }) : rawValue;
      const next = typeof field.write === 'function'
        ? field.write(getSettings(), value)
        : setPathValue(getSettings(), field.path, value);
      updateSettings(next);
      saveSettings();
      onChange?.({ field, value, settings: next });
    });
  });
}

export default { bindFields, populateFields };
