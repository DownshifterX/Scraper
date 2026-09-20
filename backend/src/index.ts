import express from 'express';
import cors from 'cors';
import { supabase } from './db';
import { scrapeProduct, fetchStoreProducts, searchAllProducts, getFullCatalog } from './scraper';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory fallback if Supabase credentials are placeholders
interface InMemProduct {
  id: string;
  product_name: string;
  product_url: string;
  active: boolean;
  latest_price?: number;
  latest_stock?: string;
  created_at: string;
  updated_at: string;
}

interface InMemHistory {
  id: string;
  product_id: string;
  price: number;
  stock?: string;
  scraped_at: string;
}

interface InMemLog {
  id: string;
  product_id: string;
  started_at: string;
  finished_at: string;
  status: string;
  attempt: number;
  price?: number;
  stock?: string;
  error_message?: string;
  duration_ms: number;
  created_at: string;
}

const memoryDB = {
  products: new Map<string, InMemProduct>(),
  history: [] as InMemHistory[],
  logs: [] as InMemLog[]
};

const isSupabaseConfigured = () => {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return url.length > 0 && !url.includes('placeholder') && key.length > 0 && !key.includes('placeholder');
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: isSupabaseConfigured() ? 'supabase' : 'in-memory-fallback',
    timestamp: new Date().toISOString()
  });
});

// Live autocomplete suggestions across all 1,000 products (Amazon / Flipkart style)
app.get('/api/products/suggest', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || !q.trim()) {
    return res.json({ suggestions: [] });
  }

  try {
    const catalog = await getFullCatalog();
    const queryTerm = q.trim().toLowerCase();

    // Match products by name, category, or brand
    const matches: Array<{
      id: number;
      name: string;
      category: string;
      brand: string;
      url: string;
      sku: string;
    }> = [];

    for (const item of catalog) {
      if (
        item.name.toLowerCase().includes(queryTerm) ||
        (item.category && item.category.toLowerCase().includes(queryTerm)) ||
        (item.brand && item.brand.toLowerCase().includes(queryTerm))
      ) {
        matches.push(item);
        if (matches.length >= 8) break; // Limit suggestions to top 8
      }
    }

    res.json({ suggestions: matches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search across ALL 1,000 products in the store with pagination
app.get('/api/products/search', async (req, res) => {
  const { q, page = '1', pageSize = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));

  try {
    const queryTerm = typeof q === 'string' ? q : '';
    const data = await searchAllProducts(queryTerm, pageNum, limit);

    res.json({
      results: data.results,
      page: data.page,
      pages: data.pages,
      total: data.total
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get tracked products
app.get('/api/products/tracked', async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tracked_products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ products: data || [] });
    }

    const products = Array.from(memoryDB.products.values())
      .filter((p) => p.active)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({ products });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Track a new product
app.post('/api/products/track', async (req, res) => {
  const { url, name } = req.body;

  if (!url || !name) {
    return res.status(400).json({ error: 'url and name are required' });
  }

  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tracked_products')
        .upsert({ product_url: url, product_name: name, active: true }, { onConflict: 'product_url' })
        .select()
        .single();

      if (error) throw error;
      return res.json({ product: data });
    }

    // In-memory fallback
    const id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newProduct: InMemProduct = {
      id,
      product_name: name,
      product_url: url,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryDB.products.set(id, newProduct);
    res.json({ product: newProduct });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete/Deactivate a product
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('tracked_products')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
      return res.json({ success: true });
    }

    const p = memoryDB.products.get(id);
    if (p) {
      p.active = false;
      memoryDB.products.set(id, p);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Scrape a specific product on demand
app.post('/api/products/:id/scrape', async (req, res) => {
  const { id } = req.params;
  try {
    let productUrl = '';

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tracked_products')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Product not found' });
      productUrl = data.product_url;
    } else {
      const p = memoryDB.products.get(id);
      if (!p) return res.status(404).json({ error: 'Product not found' });
      productUrl = p.product_url;
    }

    const result = await scrapeProduct(productUrl);
    const logStatus = result.success ? (result.attempt > 1 ? 'RETRIED' : 'SUCCESS') : 'FAILED';
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured()) {
      await supabase.from('scrape_logs').insert({
        product_id: id,
        started_at: new Date(Date.now() - result.duration_ms).toISOString(),
        finished_at: nowIso,
        status: logStatus,
        attempt: result.attempt,
        price: result.price,
        stock: result.stock,
        error_message: result.error,
        duration_ms: result.duration_ms
      });

      if (result.success && result.price) {
        await supabase.from('price_history').insert({
          product_id: id,
          price: result.price,
          stock: result.stock
        });

        await supabase
          .from('tracked_products')
          .update({
            latest_price: result.price,
            latest_stock: result.stock,
            updated_at: nowIso
          })
          .eq('id', id);
      }
    } else {
      memoryDB.logs.push({
        id: `log-${Date.now()}`,
        product_id: id,
        started_at: new Date(Date.now() - result.duration_ms).toISOString(),
        finished_at: nowIso,
        status: logStatus,
        attempt: result.attempt,
        price: result.price,
        stock: result.stock,
        error_message: result.error,
        duration_ms: result.duration_ms,
        created_at: nowIso
      });

      if (result.success && result.price) {
        memoryDB.history.push({
          id: `hist-${Date.now()}`,
          product_id: id,
          price: result.price,
          stock: result.stock,
          scraped_at: nowIso
        });

        const p = memoryDB.products.get(id);
        if (p) {
          p.latest_price = result.price;
          p.latest_stock = result.stock;
          p.updated_at = nowIso;
        }
      }
    }

    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get product history
app.get('/api/products/:id/history', async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('product_id', id)
        .order('scraped_at', { ascending: true });

      if (error) throw error;
      return res.json({ history: data || [] });
    }

    const history = memoryDB.history
      .filter((h) => h.product_id === id)
      .sort((a, b) => new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime());
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get product scrape logs
app.get('/api/products/:id/logs', async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('scrape_logs')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return res.json({ logs: data || [] });
    }

    const logs = memoryDB.logs
      .filter((l) => l.product_id === id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cron / Automated scrape endpoint
app.post('/api/cron/scrape', async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'my-super-secret-cron-key';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Respond immediately so cron-job.org or external caller never times out
  res.json({ message: 'Scrape job triggered successfully and running in background' });

  // Execute scrape loop asynchronously in background
  (async () => {
    try {
      let products: Array<{ id: string; product_url: string }> = [];

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('tracked_products')
          .select('*')
          .eq('active', true);
        if (error) throw error;
        products = data || [];
      } else {
        products = Array.from(memoryDB.products.values()).filter((p) => p.active);
      }

      let successful = 0;
      let failed = 0;

      for (const product of products) {
        const result = await scrapeProduct(product.product_url);
        const logStatus = result.success ? (result.attempt > 1 ? 'RETRIED' : 'SUCCESS') : 'FAILED';
        const nowIso = new Date().toISOString();

        if (isSupabaseConfigured()) {
          await supabase.from('scrape_logs').insert({
            product_id: product.id,
            started_at: new Date(Date.now() - result.duration_ms).toISOString(),
            finished_at: nowIso,
            status: logStatus,
            attempt: result.attempt,
            price: result.price,
            stock: result.stock,
            error_message: result.error,
            duration_ms: result.duration_ms
          });

          if (result.success && result.price) {
            await supabase.from('price_history').insert({
              product_id: product.id,
              price: result.price,
              stock: result.stock
            });

            await supabase
              .from('tracked_products')
              .update({
                latest_price: result.price,
                latest_stock: result.stock,
                updated_at: nowIso
              })
              .eq('id', product.id);

            successful++;
          } else {
            failed++;
          }
        } else {
          memoryDB.logs.push({
            id: `log-${Date.now()}`,
            product_id: product.id,
            started_at: new Date(Date.now() - result.duration_ms).toISOString(),
            finished_at: nowIso,
            status: logStatus,
            attempt: result.attempt,
            price: result.price,
            stock: result.stock,
            error_message: result.error,
            duration_ms: result.duration_ms,
            created_at: nowIso
          });

          if (result.success && result.price) {
            memoryDB.history.push({
              id: `hist-${Date.now()}`,
              product_id: product.id,
              price: result.price,
              stock: result.stock,
              scraped_at: nowIso
            });

            const p = memoryDB.products.get(product.id);
            if (p) {
              p.latest_price = result.price;
              p.latest_stock = result.stock;
              p.updated_at = nowIso;
            }
            successful++;
          } else {
            failed++;
          }
        }

        // 2-second rate-limiting space between products to avoid upstream 429
        await new Promise((r) => setTimeout(r, 2000));
      }
      console.log(`[CRON SCRAPE] Completed. Processed: ${products.length}, Success: ${successful}, Failed: ${failed}`);
    } catch (err: any) {
      console.error('[CRON SCRAPE ERROR]', err.message);
    }
  })();
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Database mode: ${isSupabaseConfigured() ? 'Supabase' : 'Memory fallback (ready for immediate testing)'}`);
});
