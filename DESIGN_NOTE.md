# Design Note: INE Mock Store Price Tracker

## 1. How Scraping Works
The scraper uses Playwright to launch a Chromium browser instance. It targets the INE mock store (`https://demo.inelabteamdev.com`), navigates to the product detail page, dismisses the cookie consent banner, performs human-like mouse dwell movements over the price block, triggers the "Reveal price" flow, and extracts the verified live price and availability status.

## 2. Why Playwright was Chosen Over HTTP Fetching
The INE mock store is a React SPA built with Vite. Inspection of the live bundle revealed several client-side defenses:
1. **Empty Initial HTML Payload**: The server returns only `<div id="root"></div>`.
2. **Dynamic Price Gating**: Price data is intentionally hidden behind an interactive `.price-block` React component.
3. **Behavioral Dwell Detection**: The component tracks pointer moves via an internal `Ar` tracker requiring `minMoves: 8` and `minDwellMs: 600` before enabling the `button[aria-label="Reveal price"]`.
4. **Cryptographic Proof-of-Work & Session Tokens**: Clicking the button fetches a challenge (`/api/challenge`), solves a WebAssembly proof-of-work, submits it to `/api/session`, and receives a bearer token to call `/api/products/:id/price`.
5. **DOM Honeypots**: Hidden DOM nodes (`style="display: none;"`) contain bogus price values designed to deceive naive scrapers.
A lightweight HTTP request (e.g. Axios/Cheerio) cannot execute these client-side steps; full browser automation with Playwright is strictly necessary.

## 3. Timeout and Retry Strategy
The target store simulates upstream delays, intermittent 503 errors, and 429 rate limiting:
- **Navigation & Reveal Timeouts**: Page navigation has a 25-second timeout, with explicit polling (up to 15 seconds) for the live price quote.
- **Linear Backoff Retries**: Up to 3 attempts with linear backoff (3.5s, 7.0s) to give the server time to recover.
- **Rate-Limiting Cooldown**: 2-second spacing between sequential product scrapes during cron runs to prevent 429s.

## 4. Data Validation & Honeypot Evasion
- **Anti-Honeypot Filtering**: Elements with `display: none`, `visibility: hidden`, or `opacity: 0` are filtered out.
- **Strike-Through MRP Detection**: Strikethrough text is segregated as MRP/list price rather than effective selling price.
- **Positive Numeric Constraints**: Parsed prices must be valid numbers > 0.
- **Stock Normalization**: Stock status is normalized into standard states (`In Stock`, `Out of Stock`, `Low Stock`, or specific remaining counts like `In stock · 25 left`).

## 5. Handling Failed Requests & Page Changes
Failed scrapes (after all retries are exhausted) are recorded in the `scrape_logs` table with a `FAILED` status, the exact error message, and duration. Crucially, **failed scrapes do not overwrite the `latest_price` or `latest_stock`** in `tracked_products`, nor do they create invalid records in `price_history`. This ensures complete data integrity.

## 6. Database Design
Supabase PostgreSQL schema:
- `tracked_products`: Product metadata and the latest verified price/stock snapshot.
- `price_history`: Append-only historical log of price fluctuations over time for graphing.
- `scrape_logs`: Append-only audit trail capturing every scrape run (attempt count, execution duration, status, and error logs).
- *Resilience fallback*: In local development or during onboarding without Supabase keys, an in-memory database store operates automatically without crashing.

## 7. Cron Architecture & Free-Tier Limitations
Render free-tier instances sleep after 15 minutes of inactivity. Relying on an internal `setInterval` results in missed scrapes when the process sleeps. Therefore, an external cron service (e.g. cron-job.org) triggers the secured `/api/cron/scrape` endpoint with a Bearer `CRON_SECRET`. This wakes the instance and executes scheduled tracking runs.

## 8. Trade-offs
- **Headless Browser Overhead vs. Reliability**: Playwright consumes more memory and CPU than simple HTTP scraping, but it is the only viable method given the store's WebAssembly challenge and behavioral gating.
- **Sequential vs Parallel Scraping**: Sequential execution avoids triggering upstream 429 rate limits on the store API.

## 9. AI-Assisted Development Journey
- **Initial Assumption**: Assumed a standard hover on `.price-block` would trigger a simple CSS or AJAX transition.
- **Observed Failures**:
  1. The `.cookie-overlay` dialog intercepted pointer events, blocking hovers.
  2. The reveal button remained permanently disabled even when hovered.
  3. Forced JavaScript clicks triggered 401 Unauthorized because the session token was missing.
- **Investigation**: Inspected the React bundle `index-B9UiQq4X.js` and uncovered the `minMoves: 8`, `minDwellMs: 600`, and WebAssembly session challenge flow.
- **Correction**: Dismissed the cookie overlay first, simulated mouse movements exceeding 900ms dwell time, issued native clicks to satisfy `isTrusted`, and implemented honeypot filtering to extract verified prices (e.g. ₹6,026 for product 5).
