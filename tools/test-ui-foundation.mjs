import assert from 'node:assert/strict';

import { configureSettingsStore, defaultSettings, getSettings, updateSettings } from '../src/host/settingsStore.js';
import { deleteProfile, getActiveProfile, importProfileGroup, saveProfile } from '../src/host/profileStore.js';
import { bindFields, populateFields } from '../src/ui/bindFields.js';

const extension_settings = {};
configureSettingsStore({ extension_settings, saveSettingsDebounced: () => {} });

const settings = getSettings();
assert.equal(settings.ui.activeTab, 'dashboard');
assert.equal(settings.tagApi.jsonMode, 'auto');
assert.equal(settings.sdWebui.hiresFix.enabled, false);
assert.equal(settings.knowledge.dictionaryHints, true);
assert.equal(defaultSettings.novelai.qualityToggle, true);

let next = saveProfile(settings, 'profiles', 'portrait', { compilerProfileId: 'sd', fixedPositive: ['portrait'] });
assert.equal(next.profiles.active, 'portrait');
assert.deepEqual(getActiveProfile(next, 'profiles').fixedPositive, ['portrait']);
next = deleteProfile(next, 'profiles', 'portrait');
assert.equal(next.profiles.list.portrait, undefined);
next = importProfileGroup(next, 'tagApiProfiles', '{"active":"local","list":{"local":{"model":"tagger"}}}');
assert.equal(next.tagApiProfiles.active, 'local');
assert.equal(next.tagApiProfiles.list.local.model, 'tagger');

const elements = new Map();
function makeElement(type = 'text') {
  const listeners = {};
  return {
    type,
    value: '',
    checked: false,
    dataset: {},
    addEventListener(event, handler) { listeners[event] = handler; },
    dispatch(event = 'change') { listeners[event]?.(); },
  };
}
elements.set('#enabled', makeElement('checkbox'));
elements.set('#count', makeElement('number'));
globalThis.document = { querySelector: (selector) => elements.get(selector) ?? null };

updateSettings({ enabled: false, historyCount: 3 });
populateFields({ fields: [
  { selector: '#enabled', path: 'enabled', type: 'checkbox' },
  { selector: '#count', path: 'historyCount', type: 'number' },
], getSettings });
assert.equal(elements.get('#enabled').checked, false);
assert.equal(elements.get('#count').value, 3);

bindFields({
  fields: [{ selector: '#count', path: 'historyCount', type: 'number', fallback: 8 }],
  getSettings,
  updateSettings,
  saveSettings: () => {},
});
elements.get('#count').value = '14';
elements.get('#count').dispatch();
assert.equal(getSettings().historyCount, 14);

delete globalThis.document;
console.log('test-ui-foundation passed');
