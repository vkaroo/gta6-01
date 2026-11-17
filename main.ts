// Palmera Bay — entry build script (Node 22, stdlib only).
// Copies game/ + screenshots/ into the output dir and writes dossier.json
// with make.fun's own buildDossier, so the dossier always matches the scorer.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = resolve(import.meta.dirname);
const outDir = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : join(repoDir, 'out');

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function main() {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const dir of ['game', 'screenshots']) {
    const src = join(repoDir, dir);
    if (!existsSync(src)) throw new Error(`missing ${dir}/ in ${repoDir}`);
    cpSync(src, join(outDir, dir), { recursive: true });
  }
  const dossier = buildDossier(outDir, caps);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`built ${outDir}: dossier.json ${dossier.length} bytes`);
}

main();
