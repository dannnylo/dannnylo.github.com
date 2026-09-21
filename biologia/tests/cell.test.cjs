const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../celula.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function setup(storage=new Map()){
 const elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{setAttribute(){},addEventListener(){},focus(){},classList:{toggle(){}}});return elements.get(id);};
 const context=vm.createContext({document:{documentElement:{},querySelector:element,querySelectorAll:()=>[]},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}});
 vm.runInContext(source,context);
 return code=>vm.runInContext(code,context);
}
test('12 bilingual structures with sensible animal and plant filters',()=>{
 const run=setup();
 assert.equal(run('pool().length'),12);
 assert.equal(run('PARTS.every(p=>p.pt.name&&p.pt.function&&p.pt.hint&&p.en.name&&p.en.function&&p.en.hint)'),true);
 run('filter="animal"');assert.equal(run('pool().length'),9);
 assert.equal(run('pool().some(p=>p.id==="chloroplast")'),false);
 run('filter="plant"');assert.equal(run('pool().length'),11);
 assert.equal(run('pool().some(p=>p.id==="mitochondria")'),true);
 assert.equal(run('pool().some(p=>p.id==="lysosome")'),false);
});
test('quiz includes each question once and four unique choices including the answer',()=>{
 const run=setup();run('startQuiz()');
 assert.equal(run('new Set(questions.map(q=>q.part.id)).size'),12);
 assert.equal(run('questions.every(q=>new Set(q.options.map(p=>p.id)).size===4&&q.options.some(p=>p.id===q.part.id))'),true);
});
test('quiz scores once, requires an answer and completes correctly',()=>{
 const run=setup();run('startQuiz();advance()');assert.equal(run('questionIndex'),0);
 run('choose(questions[0].part.id);choose(questions[0].part.id)');assert.equal(run('correctCount'),1);
 run('advance();while(!finished){choose(questions[questionIndex].part.id);advance();}');
 assert.equal(run('correctCount'),12);assert.equal(run('mistakes.length'),0);
});
test('mistake review asks only missed questions and keeps enough distractors',()=>{
 const run=setup();run('startQuiz();const missed=questions[0].part.id;choose(questions[0].options.find(p=>p.id!==missed).id);advance();while(!finished){choose(questions[questionIndex].part.id);advance();}');
 assert.equal(run('correctCount'),11);
 run('startQuiz([...mistakes])');assert.equal(run('questions.length'),1);
 assert.equal(run('questions[0].part.id===missed'),true);
 assert.equal(run('questions[0].options.length'),4);
});
test('language changes preserve current question and answer',()=>{
 const run=setup();run('startQuiz();choose(questions[0].part.id);const saved=JSON.stringify({questions,chosen,correctCount});setLanguage("pt")');
 assert.equal(run('JSON.stringify({questions,chosen,correctCount})===saved'),true);
 assert.equal(run('document.documentElement.lang'),'pt-BR');
 assert.equal(run('tr("correct")'),'Acertou!');
});
test('memorized cards survive reloads and can be unmarked',()=>{
 const storage=new Map();const run=setup(storage);run('mark();setLanguage("pt")');
 const next=setup(storage);assert.equal(next('known.has(PARTS[0].id)'),true);assert.equal(next('lang'),'pt');
 next('mark()');assert.equal(next('known.size'),0);
});
test('invalid saved progress is ignored and cards wrap',()=>{
 const run=setup(new Map([['biomerge-cell-known','{"invalid":true}']]));
 assert.equal(run('known.size'),0);run('moveCard(-1)');assert.equal(run('cardIndex'),11);
 run('moveCard(1)');assert.equal(run('cardIndex'),0);
});
