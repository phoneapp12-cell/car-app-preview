// Full computer-vs-computer Scrabble games with the real word list. Every move is re-checked with check().
// Run: node tests/scrabble-sim.mjs [games]
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ctx = { console, Math, Object, Number, String, Array, Set, Map, JSON, Date, Uint8Array, Int8Array, Int32Array, setTimeout, parseInt };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('feed/scrabble.js', 'utf8'), ctx, { filename: 'feed/scrabble.js' });
const S = ctx.Scrabble;
let t0 = Date.now();
const trie = S.buildTrie(fs.readFileSync('feed/scrabble-words.txt', 'utf8'));
console.log('trie', trie.size, 'words', trie.nodes, 'nodes', Date.now() - t0, 'ms');
const games = +(process.argv[2] || 3);
const times = [];
for (let g = 0; g < games; g++) {
  const rand = S.rng(1000 + g);
  const st = S.newGame({ mode: 'cpu', level: g % 2 ? 'gentle' : 'clever', players: [{ name: 'A', cpu: true }, { name: 'B', cpu: true }], rand });
  let turns = 0;
  while (!st.over && turns < 200) {
    const before = JSON.stringify(st.board);
    const t = Date.now();
    const r = S.cpuChoose(st, trie, rand);
    times.push(Date.now() - t);
    if (r.move) {
      const chk = S.check(st.board, r.move.place, trie);
      assert.ok(chk.ok, 'illegal ' + JSON.stringify(r.move.place) + ' ' + chk.err);
      assert.equal(chk.score, r.move.score, 'score mismatch');
      for (const w of chk.words) assert.ok(trie.has(w.w), w.w);
    }
    S.applyCpu(st, r.move, trie, rand);
    turns++;
    assert.ok(before !== JSON.stringify(st.board) || st.last.kind !== 'play');
  }
  assert.ok(st.over, 'game finished');
  const tiles = st.board.filter(Boolean).length + st.bag.length + st.players.reduce((a, p) => a + p.rack.length, 0);
  assert.equal(tiles, 100, 'tile count');
  console.log(`game ${g + 1} (${st.level}): ${turns} turns, scores ${st.players.map(p => p.score).join(' v ')}, ${st.board.filter(Boolean).length} tiles on board, out=${st.out}`);
}
times.sort((a, b) => a - b);
console.log('move time ms: median', times[times.length >> 1], 'p90', times[Math.floor(times.length * 0.9)], 'max', times[times.length - 1]);
console.log('scrabble sim ok');
