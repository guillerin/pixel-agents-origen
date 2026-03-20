#!/usr/bin/env node
/**
 * Layout generator — design the office as ASCII art, output JSON.
 *
 * Legend:
 *   V = void (255)    W = wall (0)
 *   a = workspace (1)  m = meeting (7)  k = kitchen (3)
 *   l = lounge (5)     h = hallway (2)  s = server (9)
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── ASCII map (auto-padded to widest row with V) ──────────
const rawMap = [
  '',                                                // 0  void
  '',                                                // 1
  '',                                                // 2
  '',                                                // 3
  '',                                                // 4
  '',                                                // 5
  '',                                                // 6
  '',                                                // 7
  '',                                                // 8
  '',                                                // 9
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',                   // 10 top wall
  'WmmmmmmmmmmmWaaaaaaaaaaaaaaaaW',                  // 11 meeting | workspace
  'WmmmmmmmmmmmWaaaaaaaaaaaaaaaaW',                  // 12
  'WmmmmmmmmmmmWaaaaaaaaaaaaaaaaW',                  // 13
  'WmmmmmmmmmmmWaaaaaaaaaaaaaaaaW',                  // 14
  'WmmmmmmmmmmmWaaaaaaaaaaaaaaaaW',                  // 15
  'WmmmmmmmmmmmaaaaaaaaaaaaaaaaaW',                  // 16 doorway
  'WmmmmmmmmmmmWaaaaaaaaaaaWWWWWW',                  // 17
  'WWWWWWWWWWWWW aaaaaaaaaaaWllllW',                 // 18 wall+doorway+lounge
  'WkkkkkkkkkkkW aaaaaaaaaaaWllllW',                 // 19 kitchen
  'WkkkkkkkkkkkWaaaaaaaaaaaallllW',                  // 20 doorway→lounge
  'WkkkkkkkkkkkWaaaaaaaaaaaWllllW',                  // 21
  'WkkkkkkkkkkkWaaaaaaaaaaaWllllW',                  // 22
  'WkkkkkkkkkkkaaaaaaaaaaaaaWllllW',                 // 23 doorway kitchen→ws
  'WkkkkkkkkkkkWaaaaaaaaaaaWllllW',                  // 24
  'WkkkkkkkkkkkWaaaaaaaaaaaWllllW',                  // 25
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',                 // 26 bottom wall
  '',                                                // 27
];

// Auto-pad: find max width, pad all rows with V
const COLS = Math.max(...rawMap.map(r => r.length), 30) + 4; // +4 void margin right
const ROWS = rawMap.length;
const map = rawMap.map(r => r.padEnd(COLS, 'V'));

console.log(`Grid: ${COLS} x ${ROWS}`);

// ─── Tile / Color mapping ──────────────────────────────────
const TILE = { V: 255, W: 0, a: 1, m: 7, k: 3, l: 5, h: 2, s: 9, ' ': 1 };

const COLORS = {
  W: { h: 214, s: 30, b: -100, c: -55 },       // dark blue walls
  a: { h: 209, s: 39, b: -25, c: -80 },         // blue carpet
  m: { h: 25, s: 48, b: -43, c: -88 },          // warm wood
  k: { h: 160, s: 25, b: -30, c: -70 },         // teal-grey kitchen
  l: { h: 280, s: 20, b: -20, c: -75 },         // soft purple lounge
  h: { h: 0, s: 0, b: -25, c: -60 },            // neutral hallway
  s: { h: 209, s: 0, b: -16, c: -8 },           // dark server
  ' ': { h: 209, s: 39, b: -25, c: -80 },       // doorways = workspace
};

// ─── Generate tiles + tileColors ────────────────────────────
const tiles = [];
const tileColors = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const ch = map[r][c];
    tiles.push(TILE[ch] ?? 255);
    tileColors.push(ch === 'V' ? null : (COLORS[ch] ?? null));
  }
}

// ─── Furniture ─────────────────────────────────────────────
let uidCounter = 0;
const uid = () => `f-new-${++uidCounter}`;

const furniture = [
  // ══════ MEETING ROOM (cols 1-11, rows 11-17) ══════
  { uid: uid(), type: 'TABLE_WOOD_LG', col: 5, row: 12 },
  // Chairs
  { uid: uid(), type: 'CHAIR_CUSHIONED_LEFT', col: 4, row: 13 },
  { uid: uid(), type: 'CHAIR_CUSHIONED_LEFT', col: 4, row: 14 },
  { uid: uid(), type: 'CHAIR_CUSHIONED_LEFT', col: 4, row: 15 },
  { uid: uid(), type: 'CHAIR_CUSHIONED_RIGHT', col: 7, row: 13 },
  { uid: uid(), type: 'CHAIR_CUSHIONED_RIGHT', col: 7, row: 14 },
  { uid: uid(), type: 'CHAIR_CUSHIONED_RIGHT', col: 7, row: 15 },
  // Wall decor
  { uid: uid(), type: 'CHALKBOARD_WALL_SM', col: 3, row: 10 },
  { uid: uid(), type: 'WINDOW_DOUBLE_WOOD', col: 6, row: 10 },
  { uid: uid(), type: 'PLANT_1', col: 1, row: 10 },
  { uid: uid(), type: 'PLANT_2', col: 11, row: 10 },
  { uid: uid(), type: 'CLOCK_WALL_COLOR', col: 10, row: 10 },

  // ══════ MAIN WORKSPACE (cols 13-27, rows 11-25) ══════
  // Top desk row
  { uid: uid(), type: 'DESK_FRONT', col: 14, row: 12 },
  { uid: uid(), type: 'DESK_FRONT', col: 18, row: 12 },
  { uid: uid(), type: 'DESK_FRONT', col: 22, row: 12 },
  { uid: uid(), type: 'PC_FRONT_OFF', col: 15, row: 12 },
  { uid: uid(), type: 'PC_FRONT_OFF', col: 19, row: 12 },
  { uid: uid(), type: 'PC_FRONT_OFF', col: 23, row: 12 },
  { uid: uid(), type: 'CHAIR_ROTATING_FRONT', col: 15, row: 14 },
  { uid: uid(), type: 'CHAIR_ROTATING_FRONT', col: 19, row: 14 },
  { uid: uid(), type: 'CHAIR_ROTATING_FRONT', col: 23, row: 14 },

  // Bottom desk row
  { uid: uid(), type: 'DESK_FRONT', col: 14, row: 21 },
  { uid: uid(), type: 'DESK_FRONT', col: 18, row: 21 },
  { uid: uid(), type: 'PC_FRONT_OFF', col: 15, row: 21 },
  { uid: uid(), type: 'PC_FRONT_OFF', col: 19, row: 21 },
  { uid: uid(), type: 'CUSHIONED_BENCH', col: 15, row: 19 },
  { uid: uid(), type: 'CUSHIONED_BENCH', col: 19, row: 19 },

  // Windows on top wall
  { uid: uid(), type: 'WINDOW_DOUBLE_WHITE', col: 15, row: 10 },
  { uid: uid(), type: 'WINDOW_DOUBLE_WHITE', col: 20, row: 10 },
  { uid: uid(), type: 'WINDOW_DOUBLE_WHITE', col: 25, row: 10 },
  { uid: uid(), type: 'CHART_1', col: 18, row: 10 },
  // Plants
  { uid: uid(), type: 'PLANT_3', col: 13, row: 10 },
  { uid: uid(), type: 'WHITE_PLANT_2', col: 27, row: 10 },
  { uid: uid(), type: 'PLANT_2', col: 13, row: 17 },

  // ══════ KITCHEN (cols 1-11, rows 19-25) ══════
  { uid: uid(), type: 'COUNTER_WHITE_SM', col: 1, row: 18 },
  { uid: uid(), type: 'COFFEE_MACHINE', col: 1, row: 18 },
  { uid: uid(), type: 'MICROWAVE', col: 2, row: 18 },
  { uid: uid(), type: 'FRIDGE', col: 5, row: 18 },
  { uid: uid(), type: 'WATER_COOLER', col: 7, row: 18 },
  { uid: uid(), type: 'VENDING_MACHINE', col: 9, row: 18 },
  // Break table
  { uid: uid(), type: 'WOOD_COFEE_TABLE', col: 4, row: 22 },
  { uid: uid(), type: 'STOOL', col: 4, row: 23 },
  { uid: uid(), type: 'STOOL', col: 5, row: 23 },
  { uid: uid(), type: 'STOOL', col: 4, row: 21 },
  { uid: uid(), type: 'STOOL', col: 5, row: 21 },
  { uid: uid(), type: 'COFFEE_MUG', col: 5, row: 22 },
  { uid: uid(), type: 'BIN', col: 10, row: 25 },
  { uid: uid(), type: 'WHITE_PLANT_1', col: 1, row: 25 },

  // ══════ LOUNGE (cols right section, rows 18-25) ══════
  { uid: uid(), type: 'SOFA_FRONT', col: 26, row: 20 },
  { uid: uid(), type: 'SOFA_BACK', col: 26, row: 23 },
  { uid: uid(), type: 'SOFA_SIDE', col: 25, row: 21 },
  { uid: uid(), type: 'SOFA_SIDE:left', col: 28, row: 21 },
  { uid: uid(), type: 'COFFEE_TABLE', col: 26, row: 21 },
  { uid: uid(), type: 'COFFEE', col: 26, row: 22 },
  { uid: uid(), type: 'PLANT_1', col: 29, row: 17 },
  { uid: uid(), type: 'PLANT_3', col: 25, row: 17 },
  { uid: uid(), type: 'FULL_BOOKSHELF_TALL', col: 27, row: 17 },
  { uid: uid(), type: 'PAINTING_LANDSCAPE', col: 26, row: 17 },
];

// ─── Output ─────────────────────────────────────────────────
const layout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  layoutRevision: 2,
  tiles,
  tileColors,
  furniture,
};

const outPath = resolve(__dirname, '../public/assets/default-layout-1.json');
writeFileSync(outPath, JSON.stringify(layout));
console.log(`Written to ${outPath}`);
console.log(`  Tiles: ${tiles.length} (${COLS}x${ROWS})`);
console.log(`  Furniture: ${furniture.length} items`);

// Print the padded map for visual verification
console.log('\nVisual map:');
for (let r = 0; r < ROWS; r++) {
  const row = map[r];
  const nonVoid = row.replace(/V/g, ' ').trimEnd();
  if (nonVoid) console.log(`  ${String(r).padStart(2)}: ${nonVoid}`);
}
