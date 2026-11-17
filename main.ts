// Palmera Bay — entry build script (Node 22, stdlib only).
// Stages the game and screenshots into the output dir, then writes
// dossier.json through make.fun's own buildDossier helper so the dossier
// always matches what the scorer expects.
//
// NOTE: the output dir is never wiped here on purpose. On the grader the
// output path is a Docker volume mount, and removing a mount point fails
// with EBUSY ("Device or resource busy"), which would kill the whole run
// before anything is built. The grader always hands us an empty output
// dir, so creating it with mkdir -p is all that's needed — no cleanup.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = resolve(import.meta.dirname);
const outDir = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : join(repoDir, 'out');

// Limits for the dossier builder (text, screenshots, game payload).
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function main() {
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
