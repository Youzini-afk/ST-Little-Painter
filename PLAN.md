# ST-Little Painter Implementation Plan

## Phase 0 — Planning and architecture

Deliverables:

- `README.md`
- `DESIGN.md`
- `PLAN.md`
- initial `.gitignore`

Acceptance:

- The project positioning and module boundaries are documented.
- Runtime modes and IR expectations are documented.
- Adult-oriented drawing assets are defined as ordinary drawing assets, not a separate policy layer.

## Phase 1 — SillyTavern extension skeleton

Deliverables:

- `manifest.json`
- `index.js`
- `settings.html`
- `style.css`
- settings store
- debug trace store
- basic UI: main settings, tag API settings, request workbench, debug panel

Acceptance:

- The extension can be loaded by SillyTavern as a third-party extension.
- Settings merge defaults and persist via `extension_settings` / `saveSettingsDebounced`.
- UI can render without backend integrations.
- Debug trace can record and display a placeholder trace.

## Phase 2 — Request workbench

Deliverables:

- context collector
- context sanitizer shell
- LLM JSON client
- tagger prompt builder
- JSON extraction / repair / retry
- manual “generate tags” workbench

Acceptance:

- Manual generation reads recent context and character info.
- Second API returns structured `CompiledPrompt` JSON.
- Bad JSON can be repaired or retried.
- Trace records request messages, raw response, parsed result, and errors.

## Phase 3 — ST-BME compatibility layer

Deliverables:

- regex host facade
- sanitizer facade
- worldbook resolver facade
- vendored ST-BME `resolveTaskWorldInfo` delegate adapter
- compatibility diagnostics
- golden test fixtures where possible

Acceptance:

- The compatibility layer exposes stable Little Painter interfaces.
- Worldbook / regex / sanitizer results are traceable.
- The implementation is designed to preserve BME semantics rather than replace them with a simplified subset.
- Little Painter worldbook settings include BME filter/resolve defaults and `tools/test-worldbook-delegate.mjs` validates constant/selective/secondary/group/probability/atDepth/EJS/lazy/MVU/custom-filter semantics.

## Phase 4 — Knowledge runtime

Deliverables:

- tag dictionary store
- tag search and alias normalization
- conflict rules
- skill registry
- first skill seed pack
- prompt / quality / negative packs
- postprocessor

Acceptance:

- Chinese/natural-language aliases can retrieve canonical tags.
- Tagger output can be canonicalized and deduped.
- Skills can be enabled/disabled and their contribution appears in trace.
- Postprocessor produces final positive and negative prompts.

## Phase 5 — First backend and image loop

Deliverables:

- backend registry
- first backend adapter, initially SD WebUI / Forge unless project settings prefer another backend
- backend payload compiler
- image generation call
- image store
- chat insertion shell
- generation record

Acceptance:

- A generated prompt can be sent to the backend.
- Image result can be stored and inserted or displayed.
- Request is reproducible from a settings snapshot and trace.

## Phase 6 — Smart mode

Deliverables:

- planner prompt builder
- ScenePlan schema
- retrieval card runtime
- planner + tagger chain
- optional repair pass

Acceptance:

- Smart mode shares the same IR and backend compiler as Fast mode.
- Planner and tagger decisions are independently traceable.

## Phase 7 — Reference asset compiler

Deliverables:

- parser for `文料参考` source documents
- raw entry importer
- asset schema
- manual review-friendly reports
- compiled tags / skills / retrieval cards seed

Acceptance:

- Source assets are traceable by file and entry.
- Raw reference text is not injected wholesale into runtime prompts.

## Phase 8 — Multi-backend and UX refinement

Deliverables:

- NovelAI adapter
- ComfyUI adapter
- generation history
- regenerate/edit flows
- export debug bundle

Acceptance:

- Same `CompiledPrompt` can compile to multiple backend payloads.
- Generation records can be replayed or exported for debugging.

Phase 8 image UX now uses `insertionPlan` records for anchor-based render-only insertion. Images are rendered as Little Painter DOM beside message anchors and never written back into SillyTavern message text, preventing generated previews from polluting later context collection.
