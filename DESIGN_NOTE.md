# 📝 Engineering Design Note: INE Velocity Scraping Engine

> **Document Scope**: Architecture decisions, reliability engineering, operational trade-offs, deployment hurdles, and AI failure retrospectives encountered while building the automated price intelligence pipeline.

---

## 1. 🛡️ How Scraping Reliability Was Achieved

Scraping modern anti-bot single-page applications requires moving beyond basic HTTP parsers. Reliability was built through a 5-pillar strategy:

1. **Full Headless Browser Automation (Playwright Chromium)**:
   - Evaluates client-side React code and WebAssembly directly in the execution context, circumventing empty `<div id="root"></div>` payloads.
2. **Deterministic Behavioral Emulation**:
   - Programmatically clears the pointer-blocking `.cookie-overlay`.
   - Simulates human micro-movements across the `.price-block` (14 coordinates over 910ms with jitter), satisfying the target store's internal motion threshold (`minMoves: 8`, `minDwellMs: 600`) to unlock the reveal button.
3. **Cryptographic Token Negotiation**:
   - Triggers native trusted clicks on `button[aria-label="Reveal price"]`, allowing the store's WebAssembly proof-of-work challenge and `/api/session` bearer token exchange to complete naturally.
4. **Adaptive Retries with Linear Backoff**:
   - Up to 3 attempts with incremental delays (3.5s, 7.0s) absorb transient 503 service outages and random throttling.
   - 25s maximum page navigation timeouts with 15s explicit element polling prevent hung worker processes.
5. **Anti-Honeypot & Data Integrity Safeguards**:
   - Discards DOM elements with `display: none`, `visibility: hidden`, or `opacity: 0` (preventing deceptive fake prices).
   - Separates strikethrough MRP/list prices from effective selling prices.
   - **Zero Corruption Guarantee**: Failed scrapes are logged to `scrape_logs` as `FAILED` but **never overwrite** valid baseline price/stock entries in `tracked_products`.

---

## 2. ⚖️ Architectural Trade-Offs

| Decision | Selected Path | Trade-Off / Alternative | Rationale |
| :--- | :--- | :--- | :--- |
| **Engine Selection** | **Playwright Chromium** | Fast HTTP client (Axios/Cheerio) | HTTP clients are 10x lighter but completely fail against WebAssembly challenges, behavioral hover gates, and SPA hydration. |
| **Scrape Concurrency** | **Sequential Execution** | Parallel Worker Pool | Parallelizing would speed up cron runs, but immediately exhausts Render's 512MB free-tier memory limit and triggers upstream 429 rate limits on the store. |
| **Cron Triggering** | **External Webhooks (`cron-job.org`)** | Internal Node `setInterval` | Render free instances sleep after 15 minutes of inactivity. Internal timers sleep with the container; external HTTP webhooks wake the dyno on schedule. |
| **Database Resilience** | **Supabase + In-Memory Fallback** | Strict Remote DB Only | If Supabase credentials are missing during onboarding or network blips occur, an automatic in-memory store keeps the server functional. |

---

## 3. 🤖 AI Failures on First Attempt & How We Corrected Them

During initial AI-assisted development and deployment, several assumptions proved incorrect. Here is the concise retrospective of what failed and how it was resolved:

```
┌──────────────────────────────────────────────┐
│       AI ASSUMPTION & INITIAL FAILURE        │
├──────────────────────────────────────────────┤
│ ❌ 1. Simple CSS hover & DOM extraction      │
│    Assumed standard .hover() would reveal    │
│    price. The button stayed disabled.        │
├──────────────────────────────────────────────┤
│ ❌ 2. Bypassing via direct JS click          │
│    Attempted page.evaluate(() => click()).   │
│    Resulted in 401 Unauthorized errors.      │
├──────────────────────────────────────────────┤
│ ❌ 3. Blind text extraction                  │
│    Extracted hidden/strikethrough text,      │
│    yielding fake honeypot prices.            │
├──────────────────────────────────────────────┤
│ ❌ 4. Render deployment root mismatch        │
│    AI generated 'cd backend && npm run build'│
│    failing because Root Dir was 'backend'.   │
├──────────────────────────────────────────────┤
│ ❌ 5. Missing Chromium binary in production  │
│    AI assumed 'npm install' includes browser.│
│    Render threw 'Executable doesn't exist'.  │
└──────────────────────────────────────────────┘
                       ⬇️
┌──────────────────────────────────────────────┐
│            ENGINEERING CORRECTION            │
├──────────────────────────────────────────────┤
│ ✅ Reversed SPA bundle (index-B9UiQq4X.js);   │
│    discovered minMoves: 8 & minDwellMs: 600. │
│    Implemented 14-step natural mouse dwell.  │
├──────────────────────────────────────────────┤
│ ✅ Dismissed .cookie-overlay first and used  │
│    page.mouse.click() with isTrusted=true,   │
│    allowing Wasm session tokens to resolve.  │
├──────────────────────────────────────────────┤
│ ✅ Added computed style filters (opacity,    │
│    display, visibility) and regex validation.│
├──────────────────────────────────────────────┤
│ ✅ Stripped redundant 'cd backend' commands  │
│    tailored to Render's service settings.    │
├──────────────────────────────────────────────┤
│ ✅ Injected 'npx playwright install chromium'│
│    into build/start/postinstall scripts.     │
└──────────────────────────────────────────────┘
```

### Detailed Problem & Coping Breakdown:

1. **Problem: Pointer Events Blocked by Cookie Dialog**
   - *Failure*: Initial AI hover commands timed out because an invisible `.cookie-overlay` dialog intercepted all clicks and pointer interactions.
   - *Coping*: Added explicit pre-flight detection to dismiss and destroy the cookie banner before initiating hover routines.

2. **Problem: Unresponsive "Reveal Price" Button**
   - *Failure*: Calling `.hover()` placed the cursor on the element once, but the button remained disabled.
   - *Coping*: Inspected the minified React bundle (`index-B9UiQq4X.js`). Found an internal pointer tracker `Ar` requiring at least 8 distinct movement events across >600ms. Programmed an interpolated 14-point cursor movement sequence over 910ms with slight delays.

3. **Problem: 401 Unauthorized on Price API**
   - *Failure*: Attempting to force an artificial click via JavaScript (`element.click()`) failed validation because it was flagged as untrusted (`isTrusted: false`), refusing to trigger the `/api/challenge` and `/api/session` WebAssembly handshake.
   - *Coping*: Replaced programmatic DOM dispatch with native OS-level Playwright coordinates clicking (`page.mouse.click()`), cleanly producing the valid session bearer token.

4. **Problem: Honeypots & Strikethrough Pricing**
   - *Failure*: Naive text queries returned strike-through MSRPs or invisible trap nodes (`style="display:none;"`).
   - *Coping*: Implemented DOM filtering to discard hidden or zero-opacity nodes and separated discounted selling prices from original MRPs.

5. **Problem: Missing Playwright Browsers on Render Container**
   - *Failure*: Render deployments failed with `Executable doesn't exist at /root/.cache/ms-playwright/chromium...`. AI suggested `--with-deps` which crashed due to lack of `sudo/root` permissions on Render.
   - *Coping*: Switched the build and start commands to `npx playwright install chromium` without `--with-deps`, ensuring the Chromium binary installs cleanly within user-space permissions.

---

## 4. 🏁 Conclusion

By combining **deep bundle inspection**, **human-like cursor kinetics**, **native browser event delegation**, and **conservative resource isolation (sequential cron jobs)**, the scraper operates autonomously with near 100% data fidelity against sophisticated client-side countermeasures.
