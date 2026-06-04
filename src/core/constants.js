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
  backendEnabled: '#stlp-backend-enabled',
  backendType: '#stlp-backend-type',
  sdWebuiUrl: '#stlp-sdwebui-url',
  sdWebuiUsername: '#stlp-sdwebui-username',
  sdWebuiPassword: '#stlp-sdwebui-password',
  sdWebuiWidth: '#stlp-sdwebui-width',
  sdWebuiHeight: '#stlp-sdwebui-height',
  sdWebuiSteps: '#stlp-sdwebui-steps',
  sdWebuiCfgScale: '#stlp-sdwebui-cfg-scale',
  sdWebuiSampler: '#stlp-sdwebui-sampler',
  sdWebuiSeed: '#stlp-sdwebui-seed',
  sdWebuiRestoreFaces: '#stlp-sdwebui-restore-faces',
  sdWebuiSendNegative: '#stlp-sdwebui-send-negative',
  historyCount: '#stlp-history-count',
  temperature: '#stlp-temperature',
  maxTokens: '#stlp-max-tokens',
  timeoutMs: '#stlp-timeout-ms',
  retryCount: '#stlp-retry-count',
  debugEnabled: '#stlp-debug-enabled',
  manualGenerate: '#stlp-manual-generate',
  exportTrace: '#stlp-export-trace',
  traceOutput: '#stlp-trace-output',
  imagePreviewList: '#stlp-image-preview-list',
});

export const TRACE_STATUS = Object.freeze({
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
});
