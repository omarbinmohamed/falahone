// Safr core: screening, goal maths and mix. Used by the server (agent tools) and inlined into the page.
function makeCore(D) {
  var LIM = { debt: 0.30, cash: 0.30, inc: 0.05 };
  var ALIASES = {
    NVDA: ['nvidia'], AAPL: ['apple'], TSLA: ['tesla'], KO: ['coca-cola', 'coca cola', 'coke'],
    T: ['at&t', 'att'], F: ['ford'], JPM: ['jpmorgan', 'jp morgan', 'jpmorgan chase', 'chase'],
    BUD: ['anheuser-busch', 'anheuser busch', 'ab inbev', 'budweiser'], ADNOCGAS: ['adnoc gas', 'adnoc'],
    SALIK: ['salik'], DIB: ['dubai islamic bank', 'dubai islamic', 'dib'],
    DEWA: ['dewa', 'dubai electricity', 'dubai electricity & water'], EAND: ['e&', 'etisalat', 'eand'],
    ALDAR: ['aldar', 'aldar properties'], FAB: ['first abu dhabi bank', 'first abu dhabi', 'fab']
  };
  var ETFS = [
    { t: 'SPUS', n: 'SP Funds S&P 500 Sharia Industry Exclusions ETF', a: ['spus', 'sp funds'] },
    { t: 'HLAL', n: 'Wahed FTSE USA Shariah ETF', a: ['hlal', 'wahed'] },
    { t: 'ISWD', n: 'iShares MSCI World Islamic UCITS ETF', a: ['iswd', 'ishares islamic', 'msci world islamic'] }
  ];
  function p2(x) { return (Math.round(x * 10000) / 100).toFixed(2); }
  function sgn(x) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1) + '%'; }
  var stocks = D.stocks.map(function (s) {
    var debt = s.total_debt_bn / s.market_cap_bn;
    var cash = s.cash_st_investments_bn / s.market_cap_bn;
    var inc = (s.non_compliant_income_m != null && s.revenue_m) ? s.non_compliant_income_m / s.revenue_m : null;
    var verdict = s.expected_verdict;
    var halal = /^Halal/.test(verdict);
    var tests = [];
    if (s.business_screen === 'Fail') {
      tests.push({ k: 'biz', label: 'Core business', pass: false, text: s.business_note, clause: '3/4/1' });
    } else if (s.business_screen === 'Islamic FI') {
      tests.push({ k: 'biz', label: 'Core business', pass: true, text: 'Islamic financial institution. Interest-based ratio tests are not applied (Falahone methodology note).', clause: '' });
    } else {
      tests.push({ k: 'biz', label: 'Core business', pass: s.business_screen !== 'Review', text: s.business_screen === 'Review' ? 'Mixed business lines (' + s.business_note + ')' : 'Permissible core business', clause: '3/4/1' });
      tests.push({ k: 'debt', label: 'Interest-based borrowing', value: debt, limit: LIM.debt, pass: debt <= LIM.debt, clause: '3/4/2', unit: 'of market cap' });
      tests.push({ k: 'cash', label: 'Interest-bearing deposits', value: cash, limit: LIM.cash, pass: cash <= LIM.cash, clause: '3/4/3', unit: 'of market cap' });
      tests.push({ k: 'inc', label: 'Prohibited income', value: inc, limit: LIM.inc, pass: inc == null ? true : inc <= LIM.inc, clause: '3/4/4', unit: 'of total income', unverified: inc == null });
    }
    var failing = tests.filter(function (t) { return !t.pass; });
    var summary;
    if (halal) summary = s.business_screen === 'Islamic FI' ? 'Islamic bank: passes, with the ratio tests not applied.' : 'Its main business is permissible, and its available financial figures pass the halal checks.';
    else if (s.business_screen === 'Fail') summary = 'Fails the business test: ' + s.business_note.toLowerCase() + '.';
    else summary = 'Fails on ' + failing.map(function (t) { return t.k === 'biz' ? 'business mix' : t.label.toLowerCase(); }).join(', ') + '.';
    return {
      t: s.ticker, n: s.company, market: s.market, cur: s.currency, biz: s.business, bs: s.business_screen,
      note: s.business_note, verdict: verdict, halal: halal, unverified: /unverified/.test(verdict),
      tests: tests, summary: summary, chg: s.price_change_12m_pct, chgDate: s.price_change_as_of,
      incomeM: s.non_compliant_income_m, mcapBn: s.market_cap_bn,
      aliases: (ALIASES[s.ticker] || []).concat([s.company.toLowerCase(), s.ticker.toLowerCase()])
    };
  });
  function esc(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // Find a stock inside a sentence (names only, short tickers must be the whole query)
  function find(q) {
    q = String(q || '').toLowerCase().trim();
    if (!q) return null;
    for (var i = 0; i < stocks.length; i++) if (q === stocks[i].t.toLowerCase()) return stocks[i];
    for (var j = 0; j < stocks.length; j++) {
      var s = stocks[j];
      for (var k = 0; k < s.aliases.length; k++) {
        var a = s.aliases[k];
        if (a.length <= 3 && q !== a) continue;
        if (new RegExp('(^|[^a-z0-9])' + esc(a) + '($|[^a-z0-9])').test(q)) return s;
      }
    }
    return null;
  }
  function findEtf(q) {
    q = String(q || '').toLowerCase().trim();
    for (var i = 0; i < ETFS.length; i++) for (var k = 0; k < ETFS[i].a.length; k++) if (q.indexOf(ETFS[i].a[k]) !== -1) return ETFS[i];
    return null;
  }
  function suggest(q) {
    q = String(q || '').toLowerCase().trim();
    if (!q) return [];
    return stocks.filter(function (s) {
      return s.aliases.some(function (a) { return a.indexOf(q) === 0 || (q.length > 1 && a.indexOf(q) !== -1); });
    }).slice(0, 6);
  }
  function testLine(t) {
    if (t.k === 'biz') return t.text.replace(' (Falahone methodology note).', '.');
    if (t.unverified) return 'Interest income is not published, so this part of the check is unverified.';
    var subject = t.k === 'debt' ? 'Borrowing' : t.k === 'cash' ? 'Interest-bearing deposits' : 'Income from prohibited sources';
    return subject + (t.k === 'cash' ? ' are ' : ' is ') + (t.pass ? 'within the screening limit.' : 'above the screening limit.');
  }
  function perfLine(s) { return sgn(s.chg) + ' over 12 months (price only), as of ' + s.chgDate + '.'; }
  function stockText(s) {
    var head = s.n + ' (' + s.t + '): ' + (s.halal ? 'Halal' : 'Not halal') + (s.unverified ? ', income unverified' : '') + '. ' + s.summary;
    return head + '\n\n' + s.tests.map(testLine).join('\n') + '\n\n' + perfLine(s) + '\n\nScreening is informational, not a fatwa.';
  }
  function mixFor(y) {
    if (y < 3) return { sukuk: 65, gold: 25, stocks: 10 };
    if (y < 5) return { sukuk: 50, gold: 20, stocks: 30 };
    if (y < 7) return { sukuk: 35, gold: 15, stocks: 50 };
    return { sukuk: 20, gold: 10, stocks: 70 };
  }
  function calc(goal, years, ratePct) {
    var n = Math.round(years * 12), i = ratePct / 100 / 12, m;
    if (n <= 0) return { monthly: 0, invest: 0, growth: 0 };
    m = i === 0 ? goal / n : goal * i / (Math.pow(1 + i, n) - 1);
    return { monthly: m, invest: m * n, growth: goal - m * n };
  }
  function aed(x) { return 'AED ' + Math.round(x).toLocaleString('en-US'); }
  return { stocks: stocks, ETFS: ETFS, LIM: LIM, find: find, findEtf: findEtf, suggest: suggest, stockText: stockText, testLine: testLine, perfLine: perfLine, mixFor: mixFor, calc: calc, aed: aed, p2: p2, sgn: sgn };
}
if (typeof module !== 'undefined') module.exports = makeCore;
