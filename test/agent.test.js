import test from 'node:test';
import assert from 'node:assert/strict';
import agent from '../lib/agent.cjs';
const call=(name,args)=>({output:[{type:'function_call',name,call_id:'call1',arguments:JSON.stringify(args)}]});
const say=text=>({output:[{type:'message',content:[{type:'output_text',text}]}]});
test('Responses tool loop validates screening, unknown assets, weight cap and provider failures',async()=>{
 const oldFetch=global.fetch,key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';
 let bodies=[];
 const mock=steps=>{let i=0;global.fetch=async(url,o)=>{bodies.push(JSON.parse(o.body));return{ok:true,json:async()=>steps[i++]}}};
 try {
  mock([call('screen_stock',{query:'Tesla'}),say('Tesla is awful. Buy it.')]);
  let r=await agent.ask({message:'Is Tesla halal?'});assert.equal(r.status,200);assert.equal(r.json.verified[0].verdict,'Halal');assert.match(r.json.text,/Borrowing is within/);assert.doesNotMatch(r.json.text,/AAOIFI|Std 21|3\/4\/2/);assert.match(r.json.text,/not a fatwa/);assert.ok(!r.json.text.includes('Buy it'));
  assert.equal(bodies[0].store,false);assert.equal(bodies[0].tools.length,4);assert.ok(bodies[0].tools.every(t=>t.strict));assert.equal(bodies[1].input.at(-1).type,'function_call_output');
  mock([call('screen_stock',{query:'Microsoft'}),say('Looks halal.')]);r=await agent.ask({message:'Microsoft?'});assert.match(r.json.text,/hasn't screened/);assert.ok(!r.json.text.includes('Looks halal'));
  mock([call('add_to_portfolio',{ticker:'DEWA',weight:10}),say('Could not add')]);r=await agent.ask({message:'add DEWA',state:{years:5}});assert.equal(r.json.actions.length,0);
  mock([call('add_to_portfolio',{ticker:'TSLA',weight:90}),say('Added')]);r=await agent.ask({message:'add Tesla',state:{years:5,portfolio:[{t:'DEWA',w:99},{t:'madeup',w:-99}]}});assert.equal(r.json.actions[0].w,50);
  mock([call('set_goal',{goal:'Home',amount:100000,years:5,rate:6}),say('Set')]);r=await agent.ask({message:'Set home goal'});assert.equal(r.json.actions[0].amount,100000);
  global.fetch=async()=>({ok:false,status:401});r=await agent.ask({message:'Hello'});assert.equal(r.status,502);assert.equal(r.json.error,'Live assistant unavailable');
 }finally{global.fetch=oldFetch;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key}
});
test('tool rejects duplicates, negative weights and caps after shorter goal',()=>{
 const ctx={actions:[],screened:[],notFound:[],state:{years:5},goal:null,portfolio:[]};
 assert.equal(agent.runTool('add_to_portfolio',{ticker:'TSLA',weight:-10},ctx).ok,false);
 assert.equal(agent.runTool('add_to_portfolio',{ticker:'TSLA',weight:50},ctx).ok,true);
 assert.equal(agent.runTool('add_to_portfolio',{ticker:'TSLA',weight:10},ctx).ok,false);
 agent.runTool('set_goal',{goal:'Cushion',amount:30000,years:1,rate:2},ctx);assert.equal(ctx.portfolio[0].w,10);
});
