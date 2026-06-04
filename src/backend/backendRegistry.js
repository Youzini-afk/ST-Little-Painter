import sdWebuiAdapter from './sdWebuiAdapter.js';

const adapters = Object.freeze({
  sdWebui: sdWebuiAdapter,
});

function resolveType(settings = {}, explicitType) {
  return explicitType || settings.backend?.type || 'sdWebui';
}

function resolveAdapter(settings = {}, explicitType) {
  const type = resolveType(settings, explicitType);
  const adapter = adapters[type];

  if (!adapter) {
    throw new Error(`Unsupported image backend: ${type}`);
  }

  return { type, adapter };
}

export function compile(finalPrompt = {}, settings = {}) {
  const { type, adapter } = resolveAdapter(settings);
  return {
    type,
    ...adapter.compile(finalPrompt, settings),
  };
}

export async function generate(compiledRequest = {}, settings = {}) {
  const { adapter } = resolveAdapter(settings, compiledRequest.type);
  return adapter.generate(compiledRequest, settings);
}

export function getBackendTypes() {
  return Object.keys(adapters);
}

export default { compile, generate, getBackendTypes };
