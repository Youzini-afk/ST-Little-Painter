import assert from 'node:assert/strict';
import { compile as compileBackend, generate as generateBackend, getBackendTypes } from '../src/backend/backendRegistry.js';
import * as novelaiAdapter from '../src/backend/novelaiAdapter.js';
import * as comfyuiAdapter from '../src/backend/comfyuiAdapter.js';
import * as naturalImageAdapter from '../src/backend/naturalImageAdapter.js';

const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const previousFetch = globalThis.fetch;

function jsonResponse(body, init = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: { get: (name) => init.headers?.[name.toLowerCase()] || init.headers?.[name] || 'application/json' },
    async text() { return JSON.stringify(body); },
  };
}

function binaryImageResponse(base64 = PNG_B64, headers = { 'content-type': 'image/png' }) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name) => headers[name.toLowerCase()] || headers[name] || '' },
    async arrayBuffer() { return Buffer.from(base64, 'base64'); },
    async text() { return Buffer.from(base64, 'base64').toString('binary'); },
  };
}

function textResponse(text, init = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: { get: (name) => init.headers?.[name.toLowerCase()] || init.headers?.[name] || 'text/plain' },
    async text() { return text; },
  };
}

function imageResponse(base64 = PNG_B64) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? 'image/png' : '') },
    async arrayBuffer() { return Buffer.from(base64, 'base64'); },
    async text() { return base64; },
  };
}

try {
  assert.deepEqual(getBackendTypes().sort(), ['comfyui', 'naturalImage', 'novelai', 'sdWebui'].sort());

  const finalPrompt = { positive: '1girl, forest', negative: 'bad hands' };

  const novelCompiled = novelaiAdapter.compile(finalPrompt, {
    novelai: {
      url: 'https://novel.test/',
      apiKey: 'nai-key',
      model: 'nai-test',
      sampler: 'k_euler',
      scheduler: 'karras',
      width: 640,
      height: 960,
      steps: 20,
      scale: 6,
      seed: 123,
      ucPreset: 1,
      qualityToggle: false,
      sm: true,
      smDyn: true,
      dynamicThresholding: true,
      cfgRescale: 0.2,
      negativePrompt: 'low quality',
    },
  });
  assert.equal(novelCompiled.endpoint, 'https://novel.test/ai/generate-image');
  assert.equal(novelCompiled.payload.input, '1girl, forest');
  assert.equal(novelCompiled.payload.model, 'nai-test');
  assert.equal(novelCompiled.payload.parameters.negative_prompt, 'low quality, bad hands');
  assert.equal(novelCompiled.payload.parameters.width, 640);
  assert.equal(novelCompiled.payload.parameters.seed, 123);
  assert.equal(novelCompiled.payload.parameters.sm_dyn, true);
  assert.equal(novelCompiled.payload.parameters.dynamic_thresholding, true);
  assert.equal(novelCompiled.payload.parameters.cfg_rescale, 0.2);

  const novelCalls = [];
  globalThis.fetch = async (url, options = {}) => {
    novelCalls.push({ url, options });
    return jsonResponse({ data: [{ b64_json: PNG_B64 }] });
  };
  const novelResult = await novelaiAdapter.generate(novelCompiled, { novelai: { apiKey: 'nai-key' }, timeoutMs: 1000 });
  assert.equal(novelCalls[0].url, 'https://novel.test/ai/generate-image');
  assert.equal(novelCalls[0].options.method, 'POST');
  assert.equal(novelCalls[0].options.headers.Authorization, 'Bearer nai-key');
  assert.equal(JSON.parse(novelCalls[0].options.body).model, 'nai-test');
  assert.equal(novelResult.backendType, 'novelai');
  assert.equal(novelResult.base64, PNG_B64);

  globalThis.fetch = async () => binaryImageResponse();
  const novelBinary = await novelaiAdapter.generate(novelCompiled, { novelai: { apiKey: 'nai-key' }, timeoutMs: 1000 });
  assert.equal(novelBinary.mimeType, 'image/png');
  assert.equal(novelBinary.base64, PNG_B64);

  const workflowJson = JSON.stringify({
    '1': { class_type: 'KSampler', inputs: { text: '{{positive}}', width: '{{width}}', height: '{{height}}' } },
    '2': { class_type: 'CLIPTextEncode', inputs: { text: '{{negative}}', steps: '{{steps}}', cfg: '{{cfg}}', seed: '{{seed}}' } },
    '3': { class_type: 'CheckpointLoaderSimple', inputs: { sampler_name: '{{sampler}}', scheduler: '{{scheduler}}', ckpt_name: '{{model}}', vae_name: '{{vae}}', clip_name: '{{clip}}', lora_name: '{{lora}}' } },
  });
  const comfyCompiled = comfyuiAdapter.compile(finalPrompt, {
    comfyui: {
      url: 'http://comfy.test/',
      workflowJson,
      width: 512,
      height: 768,
      steps: 12,
      cfg: 5.5,
      seed: 321,
      sampler: 'dpmpp_2m',
      scheduler: 'sgm_uniform',
      model: 'model.safetensors',
      vae: 'vae.safetensors',
      clip: 'clip.safetensors',
      placeholders: { lora: 'custom-lora.safetensors' },
    },
  });
  assert.equal(comfyCompiled.endpoint, 'http://comfy.test/prompt');
  assert.equal(comfyCompiled.payload.prompt['1'].inputs.text, '1girl, forest');
  assert.equal(comfyCompiled.payload.prompt['1'].inputs.width, 512);
  assert.equal(comfyCompiled.payload.prompt['1'].inputs.height, 768);
  assert.equal(comfyCompiled.payload.prompt['2'].inputs.text, 'bad hands');
  assert.equal(comfyCompiled.payload.prompt['2'].inputs.steps, 12);
  assert.equal(comfyCompiled.payload.prompt['2'].inputs.cfg, 5.5);
  assert.equal(comfyCompiled.payload.prompt['3'].inputs.sampler_name, 'dpmpp_2m');
  assert.equal(comfyCompiled.payload.prompt['3'].inputs.lora_name, 'custom-lora.safetensors');

  const comfyCalls = [];
  globalThis.fetch = async (url, options = {}) => {
    comfyCalls.push({ url, options });
    if (url === 'http://comfy.test/prompt') {
      return jsonResponse({ prompt_id: 'prompt-1' });
    }
    if (url === 'http://comfy.test/history/prompt-1') {
      return jsonResponse({
        'prompt-1': {
          outputs: {
            '9': { images: [{ filename: 'out.png', subfolder: 'sub', type: 'output' }] },
          },
        },
      });
    }
    assert.match(url, /^http:\/\/comfy\.test\/view\?/);
    assert.match(url, /filename=out\.png/);
    assert.match(url, /subfolder=sub/);
    assert.match(url, /type=output/);
    return imageResponse();
  };
  const comfyResult = await comfyuiAdapter.generate(comfyCompiled, { comfyui: { pollIntervalMs: 0, maxPolls: 1 }, timeoutMs: 1000 });
  assert.equal(comfyCalls.length, 3);
  assert.equal(comfyResult.backendType, 'comfyui');
  assert.equal(comfyResult.promptId, 'prompt-1');
  assert.equal(comfyResult.base64, PNG_B64);

  const naturalCompiled = naturalImageAdapter.compile(finalPrompt, {
    naturalImage: {
      providerMode: 'openaiImages',
      url: 'https://images.test/v1/',
      apiKey: 'img-key',
      model: 'image-model',
      width: 512,
      height: 512,
      instructionPrefix: 'Paint this scene.',
      instructionSuffix: 'Cinematic.',
    },
  });
  assert.equal(naturalCompiled.endpoint, 'https://images.test/v1/images/generations');
  assert.equal(naturalCompiled.payload.prompt, 'Paint this scene.\n1girl, forest\nAvoid: bad hands\nCinematic.');
  assert.equal(naturalCompiled.payload.size, '512x512');

  globalThis.fetch = async () => jsonResponse({ data: [{ b64_json: PNG_B64 }] });
  const naturalB64 = await naturalImageAdapter.generate(naturalCompiled, { naturalImage: { apiKey: 'img-key' }, timeoutMs: 1000 });
  assert.equal(naturalB64.backendType, 'naturalImage');
  assert.equal(naturalB64.base64, PNG_B64);

  let naturalUrlFetchCount = 0;
  globalThis.fetch = async (url) => {
    naturalUrlFetchCount += 1;
    if (url === 'https://cdn.test/out.png') return imageResponse();
    return jsonResponse({ data: [{ url: 'https://cdn.test/out.png' }] });
  };
  const naturalUrl = await naturalImageAdapter.generate(naturalCompiled, { naturalImage: { apiKey: 'img-key' }, timeoutMs: 1000 });
  assert.equal(naturalUrl.url, 'https://cdn.test/out.png');
  assert.equal(naturalUrl.base64, PNG_B64);
  assert.equal(naturalUrlFetchCount, 2);

  const chatCompiled = naturalImageAdapter.compile(finalPrompt, {
    naturalImage: { providerMode: 'chatMarkdownImage', url: 'https://chat.test/v1', chatModel: 'chat-image' },
  });
  assert.equal(chatCompiled.endpoint, 'https://chat.test/v1/chat/completions');
  assert.equal(chatCompiled.payload.model, 'chat-image');
  globalThis.fetch = async () => textResponse(JSON.stringify({ choices: [{ message: { content: `Here it is: ![image](data:image/png;base64,${PNG_B64})` } }] }));
  const naturalMarkdown = await naturalImageAdapter.generate(chatCompiled, { naturalImage: { apiKey: 'img-key' }, timeoutMs: 1000 });
  assert.equal(naturalMarkdown.base64, PNG_B64);

  const registryCompiled = compileBackend(finalPrompt, {
    backend: { type: 'naturalImage' },
    naturalImage: { providerMode: 'openaiImages', url: 'https://registry.test/v1' },
  });
  assert.equal(registryCompiled.type, 'naturalImage');
  globalThis.fetch = async () => jsonResponse({ data: [{ b64_json: PNG_B64 }] });
  const registryResult = await generateBackend(registryCompiled, { naturalImage: {}, timeoutMs: 1000 });
  assert.equal(registryResult.backendType, 'naturalImage');
} finally {
  if (previousFetch === undefined) delete globalThis.fetch;
  else globalThis.fetch = previousFetch;
}

console.log('test-backend-adapters passed');
