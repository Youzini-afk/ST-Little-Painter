export const EXTENSION_NAME = 'ST-Little Painter';
export const EXTENSION_ID = 'ST-Little_Painter';
export const SETTINGS_KEY = 'ST-Little_Painter';
export const TRACE_LIMIT = 20;

export const SELECTORS = Object.freeze({
  settingsRoot: '#st-little-painter-settings',
  enabled: '#stlp-enabled',
  autoGenerate: '#stlp-auto-generate',
  mode: '#stlp-mode',
  tagApiUrl: '#stlp-tag-api-url',
  tagApiKey: '#stlp-tag-api-key',
  tagApiModel: '#stlp-tag-api-model',
  debugEnabled: '#stlp-debug-enabled',
  manualGenerate: '#stlp-manual-generate',
  exportTrace: '#stlp-export-trace',
  traceOutput: '#stlp-trace-output',
});

export const TRACE_STATUS = Object.freeze({
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
});
