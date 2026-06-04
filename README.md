# ST-Little Painter

ST-Little Painter is a SillyTavern image-request compiler. It keeps the main chat model focused on roleplay/story text, then builds image tags through a dedicated request pipeline using context, character data, worldbooks, regex cleanup, tag dictionaries, skills, prompt packs, and backend adapters.

## Current status

This repository is being built in phases:

1. **Phase 0 — Planning and architecture**: design documents, IR, milestones, and implementation boundaries.
2. **Phase 1 — Extension skeleton**: SillyTavern plugin shell, settings store, debug trace shell, and basic UI.
3. **Phase 2 — Request workbench**: context collection, second-API JSON tagger, trace display.
4. **Phase 3 — BME compatibility layer**: worldbook resolver adapter, regex stages, sanitizer.
5. **Phase 4 — Knowledge runtime**: tag dictionary, skills, packs, postprocessing.
6. **Phase 5 — Image backend loop**: backend adapter, generation request, image insertion.

## Design principle

The plugin does not treat adult-oriented drawing assets as a special policy layer. It compiles user assets, reference material, tag dictionaries, prompt packs, and backend rules as ordinary drawing content. Processing is limited to engineering concerns such as deduplication, conflict handling, formatting, budget trimming, replacements, user blocklists/allowlists, and debug tracing.
