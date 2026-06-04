# ST-Little Painter Design

## 1. Positioning

ST-Little Painter is not merely an image backend caller. It is a **SillyTavern image-request compiler**.

The core pipeline is:

```text
SillyTavern chat / character / worldbook / regex / user settings
  -> resolved visual context
  -> structured scene/tag plan
  -> canonicalized tag blocks
  -> backend-specific request
  -> image result and render-only chat insertion
```

The main chat model should not be required to emit image tags in story text. The plugin builds a dedicated second-API request and applies its structured response.

Phase 8 image insertion is anchor-based and render-only: the second API only returns `insertionPlan.anchorQuote` plus `placement` (`before_anchor` or `after_anchor`), while the plugin controls target message and fallback behavior. Generated image DOM is attached around the latest AI message anchor in the chat UI without modifying `message.mes` or contaminating future prompt context.

## 2. Architecture principles

### 2.1 IR first

The project should not become a string-concatenation prompt pile. Each stage should output typed intermediate representations:

- `ResolvedContext`
- `ScenePlan`
- `CompiledPrompt`
- `BackendRequest`
- `GenerationTrace`

### 2.2 BME compatibility before simplification

The ST-BME worldbook, regex, and sanitizer behavior is treated as an existing compatibility target. The implementation should adapt the full behavior behind facades instead of rewriting a reduced worldbook resolver.

Little Painter vendors the task-level ST-BME worldbook resolver under `src/vendor/st-bme/` and initializes its host adapter with a Little Painter delegate. The delegate discovers SillyTavern/global worldbook APIs when available and otherwise builds a local provider from `context.worldbook` / `context.worldInfo` entry arrays or maps, preserving BME activation, EJS `getwi` / `activewi`, lazy worldbook loading, at-depth messages, and MVU/custom filter behavior without runtime imports outside the extension.

Little Painter also ships BME-inspired default regex cleanup rules. They are enabled for input cleanup and final tag cleanup by default, removing common prompt-pollution artifacts such as `<think>/<analysis>/<reasoning>`, `<choice>`, `<UpdateVariable>`, `<status_current_variable>`, `<StatusPlaceHolderImpl/>`, and MVU state macros. Output cleanup uses the same rule family but remains opt-in because BME also keeps output-stage regex disabled by default.

### 2.3 Assets are compiled, not pasted

Reference material under `文料参考` is source material. It should be converted into curated runtime assets:

- tag dictionary entries
- skills
- retrieval cards
- prompt fragments
- quality / negative / backend packs

Raw prompt books or worldbook exports should not be injected wholesale into runtime prompts.

### 2.4 Backend adapters do not decide semantics

SD, NovelAI, ComfyUI, and other adapters compile already-decided tags and settings into backend payloads. They do not decide characters, poses, scene semantics, or interaction meaning.

Implemented backend families:

- `sdWebui`: A1111/Forge `/sdapi/v1/txt2img` tag backend.
- `novelai`: NovelAI `/ai/generate-image` payload with NAI-style parameters and ZIP/JSON/image response handling.
- `comfyui`: API-workflow JSON patching with `{{positive}}`, `{{negative}}`, numeric generation placeholders, `/prompt` submission, `/history` polling, and `/view` download.
- `naturalImage`: natural-language image providers, including OpenAI/Grok-compatible `/images/generations` and chat-style providers that return image URLs, data URLs, or markdown images.

All adapters must return a renderable `dataUrl` before the image record is stored, so URL-only provider responses are downloaded by the adapter layer and never written into chat text.

### 2.5 Adult drawing assets are ordinary drawing assets

If adult-oriented tags, poses, interactions, body-state tags, clothing-state tags, or negative packs exist in user assets, reference material, or tag dictionaries, they are processed as normal drawing assets. The compiler performs normal engineering steps only: dedupe, alias normalization, conflict handling, backend formatting, budget trimming, replacements, and user-configured allow/block lists.

## 3. High-level pipeline

```text
ST Host Layer
  -> Context Collector
  -> Regex / MVU / Sanitizer
  -> BME Worldbook Resolver Adapter
  -> ResolvedContext
  -> Knowledge Runtime
       - Tag Dictionary
       - Skills
       - Prompt Profiles
       - Retrieval Cards
       - Prompt / Negative / Backend Packs
  -> Fast or Smart Mode
       - Fast: lightweight retrieval + single tagger call
       - Smart: planner + retrieval + tagger + optional repair
  -> Tag Postprocessor
  -> Backend Compiler
  -> Image Provider
  -> Image Store / Chat Inserter
  -> Debug Trace
```

## 4. Core IR

### 4.1 ResolvedContext

```ts
type ResolvedContext = {
  chat: {
    latestMessage: string;
    recentMessages: { role: 'user' | 'assistant' | 'system'; content: string; index: number }[];
    summary?: string;
  };
  character: {
    name: string;
    aliases: string[];
    description?: string;
    personality?: string;
    scenario?: string;
    stableAppearance: string[];
    currentState: string[];
  };
  worldbook: {
    activatedEntries: ResolvedWorldbookEntry[];
    visualFacts: string[];
    constraints: string[];
    styleHints: string[];
  };
  regex: { transforms: RegexTransform[] };
  sanitizer: { removedBlocks: RemovedBlock[] };
  userIntent: {
    raw?: string;
    mode: 'manual' | 'auto' | 'regenerate' | 'edit';
    explicitPrompt?: string;
  };
  metadata: {
    chatId?: string;
    messageId?: string;
    timestamp: number;
    resolverVersion: string;
  };
};
```

### 4.2 ScenePlan

Planner output. Fast mode may create a minimal ScenePlan internally so all later stages share the same structure.

```ts
type ScenePlan = {
  shouldGenerate: boolean;
  reason: string;
  mode: 'fast' | 'smart' | 'expert';
  backend: 'sd' | 'novelai' | 'comfyui' | 'banana';
  visualFocus: string;
  visibleFacts: string[];
  uncertainFacts: string[];
  forbiddenInferences: string[];
  characters: CharacterPlan[];
  scene: SceneBlock;
  composition: CompositionBlock;
  camera: CameraBlock;
  lighting: LightingBlock;
  style: StyleBlock;
  tagQueries: string[];
  skillQueries: string[];
  constraints: {
    maxPositiveTags: number;
    maxNegativeTags: number;
    mustInclude: string[];
    mustAvoid: string[];
  };
  diagnostics: {
    usedWorldbookEntries: string[];
    unresolvedQuestions: string[];
  };
};
```

### 4.3 CompiledPrompt

Tagger output. It remains structured until postprocessing and backend compilation.

```ts
type CompiledPrompt = {
  shouldGenerate: boolean;
  positiveBlocks: {
    quality: string[];
    subject: string[];
    identity: string[];
    character: string[];
    face: string[];
    hair: string[];
    eyes: string[];
    body: string[];
    clothing: string[];
    clothingState: string[];
    pose: string[];
    interaction: string[];
    expression: string[];
    environment: string[];
    props: string[];
    camera: string[];
    lighting: string[];
    style: string[];
    backendSpecific: string[];
    lora: string[];
  };
  negative: string[];
  params?: Record<string, unknown>; // Advanced override only; omitted from the default tagger prompt so models focus on tags and insertion anchors.
  warnings: string[];
  dropped: { item: string; reason: string }[];
  debug: { dictionaryHits: string[]; skillsUsed: string[] };
};
```

## 5. Runtime modes

### Fast mode

```text
ResolvedContext
  -> lightweight tag dictionary search
  -> small skill summaries
  -> single JSON tagger call
  -> postprocess
  -> backend compile
```

### Smart mode

```text
ResolvedContext
  -> planner call
  -> ScenePlan
  -> dictionary + skill + retrieval card lookup
  -> tagger call
  -> optional repair
  -> postprocess
  -> backend compile
```

Both modes share IR, validators, postprocessing, backend adapters, and debug trace.

## 6. Postprocessing

The postprocessor applies only engineering transformations:

1. schema validation
2. JSON repair
3. block flattening
4. splitting and trimming tags
5. alias normalization
6. dictionary canonicalization
7. dedupe
8. conflict resolution
9. user blocklist/allowlist
10. fixed positive / negative merge
11. replacement rules
12. tag budget trimming
13. backend syntax compilation

Tags are not removed or downgraded due to a separate content grading layer.

## 6.1 Prompt/skills/tag knowledge profiles

The knowledge runtime now keeps backend presentation guidance separate from the unified IR:

- `assets/compiled/prompt-profiles/*.json` and `src/promptProfiles/promptProfileRegistry.js` select a profile from `settings.backend.type` (`generic`, `sd`, `novelai`, `comfyui`, `naturalImage`). Profiles provide system/user guidance, preferred blocks, negative guidance, and tag ordering, but never override `CompiledPrompt` schema.
- Skills are selected with priority, category quotas, backend applicability, conflicts, required baseline/profile skills, context hit scoring, and trace details (`reason`, `score`, `hits`, `category`). Legacy skill JSON remains valid and is enriched at load time.
- The curated compiler converts `assets/compiled/reference/raw-assets.json` into reference dictionaries, aliases, negative packs, prompt profiles, and reference skills. Raw prompt books are not injected wholesale into tagger prompts.
- Dictionary runtime merges base and reference dictionaries/aliases/negative packs, including Chinese alias (`zhAliases`) lookup to canonical English tags.

## 7. Debug trace

Every generation should be explainable:

- raw context
- sanitized context
- regex transforms
- sanitizer removals
- activated worldbook entries
- planner request / response
- dictionary hits
- selected skills
- retrieval cards
- tagger request / response
- normalized tags
- removed tags and reasons
- conflicts and decisions
- final positive / negative prompt
- backend payload
