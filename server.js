import agent from './lib/agent.cjs';
import makeCore from './lib/core.cjs';
import {matchQAPack} from './public/qa.js';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {builtin,localAnswer,journeyAnswers} from './public/core.js';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const {stocks} = JSON.parse(await readFile(path.join(root,'safar_data.json'),'utf8'));
const screenCore=makeCore({stocks});
const qaPack=JSON.parse(await readFile(path.join(root,'qa_pack.json'),'utf8'));
const visitors = new Map();
let total = 0;
const windowMs = 60000;
setInterval(()=>{const now=Date.now(); for(const [ip,v] of visitors) if(now-v.start>=windowMs) visitors.delete(ip);},windowMs).unref();
function send(res,status,body,extra={}) {if(body.answer && !body.text)body.text=body.answer;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(body));}
const server = http.createServer(async(req,res)=>{
 try {
  const url = new URL(req.url,'http://localhost');
  if(req.method==='GET' && (url.pathname==='/health'||url.pathname==='/api/health')) return send(res,200,{ok:true});
  if(url.pathname==='/api/ask') {
   if(req.method!=='POST') return send(res,405,{answer:builtin('',stocks),source:'builtin'},{Allow:'POST'});
   let body='';
   for await(const chunk of req) {body+=chunk; if(Buffer.byteLength(body)>16384) return send(res,413,{answer:builtin('',stocks),source:'builtin'});}
   let input;try{input=JSON.parse(body);}catch{return send(res,400,{answer:builtin('',stocks),source:'builtin'});}
   const question = typeof input?.question==='string' ? input.question.trim().slice(0,2000) : typeof input?.message==='string' ? input.message.trim().slice(0,2000) : '';
   const stored=matchQAPack(question,qaPack);
   const asset=screenCore.find(question);
   const fallback = stored?.answer||(asset ? screenCore.stockText(asset) : builtin(question,stocks,qaPack));
   const basis=stored?.basis||'General';
   // Trust only the direct peer. Forwarded headers cannot reset the rate limit.
   const ip=req.socket.remoteAddress || 'unknown', now=Date.now();
   let visitor=visitors.get(ip);if(!visitor || now-visitor.start>=windowMs){visitor={start:now,count:0};visitors.set(ip,visitor);}
   if(visitor.count>=10 || total>=1500) return send(res,429,{answer:fallback,source:'builtin',basis,limited:true},{'Retry-After':String(Math.max(1,Math.ceil((windowMs-(now-visitor.start))/1000)))});
   visitor.count++;total++;
   if(!question || /\b(halal|haram|screen|screened|screening)\b/i.test(question) || stored || localAnswer(question,qaPack)!==null || !process.env.OPENAI_API_KEY) return send(res,200,{answer:fallback,source:'builtin',basis});
   try {
    const result = await agent.ask({...input,message:question},ip);
    if(result.status!==200 || !result.json.text) throw new Error(result.json.providerStatus ? 'Provider status '+result.json.providerStatus : 'Provider unavailable');
    return send(res,200,{...result.json,answer:result.json.text,source:'openai'});
   } catch (error) {console.warn('Using built-in answer:', error.name === 'TimeoutError' ? 'provider timeout' : error.message);return send(res,200,{answer:fallback,source:'builtin',basis});}
  }
  if(req.method!=='GET' && req.method!=='HEAD') return send(res,405,{ok:false},{Allow:'GET, HEAD'});
  const files={'/':'index.html','/app.js':'app.js','/core.js':'core.js','/qa.js':'qa.js','/qa_pack.json':'qa_pack.json','/style.css':'style.css','/safar_data.json':'safar_data.json'};
  for(const weight of [400,500,700,900])files[`/fonts/archivo-latin-${weight}-normal.woff2`]=`fonts/archivo-latin-${weight}-normal.woff2`;
  for(const name of ['cal-sans-latin-400-normal.woff2','inter-latin-wght-normal.woff2','urbanist-latin-wght-normal.woff2'])files['/fonts/'+name]='fonts/'+name;
  for(const name of ['cusp','sarwa','tabadulat','wahed'])files['/logos/'+name+'.svg']='logos/'+name+'.svg';
  const file=files[url.pathname];if(!file) return send(res,404,{ok:false});
  const content=await readFile(path.join(root,file));
  const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(file)];
  res.writeHead(200,{'Content-Type':type+'; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD' ? undefined : content);
 } catch {if(!res.headersSent)send(res,500,{answer:builtin('',stocks),source:'builtin'});else res.end();}
});
server.listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log(`Safr listening on port ${server.address().port}; ${process.env.OPENAI_API_KEY ? 'OpenAI enabled with built-in fallback' : 'built-in answers (no OpenAI key)'}`));
