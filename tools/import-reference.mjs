#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseSourceDocument } from '../src/reference/sourceImporter.js';
import { compileRawEntriesToAssets } from '../src/reference/assetCompiler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(__dirname, '..');
const outputDir = path.join(extensionRoot, 'assets', 'compiled', 'reference');
const allowedExtensions = new Set(['.json', '.txt', '.md']);

async function collectSourceFiles(directory) {
  const files = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(fullPath));
    } else if (entry.isFile() && allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    throw new Error('Usage: node tools/import-reference.mjs <reference-directory>');
  }

  const sourceDir = path.resolve(process.cwd(), input);
  const files = await collectSourceFiles(sourceDir);
  const documents = [];
  const rawEntries = [];

  for (const file of files) {
    const text = await fs.readFile(file, 'utf8');
    const relativePath = path.relative(extensionRoot, file) || file;
    const document = parseSourceDocument(text, { path: relativePath });
    documents.push({
      sourcePath: document.sourcePath,
      type: document.type,
      entryCount: document.entries.length,
      errors: document.errors,
    });
    rawEntries.push(...document.entries);
  }

  const assets = compileRawEntriesToAssets(rawEntries);
  const byType = assets.reduce((acc, asset) => {
    acc[asset.type] = (acc[asset.type] ?? 0) + 1;
    return acc;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    sourceDir,
    fileCount: files.length,
    rawEntryCount: rawEntries.length,
    assetCount: assets.length,
    byType,
    documents,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'import-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outputDir, 'raw-assets.json'), `${JSON.stringify(assets, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({ report: path.join(outputDir, 'import-report.json'), assets: path.join(outputDir, 'raw-assets.json'), ...report }, null, 2));
}

main().catch((error) => {
  console.error(error?.message || String(error));
  process.exitCode = 1;
});
