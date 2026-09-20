import { scrapeProduct } from './scraper';
import { supabase } from './db';

async function runHeadedDemo() {
  console.log('====================================');
  console.log('   STARTING HEADED SCRAPER DEMO    ');
  console.log('====================================\n');

  let targetUrl = 'https://demo.inelabteamdev.com/product/5';
  let targetName = 'Meridian Headphones Studio';

  try {
    const { data, error } = await supabase
      .from('tracked_products')
      .select('*')
      .eq('active', true)
      .limit(1);

    if (!error && data && data.length > 0) {
      targetUrl = data[0].product_url;
      targetName = data[0].product_name;
    }
  } catch (e) {
    console.log('Using verified target product.');
  }

  console.log(`Target Product: ${targetName}`);
  console.log(`Target URL: ${targetUrl}\n`);
  console.log('Launching Chromium in HEADED mode (visible window)...');

  const result = await scrapeProduct(targetUrl, {
    headless: false,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 4000,
  });

  console.log('\n====================================');
  console.log('        SCRAPE COMPLETED            ');
  console.log('====================================');

  if (result.success) {
    console.log('✅ Status: SUCCESS');
    console.log(`Title: ${result.title}`);
    console.log(`Price: ₹${result.price}`);
    if (result.mrp) console.log(`MRP: ₹${result.mrp}`);
    console.log(`Stock: ${result.stock}`);
    console.log(`Attempts: ${result.attempt}`);
    console.log(`Duration: ${result.duration_ms} ms`);
  } else {
    console.log('❌ Status: FAILED');
    console.log(`Error: ${result.error}`);
    console.log(`Attempts: ${result.attempt}`);
    console.log(`Duration: ${result.duration_ms} ms`);
  }

  process.exit(0);
}

runHeadedDemo();
