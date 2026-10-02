import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../src/index.template.html',import.meta.url),'utf8');
const script=src.split('/* ---------- loader ---------- */')[1].split('/* ---------- navigation ---------- */')[0];
function intro(reduced=false){
 let now=0,id=0;const jobs=new Map(),ev={},classes=new Set();
 const elements={hero:{classList:{add:x=>classes.add('hero-'+x)}},loader:{style:{},classList:{add:x=>classes.add(x)},addEventListener:(e,f)=>ev[e]=f},ldbar:{style:{}},ldpct:{textContent:''}};
 const schedule=(f,t)=>{jobs.set(++id,{f,t:now+t});return id};
 vm.runInNewContext(script,{$:s=>elements[s.slice(1)],matchMedia:()=>({matches:reduced}),Date:{now:()=>now},setTimeout:schedule,requestAnimationFrame:f=>schedule(f,10),document:{addEventListener:(e,f)=>ev[e]=f}});
 const advance=ms=>{let end=now+ms;while(true){const n=[...jobs].sort((a,b)=>a[1].t-b[1].t)[0];if(!n||n[1].t>end)break;now=n[1].t;jobs.delete(n[0]);n[1].f()}now=end};
 return {elements,classes,advance,ev};
}
test('reference loader fills over 2.2s, holds wordmark and fades',()=>{let p=intro();p.advance(1100);assert.equal(p.elements.ldpct.textContent,'75%');p.advance(1100);assert.equal(p.elements.ldpct.textContent,'100%');assert.ok(p.classes.has('done'));p.advance(1200);assert.ok(p.classes.has('out'));assert.ok(p.classes.has('hero-ready'));p.advance(650);assert.equal(p.elements.loader.style.display,'none')});
test('tap or any key skips loader immediately',()=>{for(const e of ['click','keydown','touchstart']){const p=intro();p.ev[e]();assert.equal(p.elements.loader.style.display,'none');p.advance(4000);assert.equal(p.elements.loader.style.display,'none')}});
test('reduced motion shows static wordmark for one second',()=>{const p=intro(true);assert.ok(p.classes.has('done'));p.advance(999);assert.notEqual(p.elements.loader.style.display,'none');p.advance(1);assert.equal(p.elements.loader.style.display,'none')});
