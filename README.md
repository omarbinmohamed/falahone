# Safr by Falahone

Prototype of a guided halal-investing journey. The latest supplied flow reference is implemented: amber hero and agent home, eight journey steps, stock search, portfolio weights, a Check any asset step, neutral UAE platform links, and a shared chat drawer. Safr means journey.

## Run

Requires Node.js 18 or later.

    npm install
    npm start

Open http://localhost:3000/. There are no third-party runtime dependencies. This workspace used an offline pnpm install because npm was unavailable.

    npm test

Rebuild the generated page after editing the source:

    python3 build.py

The main editable files are src/index.template.html and src/style.css. Build output is public/index.html. The new reference replaces Archivo with self-hosted Cal Sans headlines, Inter text and Urbanist labels/buttons. All three font files and their licences are bundled in public/fonts. No Google Fonts or CDN is used.

## Optional live agent

Set OPENAI_API_KEY in your shell or deployment environment only. Do not put it in a file. OPENAI_MODEL is optional and defaults to gpt-4.1-mini.

The server keeps POST /api/ask and supports both question and message request fields. Responses expose answer and text for compatibility. The live agent uses the Responses API with screen_stock, get_mix, set_goal and add_to_portfolio tools. See [OpenAI's official function-calling documentation](https://developers.openai.com/api/docs/guides/function-calling).

Missing keys, invalid keys, provider errors and timeouts return built-in answers. The 11th API request per direct peer in a minute returns HTTP 429 with a built-in answer; the page displays it. Stored Q&A chips answer locally without API requests.

## Behaviour

- The latest reference overrides the earlier five-second loader: progress runs for about 2.2 seconds, then the wordmark fades in for 0.6 seconds, holds for 0.6 seconds and fades out for 0.65 seconds. Hero-to-agent transitions take 0.56 seconds; journey content crossfades over 0.48 seconds where supported, with a fade-in fallback. Reduced motion disables these effects. Tap or any key skips. Reduced motion shows the wordmark for one second.
- Seven steps: About you, Protect yourself, Set your goal, Your mix, Build your portfolio, Check any asset, Build it in the UAE, Review your journey.
- Name, age and draft portfolio are kept only in page memory. Name and age are not sent to the agent. New journey resets them and ignores pending replies.
- Only screened Halal stocks can be added. Weights stay within the goal's stock share, including when the horizon shrinks. Unknown stocks get no verdict; ETF names carry an issuer label, not a Safr screen.
- All 30 stored answers are kept verbatim for chips, including line breaks and basis tags. Typed personal zakat or purification amounts receive principles and a scholar referral, never a calculation.
- The Falahone promotional/waitlist section is removed. Four provider cards use locally hosted official logos; source URLs are in LOGO_SOURCES.json. Theme preference is the only value saved in browser local storage.
- Screening uses supplied prototype data and AAOIFI Standard 21 clause 3/4 rules internally. Asset checks show plain-language reasoning without standard names or clause numbers. Stored educational Q&A remains verbatim. It is informational, not a fatwa. Scenarios are illustrations using the user's growth assumption.

## Verification

Read TEST_RESULTS.txt and verification/ for outputs and limitations. The requested 1280px and 400px visual checks could not run: browser access is blocked by an enforced policy, so the current rendered 400px layout, overlap/readability and native browser interactions could not be verified. DOM event tests are not visual browser tests. No valid OpenAI key was available; the tool loop was mocked and a deliberately invalid key was tested against the provider.

The earlier direct request to omit the motto is preserved, despite its appearance in the attached reference ticker. The final archives contain identical app code. They add five starter questions, follow-up chips, expanded takaful copy and Review your journey. The latest reference otherwise supplies the new typography, hero companion panel, asset-check step and four alphabetical platform links. Smooth transitions and server safeguards are retained.

Review gathers your local profile, covered/skipped protection state, goal, monthly illustration, mix and stock weights. Change buttons reopen each step; Start a new journey clears everything. No review information is saved. Chat openings and follow-up buttons are separate from stored answer text, and stored replies remain instant. The new stock-halal explanation is plain language under the user’s no-standard-label request.
