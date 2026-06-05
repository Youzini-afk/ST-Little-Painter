function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normalizeName(name, fallback = 'default') {
  return String(name || fallback).trim() || fallback;
}

export function getProfileGroup(settings = {}, groupKey) {
  const group = settings?.[groupKey] && typeof settings[groupKey] === 'object' ? settings[groupKey] : {};
  const list = group.list && typeof group.list === 'object' ? group.list : {};
  const active = normalizeName(group.active, Object.keys(list)[0] || 'default');
  return { active, list: clone(list) || {} };
}

export function getActiveProfile(settings = {}, groupKey) {
  const group = getProfileGroup(settings, groupKey);
  return clone(group.list[group.active] ?? null);
}

export function saveProfile(settings = {}, groupKey, name, profile) {
  const group = getProfileGroup(settings, groupKey);
  const key = normalizeName(name, group.active);
  return {
    ...settings,
    [groupKey]: {
      active: key,
      list: {
        ...group.list,
        [key]: clone(profile) ?? {},
      },
    },
  };
}

export function deleteProfile(settings = {}, groupKey, name) {
  const group = getProfileGroup(settings, groupKey);
  const key = normalizeName(name, group.active);
  const nextList = { ...group.list };
  delete nextList[key];
  const nextActive = Object.keys(nextList)[0] || 'default';
  return {
    ...settings,
    [groupKey]: {
      active: nextActive,
      list: nextList,
    },
  };
}

export function exportProfileGroup(settings = {}, groupKey) {
  return JSON.stringify(getProfileGroup(settings, groupKey), null, 2);
}

export function importProfileGroup(settings = {}, groupKey, text) {
  const parsed = JSON.parse(String(text || '{}'));
  const list = parsed.list && typeof parsed.list === 'object' ? parsed.list : parsed;
  const active = normalizeName(parsed.active, Object.keys(list)[0] || 'default');
  return {
    ...settings,
    [groupKey]: {
      active,
      list: clone(list) || {},
    },
  };
}

export default {
  deleteProfile,
  exportProfileGroup,
  getActiveProfile,
  getProfileGroup,
  importProfileGroup,
  saveProfile,
};
