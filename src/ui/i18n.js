export const UI_LANGUAGES = Object.freeze({
  AUTO: 'auto',
  ZH: 'zh',
  EN: 'en',
});

const EXTRA_STRINGS = Object.freeze({
  zh: {
    fetchModels: '拉取模型',
    fetchModelsHint: '从当前 Tag API 端点拉取 /models 列表。',
    fetchingModels: '正在拉取模型列表…',
    loadedModels: '已加载 {count} 个模型。',
  },
  en: {
    fetchModels: 'Fetch models',
    fetchModelsHint: 'Fetch the /models list from the current Tag API endpoint.',
    fetchingModels: 'Fetching model list…',
    loadedModels: 'Loaded {count} models.',
  },
});

const STRINGS = Object.freeze({
  zh: {
    dashboard: '总览',
    tagApi: '标签 API',
    compiler: '编译器',
    backends: '后端',
    knowledge: '知识',
    regex: '正则',
    debug: '调试',
    settings: '设置',
    docs: '文档',
    enabled: '已启用',
    backend: '后端',
    mode: '模式',
    ready: '就绪',
    generateReply: '生成配图',
    testCompile: '测试编译',
    closeConsole: '关闭 Little Painter 控制台',
    pipelineReadiness: '流水线状态',
    tagApiConnected: '标签 API 已连接',
    worldbookEntries: '世界书 9 条',
    dictionaryHints: '词典 56 条提示',
    compiledVisualBrief: '视觉标签摘要',
    openCompiler: '打开编译器',
    insertionTarget: '插入目标',
    pickTarget: '选择目标',
    renderOnlyNote: '仅渲染插图；聊天正文不会被修改。',
    recentGeneration: '最近生成',
    configurationLaunchers: '配置入口',
    open: '打开',
    backendConfiguration: '后端配置',
    sdAdapter: 'SD WebUI / Forge 适配器',
    apiUrl: 'API 地址',
    username: '用户名',
    password: '密码',
    timeout: '超时',
    refreshResources: '刷新资源',
    sdResourceHelp: '从当前 SD 端点拉取模型 / 采样器 / VAE / 调度器 / 放大器 / LoRA 列表。',
    resources: '资源',
    loaded: '已加载',
    model: '模型',
    vae: 'VAE',
    sampler: '采样器',
    scheduler: '调度器',
    upscaler: '放大器',
    loraSearch: 'LoRA 搜索',
    connection: '连接',
    generationDefaults: '生成默认值',
    settingsOwnedParams: '参数由插件设置控制',
    width: '宽度',
    height: '高度',
    steps: '步数',
    cfg: 'CFG',
    seed: '种子',
    clipSkip: 'CLIP skip',
    hiresScale: '高清修复倍率',
    denoise: '重绘幅度',
    payloadPreview: 'Payload 预览',
    secondApiEndpoint: '第二 API 端点',
    apiKey: 'API Key',
    jsonMode: 'JSON 模式',
    temperature: '温度',
    maxTokens: '最大 Token',
    retries: '重试次数',
    testApiCompile: '测试 API / 编译',
    responseContract: '返回格式约定',
    diagnostics: '诊断',
    jsonFallbackAware: '支持 JSON fallback',
    promptCompiler: '提示词编译器',
    modeAndProfile: '模式与提示词档案',
    runCompileTest: '运行编译测试',
    promptProfile: '提示词档案',
    targetMode: '目标模式',
    fixedPositive: '固定正向',
    fixedNegative: '固定负向',
    compiledPromptPreview: 'CompiledPrompt 预览',
    orderedMessages: '有序标签器消息',
    openLatestTrace: '测试后查看最新 trace',
    knowledgeRuntime: '知识运行时',
    bmeResolver: 'BME 世界书解析器',
    testResolve: '测试解析',
    retrievalPreview: '检索预览',
    skillSelector: '技能选择器',
    contextRegexCleanup: '上下文正则清理',
    defaultRules: 'BME 风格默认规则',
    customRules: '自定义规则',
    liveCleanupTest: '实时清理测试',
    debugTrace: '调试 Trace',
    pipelineTimeline: '流水线时间线',
    latestTraceSummary: '最新 Trace 摘要',
    insertionDebug: '插图插入诊断',
    noTrace: '暂无 trace',
    refreshingResources: '正在刷新 SD WebUI 资源…',
    pipelineUnavailable: '当前上下文中没有可用的流水线运行器。',
    runningGeneration: '正在运行完整生成…',
    runningCompile: '正在运行编译 dry-run…',
    generationDone: '生成完成；最新 trace 已保存。',
    compileDone: '编译 dry-run 完成；最新 trace 已保存。',
    wandLabel: 'Little Painter',
    stageContext: '上下文',
    stageWorldbook: '世界书',
    stagePlanner: '规划器',
    stageTagger: '标签器',
    stageCompile: '编译',
    stageBackend: '后端',
    stageInsert: '插入',
    subjectLine: '主体：1girl, upper body',
    identityLine: '身份：silver hair, red eyes, kimono',
    sceneLine: '场景：rainy bedroom, window',
    cameraLine: '镜头：portrait, backlighting',
    sampleQuote: '她坐在窗边，看着雨幕。',
    saved: '已保存',
    editableComboboxes: '可编辑下拉',
    txt2imgRoute: 'txt2img 路由',
    forgeCompatible: '兼容 Forge',
    basicAuth: 'Basic Auth',
    hiresFix: '高清修复',
    restoreFaces: '面部修复',
    endpointUrl: '端点 URL',
    timeoutMs: '超时毫秒',
    compileTraceHint: '运行编译测试后会写入最新 trace。',
    backendParamsNotRequested: '不要求模型返回后端参数',
    send: '发送',
    receive: '接收',
    parse: '解析',
    validate: '校验',
    latestAssistantAnchor: 'anchorQuote 必须逐字复制最新 AI 回复中的短句',
    fallbackAfterMessage: 'fallback after_message',
    planner: '规划器',
    dictionaryHintsShort: '词典提示',
    bmeWorldbook: 'BME 世界书',
    defaultRegexShort: '默认正则',
    beforeVisualFacts: 'Before：视觉事实',
    atDepthRoleKept: 'At-depth：保留原始角色',
    afterPromptTail: 'After：提示尾部',
    activatedOnly: '诊断：只展示激活条目',
    worldbook: '世界书',
    filter: '过滤',
    maxPasses: '最大轮次',
    inputCleanup: '输入清理',
    outputCleanup: 'LLM 输出清理',
    cleanupOrder: '顺序：MVU → 默认 → 图像/HTML → 自定义',
    summaryDebug: '摘要调试',
    redactedPayloads: '敏感内容已脱敏',
    imageRecordsCapped: '图像记录限量保存',
    idle: '空闲',
    loadedResources: '已加载 {count} 个资源。',
    fetchModels: '拉取模型',
    fetchModelsHint: '从当前 Tag API 端点拉取 /models 列表。',
    fetchingModels: '正在拉取模型列表…',
    loadedModels: '已加载 {count} 个模型。',
  },
  en: {
    dashboard: 'Dashboard', tagApi: 'Tag API', compiler: 'Compiler', backends: 'Backends', knowledge: 'Knowledge', regex: 'Regex', debug: 'Debug', settings: 'Settings', docs: 'Docs', enabled: 'Enabled', backend: 'Backend', mode: 'Mode', ready: 'ready', generateReply: 'Generate reply', testCompile: 'Test compile', closeConsole: 'Close Little Painter console', pipelineReadiness: 'Pipeline readiness', tagApiConnected: 'Tag API connected', worldbookEntries: 'Worldbook 9 entries', dictionaryHints: 'Dictionary 56 hints', compiledVisualBrief: 'Compiled visual brief', openCompiler: 'Open compiler', insertionTarget: 'Insertion target', pickTarget: 'Pick target', renderOnlyNote: 'Render-only image insertion; chat text remains unchanged.', recentGeneration: 'Recent generation', configurationLaunchers: 'Configuration launchers', open: 'open', backendConfiguration: 'Backend Configuration', sdAdapter: 'SD WebUI / Forge adapter', apiUrl: 'API URL', username: 'Username', password: 'Password', timeout: 'Timeout', refreshResources: 'Refresh resources', sdResourceHelp: 'Fetch model / sampler / VAE / scheduler / upscaler / LoRA lists from the active SD endpoint.', resources: 'Resources', loaded: 'loaded', model: 'Model', vae: 'VAE', sampler: 'Sampler', scheduler: 'Scheduler', upscaler: 'Upscaler', loraSearch: 'LoRA search', connection: 'Connection', generationDefaults: 'Generation defaults', settingsOwnedParams: 'settings-owned params', width: 'Width', height: 'Height', steps: 'Steps', cfg: 'CFG', seed: 'Seed', clipSkip: 'CLIP skip', hiresScale: 'Hires scale', denoise: 'Denoise', payloadPreview: 'Payload preview', secondApiEndpoint: 'Second API endpoint', apiKey: 'API key', jsonMode: 'JSON mode', temperature: 'Temperature', maxTokens: 'Max tokens', retries: 'Retries', testApiCompile: 'Test API / compile', responseContract: 'Response contract', diagnostics: 'Diagnostics', jsonFallbackAware: 'JSON fallback aware', promptCompiler: 'Prompt Compiler', modeAndProfile: 'Mode and prompt profile', runCompileTest: 'Run compile test', promptProfile: 'Prompt profile', targetMode: 'Target mode', fixedPositive: 'Fixed positive', fixedNegative: 'Fixed negative', compiledPromptPreview: 'CompiledPrompt preview', orderedMessages: 'Ordered tagger prompt messages', openLatestTrace: 'Open latest trace after test', knowledgeRuntime: 'Knowledge Runtime', bmeResolver: 'BME worldbook resolver', testResolve: 'Test resolve', retrievalPreview: 'Retrieval preview', skillSelector: 'Skill selector', contextRegexCleanup: 'Context Regex Cleanup', defaultRules: 'BME-inspired default rules', customRules: 'Custom rules', liveCleanupTest: 'Live cleanup test', debugTrace: 'Debug Trace', pipelineTimeline: 'Pipeline timeline', latestTraceSummary: 'Latest trace summary', insertionDebug: 'Image insertion debug', noTrace: 'No trace yet', refreshingResources: 'Refreshing SD WebUI resources…', pipelineUnavailable: 'Pipeline runner is not available in this context.', runningGeneration: 'Running full generation…', runningCompile: 'Running compile dry-run…', generationDone: 'Generation completed; latest trace saved.', compileDone: 'Compile dry-run completed; latest trace saved.', wandLabel: 'Little Painter', stageContext: 'Context', stageWorldbook: 'Worldbook', stagePlanner: 'Planner', stageTagger: 'Tagger', stageCompile: 'Compile', stageBackend: 'Backend', stageInsert: 'Insert', subjectLine: 'Subject: 1girl, upper body', identityLine: 'Identity: silver hair, red eyes, kimono', sceneLine: 'Scene: rainy bedroom, window', cameraLine: 'Camera: portrait, backlighting', sampleQuote: 'She sat by the window, watching the rain.', saved: 'saved', editableComboboxes: 'editable comboboxes', txt2imgRoute: 'txt2img route', forgeCompatible: 'Forge compatible', basicAuth: 'Basic Auth', hiresFix: 'hires fix', restoreFaces: 'restore faces', endpointUrl: 'Endpoint URL', timeoutMs: 'Timeout ms', compileTraceHint: 'Run a compile test to populate the latest trace.', backendParamsNotRequested: 'backend params not requested', send: 'Send', receive: 'Receive', parse: 'Parse', validate: 'Validate', latestAssistantAnchor: 'anchorQuote copied exactly from the latest AI reply', fallbackAfterMessage: 'fallback after_message', planner: 'planner', dictionaryHintsShort: 'dictionary hints', bmeWorldbook: 'BME worldbook', defaultRegexShort: 'default regex', beforeVisualFacts: 'Before: visual facts', atDepthRoleKept: 'At-depth: assistant role kept', afterPromptTail: 'After: prompt tail', activatedOnly: 'Diagnostics: activated entries only', worldbook: 'worldbook', filter: 'filter', maxPasses: 'max passes', inputCleanup: 'input cleanup', outputCleanup: 'llm_output_cleanup', cleanupOrder: 'order: MVU → default → image/HTML → custom', summaryDebug: 'summary debug', redactedPayloads: 'redacted payloads', imageRecordsCapped: 'image records capped', idle: 'idle', loadedResources: 'Loaded {count} resources.',
  },
});

export function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase();
  if (!value || value === 'auto') return UI_LANGUAGES.AUTO;
  if (value.startsWith('en')) return UI_LANGUAGES.EN;
  return UI_LANGUAGES.ZH;
}

export function getSillyTavernLocale() {
  try {
    const stored = globalThis.localStorage?.getItem?.('language');
    if (stored) return stored;
  } catch (_error) {
    // localStorage can be unavailable in restricted contexts.
  }
  return globalThis.document?.documentElement?.lang
    || globalThis.navigator?.language
    || globalThis.navigator?.userLanguage
    || 'zh';
}

export function resolveAutoLanguage(locale = getSillyTavernLocale()) {
  const value = String(locale || '').toLowerCase();
  if (value.startsWith('en')) return UI_LANGUAGES.EN;
  return UI_LANGUAGES.ZH;
}

export function getLanguage(settings = {}) {
  const configured = normalizeLanguage(settings.ui?.language || 'auto');
  return configured === UI_LANGUAGES.AUTO ? resolveAutoLanguage() : configured;
}

export function createTranslator(settings = {}) {
  const language = getLanguage(settings);
  const dictionary = { ...(STRINGS[language] || STRINGS.zh), ...(EXTRA_STRINGS[language] || EXTRA_STRINGS.zh) };
  return (key, params = {}) => String(dictionary[key] || STRINGS.en[key] || key)
    .replace(/\{(\w+)\}/g, (_match, name) => params[name] ?? '');
}

export default { createTranslator, getLanguage, normalizeLanguage };
