# ST-Little Painter

[简体中文](./README.md) | English

SillyTavern extension — automatically compiles image prompts from chat context and sends them to an image backend.

> Keep the main chat model focused on roleplay/story writing. Little Painter uses a dedicated tagger LLM pipeline to extract tags, compile prompts, call an image backend, and insert the resulting image back into chat.

---

## Features

- **Manual / automatic image generation**: trigger from the input-bar wand menu or enable generation flows from settings
- **7-screen console**: Dashboard, Tag API, Compiler, Backends, Knowledge, Regex, Debug
- **4 image backends**: SD WebUI / Forge, NovelAI, ComfyUI, Natural Image (OpenAI-compatible)
- **Independent tag pipeline**: context collection → worldbook injection → scene planner → tagger LLM → post-processing → tag budget → regex cleanup
- **Knowledge runtime**: skill selector, tag dictionary, prompt packs, tag conflict handling, alias normalization
- **BME compatibility**: vendored ST-BME runtime for worldbook resolving, MVU cleanup, and regex stages
- **Hires Fix / ADetailer**: native SD WebUI payload support
- **Mobile console layout**: fullscreen overlay with responsive breakpoints for tablet and phone widths
- **Chinese / English UI**: defaults to SillyTavern's current language, with manual override in settings

---

## Pipeline Flow

```
Chat context
  → Context collection (chat history / character card / metadata)
  → MVU / thinking-block cleanup
  → Worldbook resolving and injection
  → Scene planner (smart / expert modes)
  → Skill selection + dictionary hints
  → Tagger LLM request (separate API)
  → JSON extraction and validation
  → Post-processing (merge / normalize / replace / conflicts / budget)
  → Final regex cleanup
  → Compile final prompt
  → Call image backend
  → Insert image into chat
```

---

## Supported Image Backends

| Backend | Default URL | Key Parameters |
|---------|-------------|----------------|
| **SD WebUI / Forge** | `http://127.0.0.1:7860` | txt2img, resource fetching for models/VAEs/samplers/schedulers/upscalers/LoRAs, Hires Fix, ADetailer, Basic Auth |
| **NovelAI** | `https://image.novelai.net` | NAI Diffusion 3, ucPreset, qualityToggle, SM / SM Dyn, Dynamic Thresholding |
| **ComfyUI** | `http://127.0.0.1:8188` | Workflow JSON with placeholder replacement, polling, configurable interval and max poll count |
| **Natural Image** | `https://api.openai.com/v1` | OpenAI-compatible `/images/generations` or `/chat/completions`, instruction prefix/suffix, size/quality |

---

## Installation

1. Put the whole folder into a SillyTavern extension directory:

   ```
   data/<user>/extensions/ST-Little_Painter/
   ```

   or

   ```
   SillyTavern/public/scripts/extensions/third-party/ST-Little_Painter/
   ```

2. Restart SillyTavern or refresh the page
3. Enable ST-Little Painter in extension settings
4. Configure the Tag API endpoint used for tag generation
5. Configure an image backend: SD WebUI / NovelAI / ComfyUI / Natural Image
6. Open the console from the bottom-right input-bar wand menu by clicking **Little Painter**

---

## Console Screens

| Screen | Purpose |
|--------|---------|
| **Dashboard** | Pipeline readiness, compiled preview, insertion target, recent generation thumbnail, shortcuts |
| **Tag API** | Second API endpoint settings, response contract preview, diagnostic stepper |
| **Compiler** | Mode switch (`fast`/`smart`/`expert`), prompt profile, fixed positive/negative prompts, CompiledPrompt preview |
| **Backends** | Backend configuration, SD resource refresh, provider-specific payload previews |
| **Knowledge** | Worldbook resolver status, dictionary/skill retrieval preview, skill selector |
| **Regex** | Built-in cleanup rules, custom rules, live cleanup test |
| **Debug** | Pipeline trace timeline, latest trace summary, insertion diagnostics |

---

## Tests

```bash
# UI foundation
npm run test:ui-foundation

# End-to-end knowledge/prompt pipeline
npm run test:prompt-knowledge

# Backend adapter contracts
node tools/test-backend-adapters.mjs

# JSON fallback behavior
node tools/test-call-json-fallback.mjs

# Default regex rules
node tools/test-default-regex.mjs

# Insertion plan resolution
node tools/test-insertion-plan.mjs

# Worldbook delegate
node tools/test-worldbook-delegate.mjs
```

---

## Project Structure

```
src/
├── backend/          # Image backend adapters (SD / NAI / ComfyUI / Natural)
├── context/          # Context collection, cleanup, MVU stripping
├── core/             # Constants and DOM selectors
├── debug/            # Pipeline trace logs with sensitive-key redaction
├── dictionary/       # Tag dictionary, normalization, conflicts, negative packs
├── host/             # Settings store and profile management
├── image/            # Generation records, insertion plans, chat rendering
├── llm/              # Tag API calls and JSON extraction
├── pipeline/         # Main generation pipeline orchestrator
├── planner/          # Scene planner prompts and schema
├── postprocess/      # Merge, normalize, replace, budget, regex cleanup
├── promptProfiles/   # Backend-specific compiler profiles
├── reference/        # Reference asset compilation
├── regex/            # Default/user regex rules
├── skills/           # Skill registry and selector
├── tagger/           # Tagger prompt builder and CompiledPrompt schema
├── ui/               # Console shell, i18n, field binding
├── vendor/st-bme/    # Vendored ST-BME runtime
└── worldbook/        # Worldbook resolver adapter and delegate
```

---

## License

Same as SillyTavern.

---

## Contributing

Issues and PRs are welcome.

---

*ST-Little Painter v0.1.0*
