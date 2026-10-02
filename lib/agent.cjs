// Safr agent: OpenAI Responses API with function calling. Runs on the server only.
const makeCore = require('./core.cjs');
const DATA = require('../data.json');
const PROMPT = require('./agent_prompt.cjs');
const C = makeCore(DATA);

const TOOLS = [
  { type: 'function', strict: true, name: 'screen_stock', description: 'Look up a stock in the Safr screening dataset by company name or ticker. The only source for halal or not halal verdicts.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false } },
  { type: 'function', strict: true, name: 'get_mix', description: 'Model mix (sukuk, gold, halal stocks) for a number of years to the goal.', parameters: { type: 'object', properties: { years: { type: 'number' } }, required: ['years'], additionalProperties: false } },
  { type: 'function', strict: true, name: 'set_goal', description: 'Save the goal and return the monthly amount. The growth rate is the user\'s own assumption.', parameters: { type: 'object', properties: { goal: { type: 'string' }, amount: { type: 'number' }, years: { type: 'number' }, rate: { type: 'number' } }, required: ['goal', 'amount', 'years', 'rate'], additionalProperties: false } },
  { type: 'function', strict: true, name: 'add_to_portfolio', description: 'Add a screened Halal stock the user asked for to their plan. Fails for Not halal or unscreened stocks.', parameters: { type: 'object', properties: { ticker: { type: 'string' }, weight: { type: 'number' } }, required: ['ticker', 'weight'], additionalProperties: false } }
];

function runTool(name, args, ctx) {
  if (name === 'screen_stock') {
    const s = C.find(args.query) || C.find(String(args.query || '').toUpperCase());
    if (!s) {
      const e = C.findEtf(args.query);
      if (e) return { found: false, etf: true, note: 'Halal-labelled by its issuer. Not screened by Safr. No verdict.' };
      ctx.notFound.push(String(args.query || ''));
      return { found: false, note: 'Not in the Safr dataset. Give no verdict.' };
    }
    ctx.screened.push(s);
    return { found: true, ticker: s.t, company: s.n, verdict: s.halal ? 'Halal' : 'Not halal', income_unverified: s.unverified, text: C.stockText(s) };
  }
  if (name === 'get_mix') return C.mixFor(Number(args.years) || 0);
  if (name === 'set_goal') {
    const amount = Math.max(5000, Math.min(2000000, Number(args.amount) || 0));
    const years = Math.max(1, Math.min(30, Number(args.years) || 0));
    const rate = Math.max(0, Math.min(12, Number(args.rate) || 0));
    const r = C.calc(amount, years, rate);
    ctx.actions.push({ type: 'set_goal', goal: String(args.goal || ''), amount, years, rate });
    ctx.goal = { amount, years, rate };
    let left = C.mixFor(years).stocks; ctx.portfolio = ctx.portfolio.filter(p => { p.w = Math.min(p.w, left); left -= p.w; return p.w > 0; });
    return { monthly_aed: Math.round(r.monthly), invested_aed: Math.round(r.invest), growth_aed: Math.round(r.growth), note: 'Illustration, not a prediction.' };
  }
  if (name === 'add_to_portfolio') {
    const s = C.find(String(args.ticker || '').toUpperCase()) || C.find(args.ticker);
    if (!s) return { ok: false, reason: 'Not screened yet, cannot add.' };
    if (!s.halal) return { ok: false, reason: 'Not halal, cannot add.' };
    const years = (ctx.goal && ctx.goal.years) || (ctx.state && ctx.state.years) || 5;
    const cap = C.mixFor(years).stocks;
    if (ctx.portfolio.some(p => p.t === s.t)) return { ok: false, reason: 'Already in the plan.' };
    const used = ctx.portfolio.reduce((a, p) => a + p.w, 0);
    const w = Math.max(0, Math.min(Number(args.weight) || 0, cap - used));
    if (w <= 0) return { ok: false, reason: 'No room left in the stock share of the mix (' + cap + '%).' };
    ctx.portfolio.push({ t: s.t, w });
    ctx.actions.push({ type: 'add', t: s.t, w });
    return { ok: true, added: s.t, weight: w, stock_share_left: cap - used - w };
  }
  return { error: 'unknown tool' };
}

async function callOpenAI(key, model, body) {
  const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(Object.assign({ model, store: false }, Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'timeoutMs')))), signal: AbortSignal.timeout(body.timeoutMs || 8000) });
  if (!r.ok) { const error = new Error('Provider unavailable'); error.status = r.status; throw error; }
  const data = await r.json();
  return data;
}
const textOf = (o) => (o || []).filter(x => x.type === 'message').flatMap(x => x.content || []).filter(c => c.type === 'output_text').map(c => c.text).join('');

async function ask(body, ip) {
  const key = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  if (!key) return { status: 500, json: { error: 'Set OPENAI_API_KEY and OPENAI_MODEL' } };
  const message = body && typeof body.message === 'string' ? body.message.slice(0, 1500) : '';
  if (!message) return { status: 400, json: { error: 'bad message' } };
  const history = Array.isArray(body.history) ? body.history.slice(-6).filter(h => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string').map(h => ({ role: h.role, content: h.content.slice(0, 1500) })) : [];
  const st = body.state && typeof body.state === 'object' ? body.state : {};
  const ctx = { actions: [], screened: [], notFound: [], state: st, goal: null, portfolio: Array.isArray(st.portfolio) ? st.portfolio.filter(p => p && typeof p.t === 'string').map(p => ({ t: p.t, w: Number(p.w) || 0 })) : [] };
  let room = C.mixFor(Number(st.years) || 5).stocks; const seen = new Set();
  ctx.portfolio = ctx.portfolio.filter(p => { const s = C.find(p.t); if (!s || !s.halal || seen.has(s.t) || !Number.isFinite(p.w) || p.w <= 0) return false; seen.add(s.t); p.t = s.t; p.w = Math.min(p.w, room); room -= p.w; return p.w > 0; });
  const context = 'Person: ' + (typeof st.name === 'string' && st.name ? st.name.slice(0, 40) : 'unknown') + (Number(st.age) >= 18 ? ', age ' + Math.min(90, Number(st.age)) : '') + '. Current plan state: goal=' + (st.goal || 'not set') + ', amount=AED ' + (st.amount || '?') + ', years=' + (st.years || '?') + ', growth assumption=' + (st.rate != null ? st.rate : '?') + '%, portfolio=' + (ctx.portfolio.map(p => p.t + ' ' + p.w + '%').join(', ') || 'empty') + '.';
  let input = history.concat([{ role: 'user', content: message }]);
  try {
    let text = ''; const deadline = Date.now() + 8000;
    for (let i = 0; i < 5; i++) {
      const data = await callOpenAI(key, model, { instructions: PROMPT + '\n\n' + context, input, tools: i < 4 ? TOOLS : [], max_output_tokens: 700, timeoutMs: Math.max(1, deadline - Date.now()) });
      const calls = (data.output || []).filter(o => o.type === 'function_call');
      if (!calls.length) { text = textOf(data.output); break; }
      input = input.concat(data.output);
      for (const c of calls) {
        let args = {}; try { args = JSON.parse(c.arguments || '{}'); } catch (e) {}
        input.push({ type: 'function_call_output', call_id: c.call_id, output: JSON.stringify(runTool(c.name, args, ctx)) });
      }
    }
    text = (text || '').trim();
    // Guards: verdicts come from data only.
    if (ctx.notFound.length) text = "Safr hasn't screened this yet, so I can't give a verdict. Screening is informational, not a fatwa.";
    if (ctx.screened.length) text = ctx.screened.map(C.stockText).join('\n\n');
    const verified = ctx.screened.map(s => ({ t: s.t, n: s.n, verdict: s.halal ? 'Halal' : 'Not halal' }));
    return { status: 200, json: { text, actions: ctx.actions, verified } };
  } catch (e) {
    return { status: 502, json: { error: 'Live assistant unavailable', providerStatus: e.status || null } };
  }
}
module.exports = { ask, runTool, TOOLS };
