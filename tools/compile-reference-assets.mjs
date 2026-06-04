import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileCuratedReferenceAssets } from '../src/reference/curatedCompiler.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RAW_PATH = join(ROOT, 'assets/compiled/reference/raw-assets.json');
const TAG_PATH = join(ROOT, 'assets/compiled/tags/reference_tag_dictionary.jsonl');
const ALIAS_PATH = join(ROOT, 'assets/compiled/tags/reference_aliases.json');
const NEGATIVE_PATH = join(ROOT, 'assets/compiled/tags/reference_negative_packs.json');
const PROFILE_DIR = join(ROOT, 'assets/compiled/prompt-profiles');
const SKILL_DIR = join(ROOT, 'assets/compiled/skills/reference');

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main() {
  const raw = JSON.parse(await readFile(RAW_PATH, 'utf8'));
  const compiled = compileCuratedReferenceAssets(raw);

  await mkdir(dirname(TAG_PATH), { recursive: true });
  await writeFile(TAG_PATH, `${compiled.dictionary.map((entry) => JSON.stringify(entry)).join('\n')}\n`, 'utf8');
  await writeJson(ALIAS_PATH, compiled.aliases);
  await writeJson(NEGATIVE_PATH, compiled.negativePacks);

  await mkdir(PROFILE_DIR, { recursive: true });
  for (const profile of compiled.promptProfiles) {
    await writeJson(join(PROFILE_DIR, `${profile.id}.json`), profile);
  }

  await mkdir(SKILL_DIR, { recursive: true });
  for (const skill of compiled.skills) {
    await writeJson(join(SKILL_DIR, `${skill.id}.skill.json`), skill);
  }

  console.log(JSON.stringify({ ok: true, stats: compiled.stats }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
