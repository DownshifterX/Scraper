import { chromium, Browser } from 'playwright';

export interface ScrapeOptions {
  headless?: boolean;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ScrapeResult {
  success: boolean;
  attempt: number;
  title?: string;
  price?: number;
  mrp?: number;
  stock?: string;
  error?: string;
  duration_ms: number;
}

/**
 * Robustly scrape a product from the INE mock store (https://demo.inelabteamdev.com).
 *
 * Real mechanics discovered on the target site:
 * 1. Store is a dynamic client-rendered React SPA.
 * 2. Cookie consent banner overlay (`.cookie-overlay`) intercepts pointer events and must be removed.
 * 3. Price block (`.price-block`) initially renders in an idle state with button[aria-label="Reveal price"].
 * 4. React component requires human-like hover dwell time (min 8 moves, min 600ms dwell) to enable the button.
 * 5. On clicking "Reveal price", a cryptographic challenge and session token flow executes upstream to fetch the price.
 * 6. Site uses dynamic obfuscated CSS classes (e.g. `pv-a7`, `mr-a7`, `st-a7`) defined in `/api/layout`.
 * 7. Fake / honeypot price tags exist (`display: none`), so the real shown price must be extracted from the active visible text.
 */
export async function scrapeProduct(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const {
    headless = true,
    timeout = 25000,
    maxRetries = 3,
    retryDelay = 3500,
  } = options;

  let attempt = 0;
  let lastError = 'Unknown error';
  const startTime = Date.now();

  while (attempt < maxRetries) {
    attempt++;
    let browser: Browser | null = null;

    try {
      console.log(`[Scraper] Attempt ${attempt}/${maxRetries} → ${url}`);
      browser = await chromium.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      const page = await context.newPage();

      // Navigate to product page
      await page.goto(url, { waitUntil: 'networkidle', timeout });
      await page.waitForTimeout(1000);

      // 1. Dismiss/remove cookie overlay to avoid pointer interception
      await page.evaluate(() => {
        document.querySelectorAll('.cookie-overlay, .cookie-banner').forEach((el) => el.remove());
      });

      // 2. Extract product title
      const titleEl = await page.$('.detail-info h1, article h1, h1');
      const title = titleEl ? (await titleEl.innerText()).trim() : 'Unknown Product';

      // 3. Locate price block
      const priceBlock = await page.$('.price-block');
      if (!priceBlock) {
        throw new Error('Price block element not found on page');
      }

      const box = await priceBlock.boundingBox();
      if (!box) {
        throw new Error('Price block has no visible bounding box');
      }

      // 4. Simulate human mouse movements over price block to satisfy dwell requirements
      await page.mouse.move(box.x + 20, box.y + 20);
      for (let i = 0; i < 14; i++) {
        await page.mouse.move(box.x + 25 + i * 4, box.y + 25 + (i % 3) * 4);
        await page.waitForTimeout(65); // 14 * 65ms = 910ms (>600ms minDwellMs)
      }

      // 5. Check and click "Reveal price" button
      const revealBtn = await page.$('button[aria-label="Reveal price"]');
      if (revealBtn) {
        // Ensure disabled state has cleared
        await page.waitForFunction(
          () => {
            const btn = document.querySelector('button[aria-label="Reveal price"]') as HTMLButtonElement | null;
            return btn && !btn.disabled;
          },
          { timeout: 5000 }
        ).catch(() => {});

        console.log('[Scraper] Clicking "Reveal price" button...');
        await page.click('button[aria-label="Reveal price"]', { timeout: 5000 }).catch(async () => {
          // Fallback force click
          await page.evaluate(() => {
            const btn = document.querySelector('button[aria-label="Reveal price"]') as HTMLElement | null;
            btn?.click();
          });
        });
      }

      // 6. Wait for price reveal completion (avoiding fake honeypots & spinner states)
      console.log('[Scraper] Waiting for live price quote to resolve...');
      let revealed = false;
      for (let waitSec = 0; waitSec < 15; waitSec++) {
        await page.waitForTimeout(1000);
        const state = await page.evaluate(() => {
          const pb = document.querySelector('.price-block');
          if (!pb) return { ready: false, text: '' };
          const html = pb.innerHTML;
          const text = pb.textContent || '';
          const hasSpinner = html.includes('spinner') || text.includes('Loading') || text.includes('Retrying');
          const isHidden = text.includes('Price hidden');
          const hasError = text.includes("Couldn’t load the price");
          return { ready: !hasSpinner && !isHidden, hasError, text, html };
        });

        if (state.hasError) {
          throw new Error(`Upstream price reveal failed: ${state.text.substring(0, 100)}`);
        }

        if (state.ready) {
          revealed = true;
          break;
        }
      }

      if (!revealed) {
        throw new Error('Price quote timed out after reveal interaction');
      }

      // 7. Parse extracted price, mrp and stock using the layout mapping
      const extracted = await page.evaluate(async () => {
        const pb = document.querySelector('.price-block');
        if (!pb) return { price: 0, mrp: 0, stock: 'Unknown' };

        // Try to fetch current layout dynamically from within the page context
        let pvClass = '';
        let mrClass = '';
        let stClass = '';

        try {
          const lRes = await fetch('/api/layout');
          if (lRes.ok) {
            const lData: any = await lRes.json();
            pvClass = lData.classes?.priceValue || '';
            mrClass = lData.classes?.mrp || '';
            stClass = lData.classes?.stock || '';
          }
        } catch (e) {}

        let foundPrice = 0;
        let foundMrp = 0;

        // 1. If dynamic class is available, query the exact real price element
        if (pvClass) {
          const pvEl = pb.querySelector(`.${pvClass}`);
          if (pvEl && window.getComputedStyle(pvEl).display !== 'none') {
            const rawDigits = (pvEl.textContent || '').replace(/[^\d.]/g, '');
            const num = parseFloat(rawDigits);
            if (!isNaN(num) && num > 0) foundPrice = num;
          }
        }

        if (mrClass) {
          const mrEl = pb.querySelector(`.${mrClass}`);
          if (mrEl && window.getComputedStyle(mrEl).display !== 'none') {
            const rawDigits = (mrEl.textContent || '').replace(/[^\d.]/g, '');
            const num = parseFloat(rawDigits);
            if (!isNaN(num) && num > 0) foundMrp = num;
          }
        }

        // 2. Fallback heuristic: find visible element with class containing pv- or text without line-through
        if (!foundPrice) {
          const allSpans = Array.from(pb.querySelectorAll('span, div'));
          for (const el of allSpans) {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
            
            // Check for class containing 'pv-'
            const hEl = el as HTMLElement;
            if (hEl.className.includes('pv-')) {
              const num = parseFloat((hEl.textContent || '').replace(/[^\d.]/g, ''));
              if (!isNaN(num) && num > 0) {
                foundPrice = num;
                break;
              }
            }
          }
        }

        // 3. Stock extraction
        let stock = 'In Stock';
        if (stClass) {
          const stEl = pb.querySelector(`.${stClass}`);
          if (stEl) stock = stEl.textContent?.trim() || 'In Stock';
        }
        if (stock === 'In Stock') {
          const badge = pb.querySelector('.stock-badge');
          if (badge) stock = badge.textContent?.trim() || 'In Stock';
        }

        return { price: foundPrice, mrp: foundMrp, stock };
      });

      await browser.close();
      browser = null;

      if (!extracted.price || extracted.price <= 0) {
        throw new Error('Extracted price is 0 or invalid after quote reveal');
      }

      const result: ScrapeResult = {
        success: true,
        attempt,
        title,
        price: extracted.price,
        mrp: extracted.mrp || undefined,
        stock: extracted.stock,
        duration_ms: Date.now() - startTime,
      };

      console.log(
        `[Scraper] ✅ SUCCESS on attempt ${attempt} — "${title}" @ ₹${extracted.price} (${extracted.stock})`
      );
      return result;
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.error(`[Scraper] ❌ Attempt ${attempt} failed: ${lastError}`);

      if (browser) {
        await browser.close().catch(() => {});
        browser = null;
      }

      if (attempt < maxRetries) {
        const waitMs = retryDelay * attempt;
        console.log(`[Scraper] Waiting ${waitMs}ms before retry...`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }

  return {
    success: false,
    attempt,
    error: lastError,
    duration_ms: Date.now() - startTime,
  };
}

/**
 * Fetch catalog products from the mock store API or fallback.
 */
let cachedCatalog: Array<{ id: number; name: string; url: string; sku: string; category: string; brand: string }> = [];
let catalogCacheTime = 0;

export async function fetchStoreProducts(): Promise<
  Array<{ id: number; name: string; url: string; sku: string; category: string; brand: string }>
> {
  const now = Date.now();
  if (cachedCatalog.length > 0 && now - catalogCacheTime < 10 * 60 * 1000) {
    return cachedCatalog;
  }

  try {
    const res = await fetch('https://demo.inelabteamdev.com/api/catalog');
    if (res.ok) {
      const data: any = await res.json();
      const items = (data.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        url: `https://demo.inelabteamdev.com/product/${item.id}`,
        sku: item.sku,
        category: item.category,
        brand: item.brand
      }));
      cachedCatalog = items;
      catalogCacheTime = now;
      return items;
    }
  } catch (e: any) {
    console.error('[Scraper] Failed to fetch catalog:', e.message);
  }

  return cachedCatalog;
}
