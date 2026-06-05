import assert from 'node:assert/strict';

import { configureSettingsStore, defaultSettings, getSettings, updateSettings } from '../src/host/settingsStore.js';
import { deleteProfile, getActiveProfile, importProfileGroup, saveProfile } from '../src/host/profileStore.js';
import { bindFields, populateFields } from '../src/ui/bindFields.js';
import { addTraceStep, createTrace, finalizeTrace, getTraceById, getTraceHistory } from '../src/debug/trace.js';
import { TRACE_STATUS } from '../src/core/constants.js';
import { createTranslator, getLanguage, getSillyTavernLocale, resolveAutoLanguage } from '../src/ui/i18n.js';

const extension_settings = {};
configureSettingsStore({ extension_settings, saveSettingsDebounced: () => {} });

const settings = getSettings();
assert.equal(settings.ui.activeTab, 'dashboard');
assert.equal(settings.ui.language, 'auto');
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

const trace = createTrace('ui-foundation', { apiKey: 'secret-key' });
addTraceStep(trace, 'step-one', { dataUrl: 'data:image/png;base64,abcdef', visible: true });
finalizeTrace(trace, TRACE_STATUS.SUCCESS, { message: 'done' });
const history = getTraceHistory(1);
assert.equal(history.length, 1);
assert.equal(history[0].metadata.apiKey, '[REDACTED]');
assert.equal(history[0].steps[0].payload.dataUrl, '[REDACTED]');
assert.equal(getTraceById(history[0].id).summary.message, 'done');

const zh = createTranslator({ ui: { language: 'zh' } });
const en = createTranslator({ ui: { language: 'en' } });
globalThis.localStorage = { getItem: (key) => (key === 'language' ? 'en-us' : null) };
assert.equal(getSillyTavernLocale(), 'en-us');
assert.equal(getLanguage({}), 'en');
assert.equal(resolveAutoLanguage('zh-cn'), 'zh');
assert.equal(resolveAutoLanguage('en-gb'), 'en');
delete globalThis.localStorage;
globalThis.document = { documentElement: { lang: 'zh-cn' } };
assert.equal(getLanguage({ ui: { language: 'auto' } }), 'zh');
delete globalThis.document;
assert.equal(zh('generateReply'), '生成配图');
assert.equal(en('generateReply'), 'Generate reply');
assert.equal(zh('loadedResources', { count: 6 }), '已加载 6 个资源。');

console.log('test-ui-foundation passed');
