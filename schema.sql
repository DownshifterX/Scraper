-- Supabase Schema for Product Price Tracker

-- Create tracked_products table
CREATE TABLE IF NOT EXISTS tracked_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    product_url TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    latest_price NUMERIC,
    latest_stock TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES tracked_products(id) ON DELETE CASCADE,
    price NUMERIC NOT NULL,
    stock TEXT,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scrape_logs table
CREATE TABLE IF NOT EXISTS scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES tracked_products(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL, -- 'SUCCESS', 'RETRIED', 'FAILED'
    attempt INTEGER DEFAULT 1,
    price NUMERIC,
    stock TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_product_id ON scrape_logs(product_id);
