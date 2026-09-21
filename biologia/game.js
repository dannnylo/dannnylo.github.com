'use strict';
const STAGES = [
  {name:'Átomo',sub:'O início de tudo',bg:'#f6f5e8',fg:'#889367',fact:'Átomos são unidades da matéria. Carbono, hidrogênio, oxigênio e nitrogênio estão entre os elementos presentes nos seres vivos.'},
  {name:'Molécula',sub:'Átomos conectados',bg:'#e8efcb',fg:'#7c9150',fact:'Uma molécula é formada por átomos ligados. O₂ tem apenas um elemento; a água, H₂O, é uma substância composta por dois elementos.'},
  {name:'Composto',sub:'Macromoléculas da vida',bg:'#cee0b2',fg:'#587c42',fact:'Aqui, “composto” representa macromoléculas, como proteínas. Compostos não são um nível acima das moléculas: esta etapa é uma simplificação do jogo.'},
  {name:'Organela',sub:'Funções dentro da célula',bg:'#a8c995',fg:'#3d6b42',fact:'Organelas são estruturas especializadas das células. As mitocôndrias participam da produção de ATP, usado em processos celulares.'},
  {name:'Célula',sub:'A unidade da vida',bg:'#79ac8c',fg:'#f4f9e9',fact:'A célula é a unidade básica dos seres vivos. Alguns organismos têm uma única célula; outros são formados por muitas células.'},
  {name:'Tecido',sub:'Células trabalhando juntas',bg:'#538e77',fg:'#eff8dc',fact:'Tecidos são conjuntos organizados de células e material extracelular. O tecido muscular, por exemplo, é especializado em contração.'},
  {name:'Órgão',sub:'Tecidos em colaboração',bg:'#32695a',fg:'#edf4c7',fact:'Órgãos reúnem diferentes tecidos que realizam funções. O coração contém, entre outros, tecido muscular e tecido conjuntivo.'},
  {name:'Organismo',sub:'Uma vida completa',bg:'#dfb86b',fg:'#655027',fact:'Em organismos multicelulares, órgãos podem integrar sistemas. Este jogo resume alguns níveis de organização e não representa etapas da evolução.'}
];
const PORTUGUESE_STAGES = STAGES.map(stage => ({...stage}));
let statusMessage = {key: 'statusStart', params: {}};
function renderStatus() {
 const {key, params} = statusMessage;
 document.querySelector('#status').textContent = (params.chain ? t('chain') : '') + t(key, {
  ...params,
  name: params.level ? STAGES[params.level - 1].name : '',
  points: formatNumber(params.points || 0)
 });
}
function setStatus(key, params = {}) { statusMessage = {key, params}; renderStatus(); }
function setLanguage(value) {
 language = value === 'pt' ? 'pt' : 'en';
 try { localStorage.setItem('biomerge-language', language); } catch {}
 document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
 document.title = t('title');
 document.querySelector('#language').value = language;
 document.querySelectorAll('[data-i18n]').forEach(element => { element.innerHTML = t(element.dataset.i18n); });
 document.querySelectorAll('[data-i18n-aria]').forEach(element => { element.setAttribute('aria-label', t(element.dataset.i18nAria)); });
 STAGES.forEach((stage, i) => Object.assign(stage, language === 'en' ? ENGLISH_STAGES[i] : PORTUGUESE_STAGES[i]));
 if (grid) render();
 renderStatus();
}
const shapes = [
 '<ellipse rx="9" ry="23"/><ellipse rx="9" ry="23" transform="rotate(60)"/><ellipse rx="9" ry="23" transform="rotate(120)"/><circle r="3" fill="currentColor" stroke="none"/>',
 '<path d="M-14 11 0-11 16 10M-14 11 16 10"/><circle cx="-14" cy="11" r="7" fill="var(--tile-bg)"/><circle cy="-11" r="9" fill="var(--tile-bg)"/><circle cx="16" cy="10" r="6" fill="var(--tile-bg)"/>',
 '<path d="m-20-10 11-7 12 7v14l-12 7-11-7Zm23 0 12-7 11 7v14l-11 7L3 4M-9 11v11M15 11v11M-9-17v-7"/><circle cx="-9" cy="-4" r="3"/><circle cx="15" cy="-4" r="3"/>',
 '<ellipse rx="24" ry="15" transform="rotate(-30)"/><path d="m-17 5 5-10 6 8 5-13 6 9 8-6"/>',
 '<path d="M-22 2c-5-18 16-28 32-21s20 31 3 39S-18 22-22 2Z"/><ellipse rx="9" ry="10"/><circle cx="2" cy="-1" r="3"/><path d="m-15-9 4 2m20 18 4-2m0-18 3 4m-26 9 2 5"/>',
 '<path d="m-23-12 11-7 12 7v14l-12 7-11-7Zm23 0 12-7 11 7v14L12 9 0 2M-12 9v13M12 9v13M-12 22 0 15l12 7M0 2v13"/><circle cx="-12" cy="-5" r="3"/><circle cx="12" cy="-5" r="3"/>',
 '<path d="M0 23S-25 6-21-9c3-12 16-12 21-2 5-10 18-10 21 2C25 6 0 23 0 23Z"/><path d="M-16 2h9l4-8 5 15 4-7h10"/>',
 '<circle cy="-18" r="6"/><path d="M0-11v21m-16-13 16 5 16-5M0 10l-11 15M0 10l11 15"/>'
];
function icon(level){return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g transform="translate(32 32)">${shapes[level-1]}</g></svg>`;}
const COLS = 8, ROWS = 16;
let grid, active, nextLevel, score = 0, highest = 1, won = false, best = 0;
let ended = false, timer = null, pointerId = null;
try { best = Number(localStorage.getItem('biomerge-falling-best')) || 0; } catch {}
const board = document.querySelector('#board');
const help = document.querySelector('#help');
const randomLevel = () => Math.random() < .8 ? 1 : 2;
const occupied = (row, col) => row >= ROWS || (row >= 0 && grid[row * COLS + col] !== 0);
function piece(level, row, col, extra = '') {
 const stage = STAGES[level - 1];
 return `<div class="falling-tile ${extra}" style="--row:${row};--col:${col};--tile-bg:${stage.bg};--tile-fg:${stage.fg}" aria-label="${t('piece', {name: stage.name, col: col + 1, row: row + 1})}">${icon(level)}<span class="tile-name">${stage.name}</span></div>`;
}
function landingRow() {
 let row = active.row;
 while (!occupied(row + 1, active.col)) row++;
 return row;
}
function renderBoard() {
 const settled = grid.map((level, i) => level ? piece(level, Math.floor(i / COLS), i % COLS) : '').join('');
 board.querySelector('.settled').innerHTML = settled;
 const falling = board.querySelector('.falling-active');
 const ghost = board.querySelector('.landing-ghost');
 falling.hidden = ghost.hidden = !active;
 if (active) {
  const stage = STAGES[active.level - 1];
  falling.style.cssText = `--row:${active.row};--col:${active.col};--tile-bg:${stage.bg};--tile-fg:${stage.fg};${active.row === 0 ? "transition:none" : ""}`;
  falling.innerHTML = `${icon(active.level)}<span class="tile-name">${stage.name}</span>`;
  falling.setAttribute('aria-label', t('falling', {name: stage.name, col: active.col + 1}));
  ghost.style.cssText = `--row:${landingRow()};--col:${active.col}`;
 }
 board.setAttribute('aria-label', t('board', {cols: COLS, rows: ROWS, cells: COLS * ROWS}) + ' ' + (active ? t('position', {name: STAGES[active.level - 1].name, col: active.col + 1}) : t('ended')));
}
function render() {
 renderBoard();
 document.querySelector('#next-piece').innerHTML = `${icon(nextLevel)}<span>${STAGES[nextLevel - 1].name}</span>`;
 document.querySelector('#score').textContent=formatNumber(score);document.querySelector('#best').textContent=formatNumber(best);
 document.querySelector('#progress').textContent=`${highest} / 8`;
 document.querySelector('#stages').innerHTML=STAGES.map((s,i)=>`<li class="${i+1>highest?'locked':i+1===highest?'current':''}" ${i+1===highest?'aria-current="step"':''}><span class="stage-icon" style="--tile-bg:${s.bg};--tile-fg:${s.fg}">${icon(i+1)}</span><span class="stage-details"><strong>${s.name}</strong><small>${s.sub}</small></span><span class="stage-check" aria-label="${i+1<=highest?t('discovered'):t('locked')}">${i+1<=highest?'✓':'·'}</span></li>`).join('');
 document.querySelector('#fact-text').textContent=STAGES[highest-1].fact;
}
function schedule() {
 clearTimeout(timer);
 if (!ended) timer = setTimeout(tick, 650);
}
function spawn() {
 const available = Array.from({length: COLS}, (_, col) => col).filter(col => !occupied(0, col));
 if (!available.length) {
  ended = true; active = null; clearTimeout(timer);
  document.querySelector('#game-over').hidden = false;
  setStatus('statusEnd', {points: score});
  return;
 }
 const col = available.reduce((a, b) => Math.abs(b - Math.floor(COLS / 2)) < Math.abs(a - Math.floor(COLS / 2)) ? b : a);
 active = {level: nextLevel, row: 0, col};
 nextLevel = randomLevel();
}
function start() {
 clearTimeout(timer); pointerId = null;
 grid = Array(COLS * ROWS).fill(0); score = 0; highest = 1; won = false; ended = false;
 nextLevel = 1;
 board.innerHTML = '<div class="settled"></div><div class="falling-tile landing-ghost" aria-hidden="true"></div><div class="falling-tile falling-active"></div>';
 document.querySelector('#game-over').hidden = true;
 setStatus('statusStart');
 spawn(); render(); schedule();
}
function applyGravity() {
 for (let col = 0; col < COLS; col++) {
  const values = [];
  for (let row = ROWS - 1; row >= 0; row--) {
   if (grid[row * COLS + col]) values.push(grid[row * COLS + col]);
  }
  for (let row = ROWS - 1; row >= 0; row--) {
   grid[row * COLS + col] = values[ROWS - 1 - row] || 0;
  }
 }
}
function resolveMerges() {
 let gained = 0, combinations = 0, createdLevel = 0;
 const sideways = document.querySelector('#sideways-merge').checked;
 // Resolve um par por vez, de baixo para cima, e reaplica a gravidade.
 // O destino é sempre a casa inferior ou a casa à esquerda do par.
 while (true) {
  let pair = null;
  for (let row = ROWS - 1; row >= 0 && !pair; row--) {
   for (let col = 0; col < COLS && !pair; col++) {
    const index = row * COLS + col, level = grid[index];
    if (!level || level === STAGES.length) continue;
    if (row > 0 && grid[index - COLS] === level) pair = [index, index - COLS];
    else if (sideways && col + 1 < COLS && grid[index + 1] === level) pair = [index, index + 1];
   }
  }
  if (!pair) break;
  const [target, source] = pair;
  grid[target]++; grid[source] = 0;
  gained += 2 ** grid[target]; combinations++;
  createdLevel = Math.max(createdLevel, grid[target]);
  applyGravity();
 }
 return {gained, combinations, createdLevel};
}
function settle() {
 pointerId = null;
 const {level, row, col} = active;
 grid[row * COLS + col] = level;
 const {gained, combinations, createdLevel} = resolveMerges();
 score += gained;
 if (score > best) { best = score; try { localStorage.setItem('biomerge-falling-best', String(best)); } catch {} }
 highest = Math.max(highest, level, createdLevel);
 if (gained) setStatus('statusMerge', {level: createdLevel, points: gained, chain: combinations > 1});
 else setStatus('statusContinue');
 if (highest === STAGES.length && !won) { won = true; setStatus('statusWin'); }
 spawn(); render(); schedule();
}

function tick() {
 if (ended) return;
 if (help.open || document.hidden) { schedule(); return; }
 if (occupied(active.row + 1, active.col)) settle();
 else { active.row++; renderBoard(); schedule(); }
}
function control(action) {
 if (ended || !active || help.open) return;
 if (action === 'drop' || action === 'down') { active.row = landingRow(); settle(); return; }
 const col = active.col + (action === 'left' ? -1 : 1);
 if (col >= 0 && col < COLS && !occupied(active.row, col)) { active.col = col; renderBoard(); }
}
const keyMap = {ArrowLeft:'left', ArrowRight:'right', ArrowDown:'down', a:'left', d:'right', s:'down', ' ':'drop'};
document.addEventListener('keydown', event => {
 if (help.open || event.ctrlKey || event.altKey || event.metaKey || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)) return;
 const action = keyMap[event.key];
 if (action) { event.preventDefault(); if ((action !== 'drop' && action !== 'down') || !event.repeat) control(action); }
});
document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => { control(button.dataset.direction); board.focus(); }));
function aim(event) {
 if (!active || ended || help.open) return;
 const rect = board.getBoundingClientRect();
 const target = Math.max(0, Math.min(COLS - 1, Math.floor((event.clientX - rect.left) / rect.width * COLS)));
 while (active.col !== target) {
  const previous = active.col;
  control(active.col < target ? 'right' : 'left');
  if (active.col === previous) break;
 }
}
board.addEventListener('pointerdown', event => {
 if (event.button !== 0) return;
 pointerId = event.pointerId; board.setPointerCapture(pointerId); aim(event); board.focus();
});
board.addEventListener('pointermove', event => { if (pointerId === event.pointerId) aim(event); });
board.addEventListener('pointerup', event => { if (pointerId === event.pointerId) { aim(event); pointerId = null; control('drop'); } });
board.addEventListener('pointercancel', () => { pointerId = null; });
document.querySelector('#restart').addEventListener('click', start);
document.querySelector('#play-again').addEventListener('click', start);
document.querySelector('#help-button').addEventListener('click', () => help.showModal());
document.querySelector('#close-help').addEventListener('click', () => help.close());
document.querySelector('#start-playing').addEventListener('click', () => { help.close(); board.focus(); });
document.querySelector('#language').addEventListener('change', event => setLanguage(event.target.value));
setLanguage(language);
start();
