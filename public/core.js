import {matchQAPack} from './qa.js';
export const questions = [
 'What is the 30% rule?', 'Which stocks are halal?', 'Which UAE stocks are halal?',
 'Is Tesla halal?', 'Is Apple halal?', 'Why is Ford not halal?', 'Why is AT&T not halal?',
 'Why is DEWA not halal?', 'Why is Dubai Islamic Bank halal?', 'Is JPMorgan halal?',
 'How has NVIDIA done this year?', 'ടെസ്‌ലയുടെ ഓഹരി ഹലാൽ ആണോ?', 'क्या टेस्ला का शेयर हलाल है?'
];
export const journeyQuestions = ['How does this work?', 'What is a sukuk?', 'What is takaful?'];
export const journeyAnswers = {
 how: "1. You tell me what you're saving for.\n2. I work out the monthly amount, using the growth rate you choose.\n3. I show a model mix for your goal. You search for assets, and I explain their screening results.\n4. You decide. Safr helps you understand each step.\n\nThis is a journey Falahone is building to help people reach financial freedom step by step.",
 sukuk: "A sukuk is a certificate of ownership in an asset. Returns come from the asset, not from interest. Sukuk are the halal alternative to bonds. In this illustrative model mix, shorter goals have a larger sukuk share. Specific sukuk are not screened in this prototype. This is information, not advice.",
 takaful: "In general: Takaful is the Islamic (halal) alternative to conventional insurance. It is designed to follow Shariah principles.\n\nMembers contribute to a shared fund. When someone has a loss covered by their policy, the fund pays their claim. It is based on helping one another and sharing risk. A takaful operator manages the fund under Shariah oversight.\n\nIn Safr's journey it is the protect step, before you invest. Safr has no partnership with any provider."
};
export function localAnswer(question,qaPack=[]) {
 const stored=matchQAPack(question,qaPack);if(stored)return stored.answer;
 const q=String(question||'').trim().toLowerCase();
 if (/zak[aā]h|zakat|purif/.test(q)) return 'Zakat and purification depend on your circumstances. Safr does not calculate personal amounts. Please ask a qualified scholar.';
 if (/how does (this|safr|it) work/.test(q)) return journeyAnswers.how;
 if (/^(financial freedom|hajj|home deposit|family back home|a safety cushion|my future|emergency fund)$/.test(q) || /\bi (want|need|would like) to (save|plan)\b/.test(q)) return 'Let’s make an illustrative plan. Choose your goal amount, time period and your own growth assumption. Safr works out a monthly amount, then helps you understand protection, your model mix and the screening results for assets you choose. You decide.';
 if (/sukuk/.test(q)) return journeyAnswers.sukuk;
 if (/takaful/.test(q)) return journeyAnswers.takaful;
 return null;
}
export function screen(s) {
 const ratios = [s.total_debt_bn / s.market_cap_bn, s.cash_st_investments_bn / s.market_cap_bn,
  s.non_compliant_income_m == null || !s.revenue_m ? null : s.non_compliant_income_m / s.revenue_m];
 let verdict = 'Halal';
 if (s.business_screen === 'Fail') verdict = 'Not Halal';
 else if (s.business_screen === 'Islamic FI') verdict = 'Halal';
 else if (ratios.some((r,i) => r != null && r > [0.30,0.30,0.05][i])) verdict = 'Not Halal';
 else if (s.business_screen === 'Review') verdict = 'Doubtful';
 else if (ratios[2] == null) verdict = 'Halal (income unverified)';
 const reasons = [s.business_note];
 if (s.business_screen !== 'Islamic FI') {
  ratios.forEach((r,i) => { if (r != null && r > [0.30,0.30,0.05][i]) reasons.push(`${['Debt','Cash and interest-bearing holdings','Non-compliant income'][i]} exceeds the ${[30,30,5][i]}% limit`); });
  if (ratios[2] == null) reasons.push('Non-compliant income is not published; the income test is unverified');
 }
 return {verdict, ratios, reason: reasons.join('. ')};
}
export function calculate(goal, rate, years) {
 const n = years * 12, i = rate / 100 / 12;
 const monthly = i === 0 ? goal/n : goal*i/Math.expm1(n*Math.log1p(i));
 return {monthly, invested: monthly*n, growth: goal-monthly*n, months: n};
}
export function mix(years) { return years < 3 ? [65,25,10] : years < 5 ? [50,20,30] : years < 7 ? [35,15,50] : [20,10,70]; }
const disclaimer = 'Screening is informational, not a fatwa.';
export const outside = "AAOIFI's standards on this aren't in my knowledge yet. Please consult a qualified scholar.";
export function stockAnswer(s, language = 'en', performance = false) {
 const {verdict, ratios, reason} = screen(s);
 if (performance) return `${s.company} (${s.ticker}): ${s.price_change_12m_pct >= 0 ? '+' : '−'}${Math.abs(s.price_change_12m_pct).toFixed(2)}% over 12 months in ${s.currency}, as of ${s.price_change_as_of}. Price only, dividends not included; not a forecast. No judgement made. ${disclaimer}`;
 const tests = s.business_screen === 'Islamic FI' ? 'The Islamic banking business is checked separately from conventional-company borrowing tests.' :
 ratios.map((r,i) => r == null ? 'Interest income is not published, so this part is unverified.' : `${['Borrowing','Interest-bearing holdings','Prohibited income'][i]} ${r <= [.30,.30,.05][i] ? 'passes the check' : 'is above the screening limit'}.`).join(' ');
 if (language === 'hi' || language === 'ml') {
  const hi = language === 'hi';
  const verdicts = hi ? {'Halal':'हलाल','Not Halal':'हलाल नहीं','Doubtful':'संदिग्ध','Halal (income unverified)':'हलाल (आय अप्रमाणित)'} : {'Halal':'ഹലാൽ','Not Halal':'ഹലാൽ അല്ല','Doubtful':'സംശയാസ്പദം','Halal (income unverified)':'ഹലാൽ (വരുമാനം സ്ഥിരീകരിച്ചിട്ടില്ല)'};
  const reason = s.business_screen === 'Fail' ? (hi ? 'मुख्य व्यवसाय अनुमत नहीं है।' : 'പ്രധാന ബിസിനസ് അനുവദനീയമല്ല.') : s.business_screen === 'Review' ? (hi ? 'व्यवसाय की समीक्षा आवश्यक है।' : 'ബിസിനസ് അവലോകനം ആവശ്യമാണ്.') : (hi ? 'मुख्य व्यवसाय अनुमत है।' : 'പ്രധാന ബിസിനസ് അനുവദനീയമാണ്.');
  const localizedTests = s.business_screen === 'Islamic FI' ? (hi ? 'इस्लामिक बैंक की जाँच उसके कारोबार के आधार पर की जाती है।' : 'ഇസ്ലാമിക് ബാങ്കിന്റെ ബിസിനസിന്റെ അടിസ്ഥാനത്തിലാണ് പരിശോധന.') : ratios.map((r,i)=>`${(hi ? ['ऋण','ब्याज वाले निवेश','गैर-अनुपालक आय'] : ['കടം','പലിശ ലഭിക്കുന്ന നിക്ഷേപം','അനുവദനീയമല്ലാത്ത വരുമാനം'])[i]}: ${r == null ? (hi ? 'आँकड़े प्रकाशित नहीं हैं; यह जाँच अप्रमाणित है' : 'കണക്കുകൾ പ്രസിദ്ധീകരിച്ചിട്ടില്ല; ഈ പരിശോധന സ്ഥിരീകരിച്ചിട്ടില്ല') : r <= [.30,.30,.05][i] ? (hi ? 'सीमा के भीतर है' : 'പരിധിക്കുള്ളിലാണ്') : (hi ? 'सीमा से अधिक है' : 'പരിധിക്ക് മുകളിലാണ്')}`).join('; ');

  return `${s.company} (${s.ticker}): ${verdicts[verdict]}. ${reason} ${localizedTests}. ${hi ? 'यह जाँच जानकारी के लिए है, फ़तवा नहीं।' : 'പരിശോധന വിവരങ്ങൾക്കായി മാത്രം; ഫത്‌വയല്ല.'}`;
 }
 return `${s.company} (${s.ticker}): ${verdict}. ${reason}. ${tests} ${disclaimer}`;
}
export function builtin(question, stocks,qaPack=[]) {
 const q = String(question || '').trim().toLowerCase();
 const language = /[\u0900-\u097f]/.test(q) ? 'hi' : /[\u0d00-\u0d7f]/.test(q) ? 'ml' : 'en';
 const local=localAnswer(q,qaPack); if(local!==null) return local;
 if (!q) return 'Ask about a stock in the demo, or choose a question above. '+disclaimer;
 if (/zak[aā]h|zakat|purif|buy|sell|recommend|should i|fatwa/.test(q)) return outside;
 if (/30%|30 percent|30 %/.test(q)) return 'AAOIFI Standard 21 limits interest-based debt to 30% of market capitalisation (3/4/2), cash and interest-bearing holdings to 30% (3/4/3), and prohibited income to 5% of total income (3/4/4). The core business must also pass (3/4/1). '+disclaimer;
 if (/which.*halal/.test(q)) {
  return 'Choose an asset you want to check. Search its company name or ticker in Your portfolio. Safr shows a screening result and the reason for assets in the demo data. It does not choose assets for you. '+disclaimer;
 }
 const aliases = {NVDA:['nvidia'],AAPL:['apple'],TSLA:['tesla','ടെസ്‌ല','ടെസ്ല','टेस्ला'],KO:['coca-cola','coca cola'],T:['at&t'],F:['ford'],JPM:['jpmorgan'],BUD:['anheuser','inbev'],ADNOCGAS:['adnoc'],SALIK:['salik'],DIB:['dubai islamic'],DEWA:['dewa'],EAND:['etisalat','e&'],ALDAR:['aldar'],FAB:['first abu dhabi']};
 const found = stocks.find(s => new RegExp(`(?:^|[^a-z0-9])${s.ticker.toLowerCase()}(?:$|[^a-z0-9])`).test(q) || aliases[s.ticker].some(a=>q.includes(a)));
 if (found) return stockAnswer(found,language,/done|performance|price|change|year/.test(q));
 if (/stock|share|halal|screen/.test(q)) return "I haven't screened that stock yet. "+disclaimer;
 return outside;
}
