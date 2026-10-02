// Stored copy is authoritative. Matching never asks an AI to rewrite an answer.
const normalize=value=>String(value||'').toLowerCase().replace(/[’']/g,'').replace(/[^\p{L}\p{N}%]+/gu,' ').trim();
export function answerTag(basis){return ['AAOIFI','General','Personal'].includes(basis)?basis:'General';}
export function matchQAPack(question,pack){
 const q=normalize(question);if(!q)return null;
 const byId=id=>pack.find(entry=>entry.id===id)||null;
 const exact=pack.find(entry=>normalize(entry.question)===q);if(exact&&exact.id!=='zakat_amount')return exact;
 const purification=/\bpurif\w*\b/.test(q),zakat=/\b(zakat|zakah|zakaat)\b/.test(q);
 const personalAmount=/\b(calculate|compute|owe|amount|how much|my|mine|i own|i hold)\b/.test(q)||/\d/.test(q);
 // Personal amounts never use the worked-example answers or calculate a sum.
 if((purification||zakat)&&personalAmount)return byId(zakat?'zakat':'purify_who');
 if(purification){
  if(/\b(example|illustration|tesla|nvidia|coca cola)\b/.test(q))return byId('purify_example');
  if(/\b(where|charity|tax|taxes)\b/.test(q))return byId('purify_where');
  if(/\b(dividend|dividends)\b/.test(q))return byId('dividend_purify');
  if(/\b(who|when|period|sold)\b/.test(q))return byId('purify_who');
  return byId('purify');
 }
 if(zakat)return byId('zakat');
 if(/how can (a |an )?(stock|share) be halal|what makes (a |an )?(stock|share|company) halal|halal (criteria|rules|screening)/.test(q))return byId('stock_halal');
 const keywords=[['riba','riba'],['takaful','takaful'],['gold','gold'],['etf','etf'],['etfs','etf'],['fatwa','fatwa'],['aaoifi','aaoifi'],['gharar','gharar'],['crypto','crypto']];
 for(const [word,id]of keywords)if(q.split(' ').includes(word))return byId(id);
 if(/\bsukuk\b/.test(q))return byId(/\b(mix|short|shorter|goals)\b/.test(q)?'safr_mix':'sukuk');
 if(/\b(licensed|licence|license|licensing)\b/.test(q)&&/\b(safr|falahone)\b/.test(q))return byId('safr_licensed');
 if(/\b(safr|falahone)\b/.test(q)&&/\b(hold|holds|collect|custody)\b/.test(q))return byId('safr_money');
 if(/\b(guarantee|guarantees|guaranteed)\b/.test(q)&&/\b(safr|returns|growth)\b/.test(q))return byId('safr_guarantee');
 return null;
}
