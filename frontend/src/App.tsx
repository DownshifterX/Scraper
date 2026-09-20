import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useParams,
  useLocation,
  useNavigate
} from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard,
  Search,
  RefreshCw,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ExternalLink,
  Zap,
  Package,
  Activity,
  Tag,
  BarChart2,
  Target,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StockBadge({ stock }: { stock?: string }) {
  if (!stock) return <span className="stock-badge unknown">Unknown</span>;
  const lower = stock.toLowerCase();
  if (lower.includes('out') || lower.includes('0'))
    return <span className="stock-badge out">Out of stock</span>;
  return <span className="stock-badge in">● {stock}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'SUCCESS' ? 'success' : status === 'RETRIED' ? 'retried' : 'failed';
  return (
    <span className={`status-badge ${cls}`}>
      {status === 'SUCCESS' ? (
        <CheckCircle2 size={10} />
      ) : (
        <AlertTriangle size={10} />
      )}
      {status}
    </span>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar({ trackedCount }: { trackedCount: number }) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-logo">
        <div className="logo-icon">
          <Zap size={16} fill="currentColor" />
        </div>
        <div className="logo-text">
          <span className="logo-title">PriceTracker</span>
          <span className="logo-sub">INE MONITOR</span>
        </div>
      </Link>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Navigation</div>
        <Link
          to="/"
          className={`sidebar-nav-item ${isActive('/') ? 'active' : ''}`}
        >
          <LayoutDashboard size={16} />
          Dashboard
          <span className={`sidebar-badge ${trackedCount > 0 ? 'yellow' : ''}`}>
            {trackedCount}
          </span>
        </Link>
        <Link
          to="/search"
          className={`sidebar-nav-item ${isActive('/search') ? 'active' : ''}`}
        >
          <Search size={16} />
          Browse Catalog
        </Link>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">System</div>
        <div className="sidebar-nav-item" style={{ cursor: 'default' }}>
          <Clock size={16} />
          Cron Interval
          <span className="sidebar-badge">120m</span>
        </div>
        <div className="sidebar-nav-item" style={{ cursor: 'default' }}>
          <Activity size={16} />
          Scraper Engine
          <span className="sidebar-badge yellow">Live</span>
        </div>
        <div className="sidebar-nav-item" style={{ cursor: 'default' }}>
          <BarChart2 size={16} />
          Max Retries
          <span className="sidebar-badge">3×</span>
        </div>
      </div>

      <div className="sidebar-status">
        <div className="status-pill">
          <span className="status-dot pulse" />
          Playwright engine active
        </div>
      </div>
    </aside>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard() {
  const [tracked, setTracked] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapingId, setScrapingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/products/tracked`);
      const products = res.data.products || [];
      setTracked(products);

      // Fetch recent logs for top 3 products
      const logFetches = products.slice(0, 3).map((p: any) =>
        axios
          .get(`${API_URL}/api/products/${p.id}/logs`)
          .then((r) =>
            (r.data.logs || []).slice(0, 5).map((l: any) => ({
              ...l,
              product_name: p.product_name
            }))
          )
          .catch(() => [])
      );
      const logsArr = await Promise.all(logFetches);
      const merged = logsArr
        .flat()
        .sort(
          (a, b) =>
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        )
        .slice(0, 8);
      setRecentLogs(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const untrack = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from tracking?`)) return;
    await axios.delete(`${API_URL}/api/products/${id}`);
    fetchAll();
  };

  const scrapeNow = async (id: string) => {
    setScrapingId(id);
    try {
      await axios.post(`${API_URL}/api/products/${id}/scrape`);
      await fetchAll();
    } catch (e) {
      console.error(e);
    } finally {
      setScrapingId(null);
    }
  };

  const pricedCount = tracked.filter((p) => p.latest_price).length;
  const avgPrice =
    pricedCount > 0
      ? Math.round(
          tracked
            .filter((p) => p.latest_price)
            .reduce((s, p) => s + Number(p.latest_price), 0) / pricedCount
        )
      : 0;
  const successfulLogs = recentLogs.filter((l) => l.status === 'SUCCESS').length;

  return (
    <>
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-breadcrumb">
          <span>Dashboard</span>
        </div>
        <div className="topbar-actions">
          <button
            onClick={fetchAll}
            className="btn btn-default btn-sm"
            title="Refresh"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <Link to="/search" className="btn btn-primary btn-sm">
            <Plus size={13} />
            Track Product
          </Link>
        </div>
      </div>

      <div className="page-content">
        {/* Stat Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span>Tracked Products</span>
              <Package size={14} />
            </div>
            <div className="stat-card-value yellow">{tracked.length}</div>
            <div className="stat-card-sub">{pricedCount} with live price</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span>Avg Price</span>
              <Tag size={14} />
            </div>
            <div className="stat-card-value">
              {avgPrice > 0 ? `₹${avgPrice.toLocaleString('en-IN')}` : '—'}
            </div>
            <div className="stat-card-sub">across tracked items</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span>Cron Schedule</span>
              <Clock size={14} />
            </div>
            <div className="stat-card-value lime">120m</div>
            <div className="stat-card-sub">via cron-job.org</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span>Recent Success</span>
              <Activity size={14} />
            </div>
            <div className="stat-card-value">
              {recentLogs.length > 0
                ? `${Math.round((successfulLogs / recentLogs.length) * 100)}%`
                : '—'}
            </div>
            <div className="stat-card-sub">last {recentLogs.length} runs</div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="dashboard-grid">
          {/* LEFT: Tracked Products */}
          <div className="dashboard-main">
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Package size={15} />
                  Tracked Products
                  <span
                    className="sidebar-badge"
                    style={{ marginLeft: 4 }}
                  >
                    {tracked.length}
                  </span>
                </div>
                <Link
                  to="/search"
                  className="btn btn-default btn-sm"
                >
                  <Plus size={12} /> Add
                </Link>
              </div>

              {loading ? (
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="skeleton"
                      style={{ height: '60px', borderRadius: '6px' }}
                    />
                  ))}
                </div>
              ) : tracked.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <TrendingDown size={22} />
                  </div>
                  <h3>No products tracked yet</h3>
                  <p>Browse the INE catalog and add products to start monitoring prices.</p>
                  <Link to="/search" className="btn btn-primary">
                    <Search size={13} />
                    Browse Catalog
                  </Link>
                </div>
              ) : (
                tracked.map((p) => {
                  const isScraping = scrapingId === p.id;
                  return (
                    <div key={p.id} className="product-row">
                      <div className="product-row-icon">
                        <Package size={16} />
                      </div>
                      <div className="product-row-info">
                        <Link
                          to={`/product/${p.id}`}
                          style={{
                            textDecoration: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}
                        >
                          <span className="product-row-name">{p.product_name}</span>
                          <span className="product-row-url">
                            {p.product_url.replace('https://', '')}
                          </span>
                        </Link>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '4px'
                          }}
                        >
                          <StockBadge stock={p.latest_stock} />
                          {p.updated_at && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)'
                              }}
                            >
                              {timeAgo(p.updated_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="product-row-price">
                        {p.latest_price
                          ? `₹${Number(p.latest_price).toLocaleString('en-IN')}`
                          : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Pending</span>}
                      </div>
                      <div className="product-row-actions">
                        <Link
                          to={`/product/${p.id}`}
                          className="btn btn-default btn-sm"
                          title="View details"
                        >
                          <Activity size={11} />
                          Details
                        </Link>
                        <button
                          onClick={() => scrapeNow(p.id)}
                          disabled={!!scrapingId}
                          className="btn btn-default btn-sm"
                          title="Force scrape now"
                        >
                          <RefreshCw
                            size={11}
                            className={isScraping ? 'spin' : ''}
                            style={isScraping ? { animation: 'spin 1s linear infinite' } : {}}
                          />
                        </button>
                        <button
                          onClick={() => untrack(p.id, p.product_name)}
                          className="btn btn-danger btn-sm"
                          title="Remove"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Activity Feed */}
          <div className="dashboard-side">
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Activity size={14} />
                  Recent Activity
                </div>
              </div>
              {recentLogs.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '13px'
                  }}
                >
                  No scrape activity yet.<br />
                  Click "Refresh" or trigger a scrape.
                </div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="activity-item">
                    <span
                      className={`activity-dot ${log.status.toLowerCase()}`}
                    />
                    <div className="activity-body">
                      <div className="activity-title">
                        {log.status === 'SUCCESS' ? (
                          <>
                            Scraped{' '}
                            <strong style={{ color: 'var(--yellow)' }}>
                              ₹{Number(log.price).toLocaleString('en-IN')}
                            </strong>
                          </>
                        ) : (
                          <>Run {log.status.toLowerCase()}</>
                        )}
                      </div>
                      <div className="activity-meta">
                        {log.product_name} · {timeAgo(log.started_at)} ·{' '}
                        {log.duration_ms
                          ? `${(log.duration_ms / 1000).toFixed(1)}s`
                          : ''}
                      </div>
                    </div>
                    <StatusBadge status={log.status} />
                  </div>
                ))
              )}
            </div>

            {/* Quick links panel */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Target size={14} />
                  Quick Info
                </div>
              </div>
              <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Target store', value: 'demo.inelabteamdev.com', mono: true },
                  { label: 'Bypass', value: 'Cookie overlay + Dwell gate + WASM' },
                  { label: 'Database', value: 'Supabase PostgreSQL' },
                  { label: 'Scraper', value: 'Playwright (Chromium)' }
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '12px'
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      {item.label}
                    </span>
                    <span
                      style={{
                        color: 'var(--text-secondary)',
                        textAlign: 'right',
                        fontFamily: item.mono ? 'JetBrains Mono, monospace' : undefined,
                        fontSize: item.mono ? '11px' : undefined
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Search / Catalog ────────────────────────────────────────────────────────

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(50);
  const [totalProducts, setTotalProducts] = useState(1000);
  const [trackedUrls, setTrackedUrls] = useState<Set<string>>(new Set());
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCatalog(1, query);
    fetchTracked();
  }, []);

  const fetchTracked = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products/tracked`);
      setTrackedUrls(
        new Set((res.data.products || []).map((p: any) => p.product_url))
      );
    } catch (e) {}
  };

  const fetchCatalog = async (targetPage = page, q = query) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: '20'
      });
      if (q && q.trim()) {
        params.append('q', q.trim());
      }
      const res = await axios.get(`${API_URL}/api/products/search?${params.toString()}`);
      setResults(res.data.results || []);
      if (res.data.page) setPage(res.data.page);
      if (res.data.pages) setTotalPages(res.data.pages);
      if (res.data.total) setTotalProducts(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCatalog(1, query);
  };

  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page || loading) return;
    setPage(newPage);
    fetchCatalog(newPage, query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const trackProduct = async (url: string, name: string) => {
    setTrackingUrl(url);
    try {
      const res = await axios.post(`${API_URL}/api/products/track`, {
        url,
        name
      });
      const newId = res.data.product?.id;
      setTrackedUrls((prev) => new Set([...prev, url]));
      if (newId) {
        axios.post(`${API_URL}/api/products/${newId}/scrape`).catch(() => {});
        navigate(`/product/${newId}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTrackingUrl(null);
    }
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-breadcrumb">
          <Link to="/">Dashboard</Link>
          <span className="topbar-breadcrumb-sep">/</span>
          <span>Browse Catalog</span>
        </div>
      </div>

      <div className="page-content">
        <div
          style={{
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)'
            }}
          >
            INE Store Catalog
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Showing {results.length} products on page {page} of {totalPages} ({totalProducts.toLocaleString()} total in store). Click "Track" to add price monitoring.
          </p>
        </div>

        <form onSubmit={handleSearch} className="search-box" style={{ marginBottom: '20px' }}>
          <div className="search-input-wrap">
            <Search size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, category, or brand…"
              className="search-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Search size={13} />
            )}
            Search
          </button>
        </form>

        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px'
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="skeleton"
                style={{ height: '110px', borderRadius: '6px' }}
              />
            ))}
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '12px'
              }}
            >
              {results.map((r, i) => {
                const isTracked = trackedUrls.has(r.url);
                const isProcessing = trackingUrl === r.url;
                return (
                  <div key={i} className="catalog-card">
                    <div className="catalog-card-icon">
                      <Package size={16} />
                    </div>
                    <div className="catalog-card-body">
                      <div className="catalog-card-sku">{r.sku || `#${r.id}`}</div>
                      <div className="catalog-card-name">{r.name}</div>
                      <div className="catalog-card-meta">
                        {r.category && (
                          <span className="tag lime">{r.category}</span>
                        )}
                        {r.brand && <span className="tag">{r.brand}</span>}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '10px'
                        }}
                      >
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            textDecoration: 'none'
                          }}
                        >
                          View <ExternalLink size={10} />
                        </a>
                        <button
                          onClick={() =>
                            !isTracked && !isProcessing && trackProduct(r.url, r.name)
                          }
                          disabled={isTracked || isProcessing}
                          className={`btn btn-sm ${
                            isTracked ? 'btn-default' : 'btn-primary'
                          }`}
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw
                                size={11}
                                style={{ animation: 'spin 1s linear infinite' }}
                              />
                              Adding…
                            </>
                          ) : isTracked ? (
                            <>
                              <CheckCircle2 size={11} />
                              Tracking
                            </>
                          ) : (
                            <>
                              <Plus size={11} />
                              Track
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '28px',
                  padding: '16px 0',
                  borderTop: '1px solid var(--border)'
                }}
              >
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1 || loading}
                  className="btn btn-default btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size={13} />
                  Prev
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {page > 2 && (
                    <>
                      <button
                        onClick={() => goToPage(1)}
                        className="btn btn-default btn-sm"
                        style={{ minWidth: '32px' }}
                      >
                        1
                      </button>
                      {page > 3 && (
                        <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
                      )}
                    </>
                  )}

                  {page > 1 && (
                    <button
                      onClick={() => goToPage(page - 1)}
                      className="btn btn-default btn-sm"
                      style={{ minWidth: '32px' }}
                    >
                      {page - 1}
                    </button>
                  )}

                  <button
                    className="btn btn-primary btn-sm"
                    style={{ minWidth: '32px', fontWeight: 600 }}
                  >
                    {page}
                  </button>

                  {page < totalPages && (
                    <button
                      onClick={() => goToPage(page + 1)}
                      className="btn btn-default btn-sm"
                      style={{ minWidth: '32px' }}
                    >
                      {page + 1}
                    </button>
                  )}

                  {page < totalPages - 1 && (
                    <>
                      {page < totalPages - 2 && (
                        <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
                      )}
                      <button
                        onClick={() => goToPage(totalPages)}
                        className="btn btn-default btn-sm"
                        style={{ minWidth: '32px' }}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="btn btn-default btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Next
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

// ─── Product Detail ──────────────────────────────────────────────────────────

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [scraping, setScraping] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [trackedRes, histRes, logsRes] = await Promise.all([
        axios.get(`${API_URL}/api/products/tracked`),
        axios.get(`${API_URL}/api/products/${id}/history`),
        axios.get(`${API_URL}/api/products/${id}/logs`)
      ]);
      const found = (trackedRes.data.products || []).find(
        (p: any) => p.id === id
      );
      setProduct(found || null);
      setHistory(histRes.data.history || []);
      setLogs(logsRes.data.logs || []);
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const scrapeNow = async () => {
    setScraping(true);
    try {
      await axios.post(`${API_URL}/api/products/${id}/scrape`);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setScraping(false);
    }
  };

  const chartData = history.map((h) => ({
    time: new Date(h.scraped_at).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    price: Number(h.price)
  }));

  const prices = history.map((h) => Number(h.price));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const latestPrice = prices.length ? prices[prices.length - 1] : null;
  const prevPrice = prices.length > 1 ? prices[prices.length - 2] : null;
  const priceDelta =
    latestPrice !== null && prevPrice !== null ? latestPrice - prevPrice : null;

  const successCount = logs.filter((l) => l.status === 'SUCCESS').length;
  const failedCount = logs.filter((l) => l.status === 'FAILED').length;

  return (
    <>
      <div className="topbar">
        <div className="topbar-breadcrumb">
          <Link to="/">Dashboard</Link>
          <span className="topbar-breadcrumb-sep">/</span>
          <span>{product?.product_name || `Product ${id}`}</span>
        </div>
        <div className="topbar-actions">
          <button
            onClick={scrapeNow}
            disabled={scraping}
            className="btn btn-primary btn-sm"
          >
            <RefreshCw
              size={12}
              style={scraping ? { animation: 'spin 1s linear infinite' } : {}}
            />
            {scraping ? 'Scraping…' : 'Scrape Now'}
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}
            >
              {product?.product_name || 'Loading…'}
            </h1>
            {product?.product_url && (
              <a
                href={product.product_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none'
                }}
              >
                {product.product_url} <ExternalLink size={11} />
              </a>
            )}
          </div>
          {product?.latest_stock && (
            <StockBadge stock={product.latest_stock} />
          )}
        </div>

        {/* Stat row */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
          <div className="stat-card">
            <div className="stat-card-header">
              <span>Current Price</span>
              <Tag size={14} />
            </div>
            <div className="stat-card-value yellow">
              {latestPrice ? `₹${latestPrice.toLocaleString('en-IN')}` : '—'}
            </div>
            {priceDelta !== null && (
              <div
                className="stat-card-sub"
                style={{
                  color: priceDelta < 0 ? 'var(--green)' : priceDelta > 0 ? 'var(--red)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {priceDelta < 0 ? <TrendingDown size={12} /> : priceDelta > 0 ? <TrendingUp size={12} /> : <Minus size={12} />}
                {priceDelta === 0
                  ? 'No change'
                  : `₹${Math.abs(priceDelta).toLocaleString('en-IN')} vs prev`}
              </div>
            )}
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span>Lowest Seen</span>
              <TrendingDown size={14} />
            </div>
            <div className="stat-card-value" style={{ color: 'var(--green)' }}>
              {minPrice ? `₹${minPrice.toLocaleString('en-IN')}` : '—'}
            </div>
            <div className="stat-card-sub">across {history.length} records</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span>Highest Seen</span>
              <TrendingUp size={14} />
            </div>
            <div className="stat-card-value" style={{ color: 'var(--red)' }}>
              {maxPrice ? `₹${maxPrice.toLocaleString('en-IN')}` : '—'}
            </div>
            <div className="stat-card-sub">across {history.length} records</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span>Run Success</span>
              <Activity size={14} />
            </div>
            <div className="stat-card-value">
              {logs.length > 0
                ? `${Math.round((successCount / logs.length) * 100)}%`
                : '—'}
            </div>
            <div className="stat-card-sub">
              {successCount} ok · {failedCount} failed
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="panel" style={{ marginBottom: '16px' }}>
          <div className="panel-header">
            <div className="panel-title">
              <BarChart2 size={14} />
              Price History
              <span className="sidebar-badge">{chartData.length} records</span>
            </div>
          </div>
          {chartData.length > 0 ? (
            <div style={{ height: '240px', padding: '16px 8px 8px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E3B341" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#E3B341" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#21262D"
                  />
                  <XAxis
                    dataKey="time"
                    tick={{
                      fontSize: 11,
                      fill: '#6E7681',
                      fontFamily: 'JetBrains Mono'
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: '#6E7681',
                      fontFamily: 'JetBrains Mono'
                    }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161B22',
                      border: '1px solid #30363D',
                      borderRadius: '6px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '12px',
                      color: '#E6EDF3'
                    }}
                    formatter={(val: any) => [
                      `₹${Number(val).toLocaleString('en-IN')}`,
                      'Price'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#E3B341"
                    strokeWidth={2}
                    fill="url(#priceGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <BarChart2 size={20} />
              </div>
              <h3>No price history yet</h3>
              <p>Click "Scrape Now" to capture the first price point.</p>
            </div>
          )}
        </div>

        {/* Logs Table */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Clock size={14} />
              Scrape Log
              <span className="sidebar-badge">{logs.length} runs</span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="gh-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th>Attempt</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="mono" style={{ fontSize: '12px' }}>
                      {new Date(log.started_at).toLocaleString()}
                    </td>
                    <td>
                      <StatusBadge status={log.status} />
                    </td>
                    <td
                      className="mono"
                      style={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    >
                      {log.attempt} / 3
                    </td>
                    <td
                      className="mono"
                      style={{ color: 'var(--yellow)', fontWeight: 700 }}
                    >
                      {log.price
                        ? `₹${Number(log.price).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="mono">
                      {log.duration_ms
                        ? `${(log.duration_ms / 1000).toFixed(1)}s`
                        : '—'}
                    </td>
                    <td
                      style={{
                        maxWidth: '240px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: log.error_message
                          ? 'var(--red)'
                          : 'var(--text-muted)'
                      }}
                    >
                      {log.error_message || 'Clean run'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}
                    >
                      No runs logged yet. Trigger a scrape above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────────────

function AppShell() {
  const [trackedCount, setTrackedCount] = useState(0);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/products/tracked`)
      .then((r) => setTrackedCount((r.data.products || []).length))
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <Sidebar trackedCount={trackedCount} />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}
