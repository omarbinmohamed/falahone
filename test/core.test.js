import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {screen, calculate, mix, builtin,questions} from '../public/core.js';
const {stocks}=JSON.parse(await readFile(new URL('../public/safar_data.json',import.meta.url)));
test('all 15 supplied verdicts',()=>{assert.equal(stocks.length,15);for(const s of stocks)assert.equal(screen(s).verdict,s.expected_verdict,s.ticker);});
test('calculator 6% / 5 years and zero growth',()=>{const c=calculate(100000,6,5);assert.ok(Math.abs(c.monthly-1433.28015)<.01);assert.ok(Math.abs(c.invested-85996.81)<.1);assert.ok(Math.abs(c.growth-14003.19)<.1);assert.equal(calculate(100000,0,5).monthly,100000/60);});
test('model mix boundary years',()=>{assert.deepEqual([2,3,5,7].map(mix),[[65,25,10],[50,20,30],[35,15,50],[20,10,70]]);});
test('all question fallbacks, scope and unknown stock',()=>{assert.equal(questions.length,13);for(const q of questions)assert.ok(builtin(q,stocks).length>40);assert.match(builtin('Is Microsoft stock halal?',stocks),/haven't screened/);assert.match(builtin('Calculate my zakah',stocks),/qualified scholar/);assert.match(builtin(questions[11],stocks),/ഹലാൽ/);assert.match(builtin(questions[12],stocks),/हलाल/);});

test('translated fallbacks preserve failed business and Islamic FI exception',()=>{assert.match(builtin('JPM हलाल?',stocks),/हलाल नहीं/);assert.match(builtin('JPM हलाल?',stocks),/मुख्य व्यवसाय अनुमत नहीं/);assert.match(builtin('DIB ഹലാൽ?',stocks),/ബിസിനസിന്റെ അടിസ്ഥാനത്തിലാണ്/);});

test('stock explanations omit standards in all supported fallback languages',()=>{for(const q of ['Is Tesla halal?','JPM हलाल?','DIB ഹലാൽ?'])assert.doesNotMatch(builtin(q,stocks),/AAOIFI|Std 21|3\/4\//);});
