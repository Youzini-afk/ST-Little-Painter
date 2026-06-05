import { SELECTORS } from '../core/constants.js';

export const legacySettingsFields = Object.freeze([
  { selector: SELECTORS.enabled, path: 'enabled', type: 'checkbox' },
  { selector: SELECTORS.autoGenerate, path: 'autoGenerate', type: 'checkbox' },
  { selector: SELECTORS.mode, path: 'mode', type: 'select' },
  { selector: SELECTORS.tagApiUrl, path: 'tagApi.url' },
  { selector: SELECTORS.tagApiKey, path: 'tagApi.key' },
  { selector: SELECTORS.tagApiModel, path: 'tagApi.model' },
  { selector: SELECTORS.backendEnabled, path: 'backend.enabled', type: 'checkbox' },
  { selector: SELECTORS.backendType, path: 'backend.type', type: 'select' },
  { selector: SELECTORS.historyCount, path: 'historyCount', type: 'number', fallback: 8 },
  { selector: SELECTORS.temperature, path: 'temperature', type: 'number', fallback: 0.2 },
  { selector: SELECTORS.maxTokens, path: 'maxTokens', type: 'number', fallback: 1200 },
  { selector: SELECTORS.timeoutMs, path: 'timeoutMs', type: 'number', fallback: 30000 },
  { selector: SELECTORS.retryCount, path: 'retryCount', type: 'number', fallback: 1 },
  { selector: SELECTORS.debugEnabled, path: 'debug.enabled', type: 'checkbox' },
]);

export default { legacySettingsFields };
