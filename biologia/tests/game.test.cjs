const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../game.js'), 'utf8');
function setup(storage = new Map()) {
 const elements = new Map();
 function element(selector) {
  if (!elements.has(selector)) elements.set(selector, {
   hidden: false, open: false, checked: true, style: {}, dataset: {},
   querySelector: element, addEventListener() {}, setAttribute() {}, focus() {}
  });
  return elements.get(selector);
 }
 const context = vm.createContext({
  document: { documentElement: {}, querySelector: element, querySelectorAll: () => [], addEventListener() {}, hidden: false },
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  setTimeout: () => 1, clearTimeout() {}, Math
 });
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../i18n.js'), 'utf8'), context);
 vm.runInContext(source, context);
 return code => vm.runInContext(code, context);
}
test('pieces fall automatically and stop at the floor', () => {
 const run = setup();
 assert.equal(run('active.row'), 0);
 run('tick()'); assert.equal(run('active.row'), 1);
 run('control("drop")'); assert.equal(run('grid[(ROWS - 1) * COLS + Math.floor(COLS / 2)]'), 1);
 assert.equal(run('active.row'), 0);
});
test('equal pieces merge vertically and score a chain', () => {
 const run = setup();
 run('grid[(ROWS - 1) * COLS + 2]=2; grid[(ROWS - 2) * COLS + 2]=1; active={level:1,row:0,col:2}; control("drop")');
 assert.equal(run('grid[(ROWS - 1) * COLS + 2]'), 3);
 assert.equal(run('grid[(ROWS - 2) * COLS + 2]'), 0);
 assert.equal(run('score'), 12);
 assert.equal(run('highest'), 3);
});
test('different pieces stack without merging', () => {
 const run = setup();
 run('grid[(ROWS - 1) * COLS + 2]=2; active={level:1,row:0,col:2}; control("drop")');
 assert.equal(run('grid[(ROWS - 2) * COLS + 2]'), 1);
 assert.equal(run('grid[(ROWS - 1) * COLS + 2]'), 2);
 assert.equal(run('score'), 0);
});
test('equal neighbors merge from either side', () => {
 for (const col of [1, 3]) {
  const run = setup();
  run(`grid[(ROWS - 1) * COLS + 2]=1; active={level:1,row:0,col:${col}}; control("drop")`);
  assert.equal(run('score'), 4);
  assert.equal(run('grid.filter(Boolean).join()'), '2');
 }
});
test('sideways combinations can be disabled', () => {
 const run = setup();
 run('document.querySelector("#sideways-merge").checked=false; grid[(ROWS - 1) * COLS + 1]=1; active={level:1,row:0,col:2}; control("drop")');
 assert.equal(run('score'), 0);
 assert.equal(run('grid.filter(Boolean).length'), 2);
});
test('gravity after a lateral merge enables a vertical chain', () => {
 const run = setup();
 run('grid[(ROWS-1)*COLS+1]=1; grid[(ROWS-2)*COLS+1]=2; active={level:1,row:0,col:2}; control("drop")');
 assert.equal(run('grid[(ROWS-1)*COLS+1]'), 3);
 assert.equal(run('grid.filter(Boolean).length'), 1);
 assert.equal(run('score'), 12);
});
test('diagonal neighbors and opposite board edges do not merge', () => {
 const run = setup();
 run('grid[(ROWS-1)*COLS]=1; grid[(ROWS-2)*COLS+1]=1; grid[(ROWS-2)*COLS-1]=1');
 assert.equal(run('resolveMerges().gained'), 0);
});
test('horizontal movement respects walls and occupied cells', () => {
 const run = setup();
 run('active.col=0; control("left")'); assert.equal(run('active.col'), 0);
 run('grid[1]=2; control("right")'); assert.equal(run('active.col'), 0);
 run('active.col=COLS-1; control("right")'); assert.equal(run('active.col'), run('COLS-1'));
});
test('help and hidden pages pause automatic falling', () => {
 const run = setup();
 run('help.open=true; tick(); control("drop")'); assert.equal(run('active.row'), 0);
 run('help.open=false; document.hidden=true; tick()'); assert.equal(run('active.row'), 0);
 run('document.hidden=false; tick()'); assert.equal(run('active.row'), 1);
});
test('preview becomes the next active piece', () => {
 const run = setup();
 run('nextLevel=2; control("drop")'); assert.equal(run('active.level'), 2);
});
test('full columns end game; restart clears board and score', () => {
 const run = setup();
 run('grid.fill(8); spawn()'); assert.equal(run('ended'), true);
 assert.equal(run('active'), null);
 assert.equal(run('document.querySelector("#game-over").hidden'), false);
 run('start()'); assert.equal(run('ended'), false);
 assert.equal(run('grid.every(v=>v===0) && score===0 && active.row===0'), true);
});
test('new pieces use an open column when the center is full', () => {
 const run = setup();
 run('grid[Math.floor(COLS / 2)]=8; spawn()'); assert.notEqual(run('active.col'), run('Math.floor(COLS / 2)'));
 assert.equal(run('ended'), false);
});
test('organism unlocks victory and does not merge beyond the final stage', () => {
 const run = setup();
 run('grid[(ROWS - 1) * COLS + 2]=7; active={level:7,row:0,col:2}; control("drop")');
 assert.equal(run('won && highest===8 && score===256'), true);
 run('active={level:8,row:0,col:2}; control("drop")');
 assert.equal(run('grid[(ROWS - 2) * COLS + 2]===8 && grid[(ROWS - 1) * COLS + 2]===8 && score===256'), true);
});

test('down drops immediately to the last free cell above a stack', () => {
 const run = setup();
 run('grid[(ROWS - 1) * COLS + 2]=3; active={level:1,row:0,col:2}; control("down")');
 assert.equal(run('grid[(ROWS - 2) * COLS + 2]'), 1);
 assert.equal(run('grid[(ROWS - 1) * COLS + 2]'), 3);
 assert.equal(run('active.row'), 0);
});

test('switching languages preserves the running game and translates dynamic text', () => {
 const run = setup();
 run('control("drop"); const beforeLanguage = JSON.stringify({grid, active, score, nextLevel}); setLanguage("en")');
 assert.equal(run('JSON.stringify({grid, active, score, nextLevel}) === beforeLanguage'), true);
 assert.equal(run('STAGES[0].name'), 'Atom');
 assert.equal(run('document.documentElement.lang'), 'en');
 assert.match(run('document.querySelector("#status").textContent'), /Keep stacking/);
 run('setStatus("statusMerge", {level:2, points:4, chain:true}); setLanguage("pt")');
 assert.equal(run('STAGES[0].name'), 'Átomo');
 assert.match(run('document.querySelector("#status").textContent'), /Reação em cadeia! Molécula/);
});
test('translations have matching keys and interpolate localized values', () => {
 const run = setup();
 assert.equal(run('Object.keys(TRANSLATIONS.pt).sort().join() === Object.keys(TRANSLATIONS.en).sort().join()'), true);
 run('setLanguage("en")');
 assert.equal(run('formatNumber(1234)'), '1,234');
 assert.equal(run('t("piece", {name:"Atom", col:2, row:3})'), 'Atom, column 2, row 3');
 run('setLanguage("invalid")');
 assert.equal(run('language'), 'pt');
});

test('language preference survives reloads', () => {
 const storage = new Map();
 setup(storage)('setLanguage("en")');
 const reloaded = setup(storage);
 assert.equal(reloaded('language'), 'en');
 assert.equal(reloaded('STAGES[7].name'), 'Organism');
 assert.match(reloaded('document.querySelector("#status").textContent'), /already falling/);
});
