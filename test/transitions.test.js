import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../src/index.template.html',import.meta.url),'utf8');
const fn=src.slice(src.indexOf('  function transitionPage('),src.indexOf('  function animateView('));
function fixture(document={},reduce=false){
 const scope={document,reduce,hero:{style:{display:'none'}},activeTransition:null,navigationToken:0};
 vm.createContext(scope);vm.runInContext(fn,scope);return scope;
}
test('fast navigation discards superseded updates',async()=>{
 const pending=[];let skipped=0,view='';
 const scope=fixture({startViewTransition:update=>{pending.push(update);return {skipTransition:()=>skipped++,finished:Promise.resolve()}}});
 scope.transitionPage(()=>view='goal');scope.transitionPage(()=>view='portfolio');
 pending[0]();assert.equal(view,'');pending[1]();assert.equal(view,'portfolio');assert.equal(skipped,1);
 await Promise.resolve();
});
test('unsupported and reduced-motion navigation stays immediate',()=>{
 for(const scope of [fixture(),fixture({startViewTransition:()=>{throw new Error('Should not run')}},true)]){let updated=false;scope.transitionPage(()=>updated=true);assert.equal(updated,true)}
});
test('animation API failure never prevents navigation',()=>{
 const scope=fixture({startViewTransition:()=>{throw new Error('Unavailable')}});let updated=false;scope.transitionPage(()=>updated=true);assert.equal(updated,true);
});
