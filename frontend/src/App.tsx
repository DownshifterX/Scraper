import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ChevronRight,
  ShieldCheck,
  Database,
  Info,
  Sliders,
  Code
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

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

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

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar({ trackedCount }: { trackedCount: number }) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const [activeSystemModal, setActiveSystemModal] = useState<string | null>(null);

  return (
    <>
      <aside className="sidebar">
        <Link
          to="/about"
          className="sidebar-logo"
          title="View Project Overview, Architecture & Author Info"
          style={{ transition: 'all 0.15s ease' }}
        >
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
          <Link
            to="/about"
            className={`sidebar-nav-item ${isActive('/about') ? 'active' : ''}`}
          >
            <Info size={16} />
            Project Home
          </Link>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">System Architecture</div>
          <button
            onClick={() => setActiveSystemModal('cron')}
            className="sidebar-nav-item"
            title="Click to view Cron Scheduling specifications"
          >
            <Clock size={16} />
            Cron Interval
            <span className="sidebar-badge lime">120m</span>
          </button>
          <button
            onClick={() => setActiveSystemModal('engine')}
            className="sidebar-nav-item"
            title="Click to view Playwright Engine Anti-Bot defense specs"
          >
            <Activity size={16} />
            Scraper Engine
            <span className="sidebar-badge yellow">Live</span>
          </button>
          <button
            onClick={() => setActiveSystemModal('retries')}
            className="sidebar-nav-item"
            title="Click to view Exponential Backoff & Retry strategy"
          >
            <BarChart2 size={16} />
            Max Retries
            <span className="sidebar-badge">3×</span>
          </button>
          <button
            onClick={() => setActiveSystemModal('db')}
            className="sidebar-nav-item"
            title="Click to view Supabase persistence details"
          >
            <Database size={16} />
            Supabase DB
            <span className="sidebar-badge">Active</span>
          </button>
        </div>

        <div className="sidebar-status">
          <a
            href="https://github.com/DownshifterX"
            target="_blank"
            rel="noreferrer"
            className="status-pill"
            style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            title="Open Developer GitHub Profile"
          >
            <GithubIcon size={13} />
            <span>@DownshifterX</span>
          </a>
        </div>
      </aside>

      {/* Interactive System Modals */}
      {activeSystemModal && (
        <div className="modal-overlay" onClick={() => setActiveSystemModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {activeSystemModal === 'cron' && <><Clock size={16} color="var(--lime)" /> Cron Scheduled Scraper</>}
                {activeSystemModal === 'engine' && <><Activity size={16} color="var(--yellow)" /> Playwright Anti-Bot Engine</>}
                {activeSystemModal === 'retries' && <><BarChart2 size={16} color="var(--yellow)" /> Retry & Backoff Strategy</>}
                {activeSystemModal === 'db' && <><Database size={16} color="var(--green)" /> Supabase PostgreSQL Database</>}
              </div>
              <button
                onClick={() => setActiveSystemModal(null)}
                className="btn btn-default btn-sm"
                style={{ padding: '2px 8px' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {activeSystemModal === 'cron' && (
                <div>
                  <p style={{ marginBottom: 12 }}>
                    The backend exposes an authenticated <code>POST /api/cron/scrape</code> endpoint protected by Bearer token authorization (<code>CRON_SECRET</code>).
                  </p>
                  <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li><strong>Cadence:</strong> Runs automatically every 120 minutes (2 hours).</li>
                    <li><strong>Instance Wakeup:</strong> Solves Render free-tier inactivity sleep by receiving external HTTP triggers from cron-job.org.</li>
                    <li><strong>Sequential Execution:</strong> Products are scraped sequentially with a 2,000ms cooldown to respect upstream rate limits.</li>
                  </ul>
                </div>
              )}
              {activeSystemModal === 'engine' && (
                <div>
                  <p style={{ marginBottom: 12 }}>
                    The Playwright scraper runs in headless Chromium and is specifically tuned to overcome the anti-bot defenses on <code>demo.inelabteamdev.com</code>:
                  </p>
                  <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li><strong>Cookie Banner Removal:</strong> Programmatically strips <code>.cookie-overlay</code> elements that intercept clicks.</li>
                    <li><strong>Human Dwell Gating:</strong> Performs 14+ mouse moves over 910ms to satisfy internal dwell requirements on the price block.</li>
                    <li><strong>WASM Challenge:</strong> Automatically waits for the cryptographic WebAssembly session token flow to complete.</li>
                    <li><strong>Honeypot Rejection:</strong> Strips hidden zero-opacity honeypot tags and segregates strike-through MRP.</li>
                  </ul>
                </div>
              )}
              {activeSystemModal === 'retries' && (
                <div>
                  <p style={{ marginBottom: 12 }}>
                    To prevent transient upstream 503s or network timeouts from corrupting data, the scraper implements a 3-attempt linear backoff mechanism:
                  </p>
                  <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li><strong>Attempt 1:</strong> Immediate execution with 25s navigation timeout.</li>
                    <li><strong>Attempt 2:</strong> 3,500ms backoff cooldown before retry.</li>
                    <li><strong>Attempt 3:</strong> 7,000ms backoff cooldown before final retry.</li>
                    <li><strong>Data Integrity Guarantee:</strong> Failed attempts are logged to <code>scrape_logs</code> but NEVER overwrite valid historical price data.</li>
                  </ul>
                </div>
              )}
              {activeSystemModal === 'db' && (
                <div>
                  <p style={{ marginBottom: 12 }}>
                    Data persistence is powered by Supabase PostgreSQL under project <code>blyqelcvjphbtpqqfbxj</code>:
                  </p>
                  <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li><code>tracked_products</code>: Stores live active items, last scraped price, and stock levels.</li>
                    <li><code>price_history</code>: Append-only ledger used for the Recharts interactive price chart.</li>
                    <li><code>scrape_logs</code>: Audit table capturing duration (ms), attempt counts, status, and error traces.</li>
                    <li><strong>Resilience Fallback:</strong> Automatically switches to an in-memory database store if credentials are missing.</li>
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setActiveSystemModal(null)}
                className="btn btn-default btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
          <Link
            to="/search"
            className="stat-card interactive-card"
            style={{ textDecoration: 'none' }}
            title="Click to browse the 1,000 product catalog and track more"
          >
            <div className="stat-card-header">
              <span>Tracked Products</span>
              <Package size={14} />
            </div>
            <div className="stat-card-value yellow">{tracked.length}</div>
            <div className="stat-card-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{pricedCount} with live price</span>
              <ExternalLink size={10} />
            </div>
          </Link>

          <Link
            to="/about"
            className="stat-card interactive-card"
            style={{ textDecoration: 'none' }}
            title="Click to view Price Tracker intelligence details"
          >
            <div className="stat-card-header">
              <span>Avg Tracked Price</span>
              <Tag size={14} />
            </div>
            <div className="stat-card-value">
              {avgPrice > 0 ? `₹${avgPrice.toLocaleString('en-IN')}` : '—'}
            </div>
            <div className="stat-card-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>across tracked items</span>
              <Info size={10} />
            </div>
          </Link>

          <Link
            to="/about"
            className="stat-card interactive-card"
            style={{ textDecoration: 'none' }}
            title="Click to view 120m Cron interval and deployment setup"
          >
            <div className="stat-card-header">
              <span>Cron Schedule</span>
              <Clock size={14} />
            </div>
            <div className="stat-card-value lime">120m</div>
            <div className="stat-card-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>via cron-job.org</span>
              <ExternalLink size={10} />
            </div>
          </Link>

          <div
            className="stat-card interactive-card"
            onClick={fetchAll}
            style={{ cursor: 'pointer' }}
            title="Click to refresh latest scrape logs and metrics"
          >
            <div className="stat-card-header">
              <span>Recent Success</span>
              <Activity size={14} />
            </div>
            <div className="stat-card-value">
              {recentLogs.length > 0
                ? `${Math.round((successfulLogs / recentLogs.length) * 100)}%`
                : '100%'}
            </div>
            <div className="stat-card-sub" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>last {recentLogs.length} runs</span>
              <RefreshCw size={10} />
            </div>
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
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(50);
  const [totalProducts, setTotalProducts] = useState(1000);
  const [trackedUrls, setTrackedUrls] = useState<Set<string>>(new Set());
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCatalog(1, '');
    fetchTracked();

    const handleClickOutside = (event: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live typing autocomplete (Amazon/Flipkart style)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/products/suggest?q=${encodeURIComponent(trimmed)}`);
        setSuggestions(res.data.suggestions || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

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
      if (res.data.total !== undefined) setTotalProducts(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    setPage(1);
    fetchCatalog(1, query);
  };

  const selectSuggestion = (item: any) => {
    setQuery(item.name);
    setShowSuggestions(false);
    setPage(1);
    fetchCatalog(1, item.name);
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
            {query.trim()
              ? `Found ${totalProducts} products matching "${query}". Page ${page} of ${totalPages}.`
              : `Showing ${results.length} products on page ${page} of ${totalPages} (${totalProducts.toLocaleString()} total in store).`}
          </p>
        </div>

        <form onSubmit={handleSearch} className="search-box" style={{ marginBottom: '20px' }}>
          <div className="search-input-wrap" ref={searchWrapRef}>
            <Search size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!showSuggestions && e.target.value.trim().length >= 2) {
                  setShowSuggestions(true);
                }
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="Search 1,000 products by name, category, brand, or SKU…"
              className="search-input"
            />

            {/* Live Flipkart / Amazon style suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions-dropdown">
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    className="search-suggestion-item"
                    onClick={() => selectSuggestion(item)}
                  >
                    <div className="suggestion-info">
                      <div className="suggestion-name">{item.name}</div>
                      <div className="suggestion-meta">
                        {item.brand && <span>{item.brand}</span>}
                        {item.category && <span className="tag lime">{item.category}</span>}
                        <span className="suggestion-sku">{item.sku || `#${item.id}`}</span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--text-muted)',
                        fontSize: '11px'
                      }}
                    >
                      <Search size={11} />
                    </div>
                  </div>
                ))}
              </div>
            )}
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

// ─── Project Home / Overview ──────────────────────────────────────────────────

function ProjectHome() {
  const [activeTab, setActiveTab] = useState<'overview' | 'scraper' | 'tech' | 'author'>('overview');

  return (
    <>
      <div className="topbar">
        <div className="topbar-breadcrumb">
          <Link to="/">Dashboard</Link>
          <span className="topbar-breadcrumb-sep">/</span>
          <span>Project Home</span>
        </div>
        <div className="topbar-actions">
          <a
            href="https://github.com/DownshifterX"
            target="_blank"
            rel="noreferrer"
            className="btn btn-default btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <GithubIcon size={13} />
            GitHub Profile
          </a>
          <Link to="/search" className="btn btn-primary btn-sm">
            <Search size={13} />
            Explore Store Catalog
          </Link>
        </div>
      </div>

      <div className="page-content">
        {/* Hero Section */}
        <div className="project-hero">
          <div>
            <div className="project-hero-badge">
              <Zap size={13} />
              <span>Full-Stack Price Intelligence Engine</span>
            </div>
            <h1>INE Mock Store Price Tracker</h1>
            <p>
              An automated, resilient price and inventory monitoring system designed specifically to overcome
              advanced bot mitigations including human dwell-time gating, dynamic WebAssembly challenges,
              anti-click cookie overlays, and deceptive DOM honeypots on the target store.
            </p>
          </div>
          <div className="project-hero-actions">
            <Link to="/" className="btn btn-primary">
              <LayoutDashboard size={14} />
              Live Dashboard
            </Link>
            <a
              href="https://demo.inelabteamdev.com/"
              target="_blank"
              rel="noreferrer"
              className="btn btn-default"
            >
              <ExternalLink size={14} />
              Target Store
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '24px',
            paddingBottom: '8px'
          }}
        >
          <button
            onClick={() => setActiveTab('overview')}
            className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-default'}`}
          >
            <Info size={13} />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('scraper')}
            className={`btn btn-sm ${activeTab === 'scraper' ? 'btn-primary' : 'btn-default'}`}
          >
            <ShieldCheck size={13} />
            Anti-Bot Defenses Bypassed
          </button>
          <button
            onClick={() => setActiveTab('tech')}
            className={`btn btn-sm ${activeTab === 'tech' ? 'btn-primary' : 'btn-default'}`}
          >
            <Code size={13} />
            Tech Stack & Architecture
          </button>
          <button
            onClick={() => setActiveTab('author')}
            className={`btn btn-sm ${activeTab === 'author' ? 'btn-primary' : 'btn-default'}`}
          >
            <GithubIcon size={13} />
            Developer Profile
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div>
            <div className="feature-cards-grid">
              <div className="feature-card">
                <div className="feature-card-icon">
                  <Package size={18} />
                </div>
                <h3>1,000 Catalog Cataloging</h3>
                <p>
                  Global search, live autocomplete recommendations, and comprehensive browsing across all 50 store pages.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon">
                  <ShieldCheck size={18} />
                </div>
                <h3>Playwright Web Automation</h3>
                <p>
                  Full headless Chromium execution capable of satisfying dwell-time requirements and WASM proof-of-work challenges.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon">
                  <Clock size={18} />
                </div>
                <h3>Automated 2-Hour Scheduling</h3>
                <p>
                  Configured via external HTTP cron triggers to defeat Render free-tier sleep cycles and track price swings reliably.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon">
                  <Database size={18} />
                </div>
                <h3>Supabase PostgreSQL Ledger</h3>
                <p>
                  Triple-table schema tracking live products, historical price logs for trend charts, and execution audit records.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon">
                  <Activity size={18} />
                </div>
                <h3>Data Integrity Guardrails</h3>
                <p>
                  Strict numeric checks (&gt;0) and strike-through MRP segregation. Failed requests never corrupt existing price data.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon">
                  <Sliders size={18} />
                </div>
                <h3>Linear Backoff Retries</h3>
                <p>
                  Up to 3 retries with progressive backoff (3.5s, 7.0s) gracefully absorbing simulated upstream rate limits.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Scraper Mechanics */}
        {activeTab === 'scraper' && (
          <div className="panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Reverse-Engineering the INE Mock Store Defenses
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--yellow)', display: 'block', marginBottom: '6px' }}>
                  1. Cookie Consent Banner Click-Jacking
                </strong>
                The target site renders a <code>.cookie-overlay</code> that absorbs all pointer interactions. Our scraper evaluates the DOM on arrival and programmatically removes all overlay wrappers before attempting interactions.
              </div>

              <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--yellow)', display: 'block', marginBottom: '6px' }}>
                  2. Human Dwell-Time & Mouse Movement Gating
                </strong>
                The React bundle tracks pointer movements via an internal tracker requiring <code>minMoves: 8</code> and <code>minDwellMs: 600</code>. We execute 14+ distinct bezier movements over 910ms to activate the button.
              </div>

              <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--yellow)', display: 'block', marginBottom: '6px' }}>
                  3. WebAssembly Cryptographic Challenge
                </strong>
                Clicking "Reveal price" invokes <code>/api/challenge</code> and generates a dynamic session token via WebAssembly before dispatching the authorized price quote. Playwright handles the entire WASM lifecycle naturally.
              </div>

              <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--yellow)', display: 'block', marginBottom: '6px' }}>
                  4. Honeypot DOM Element Evasion
                </strong>
                Zero-opacity and hidden elements (<code>display: none</code>) contain fake price traps. The scraper inspects computed CSS styles to extract only genuine rendered prices.
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Tech Stack */}
        {activeTab === 'tech' && (
          <div className="panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Architecture & Technology Stack
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Frontend</div>
                <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><strong>React 19 + TypeScript + Vite</strong></li>
                  <li><strong>GitHub Dark Theme</strong> (#0D1117 palette with racing yellow & lime accents)</li>
                  <li><strong>Recharts</strong> for responsive price history trends</li>
                  <li><strong>Lucide React</strong> icons</li>
                  <li>Instant debounced autocomplete suggestions</li>
                </ul>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Backend & Persistence</div>
                <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><strong>Node.js + Express + TypeScript</strong></li>
                  <li><strong>Playwright Chromium</strong> browser automation</li>
                  <li><strong>Supabase PostgreSQL</strong> (project blyqelcvjphbtpqqfbxj)</li>
                  <li>Bearer authenticated cron endpoint (<code>POST /api/cron/scrape</code>)</li>
                  <li>In-memory database fallback for zero-dependency local runs</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Developer / Author */}
        {activeTab === 'author' && (
          <div className="panel" style={{ padding: '28px', maxWidth: '680px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--bg-tertiary)',
                  border: '2px solid var(--yellow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--yellow)'
                }}
              >
                <GithubIcon size={32} />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  DownshifterX
                </h2>
                <div style={{ fontSize: '13px', color: 'var(--yellow)', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
                  github.com/DownshifterX
                </div>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              Full-stack developer building robust web automation, distributed scraping pipelines, and sleek modern developer interfaces.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href="https://github.com/DownshifterX"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <GithubIcon size={15} />
                Visit GitHub Profile
              </a>
              <a
                href="mailto:arorapratham758@gmail.com"
                className="btn btn-default"
              >
                Contact Author
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Signature Popup (press "/") ────────────────────────────────────────────

function SignaturePopup({ onClose }: { onClose: () => void }) {
  const [closing, setClosing] = React.useState(false);

  const close = React.useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 240);
  }, [onClose]);

  // Close on Escape or "/"
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '/') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  return (
    <div className="sig-overlay" onClick={close}>
      <div
        className={`sig-card${closing ? ' closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rotating glow ring */}
        <div className="sig-glow-ring" />

        <div className="sig-card-inner">
          {/* Eyebrow */}
          <div className="sig-eyebrow">Crafted with obsession</div>

          {/* Avatar */}
          <div className="sig-avatar">⚡</div>

          {/* Made by line */}
          <div className="sig-made-by">
            <span>Built by</span>
            <span className="sig-arrow">→</span>
          </div>

          {/* Name */}
          <div className="sig-name">
            DownshifterX
            <span className="sig-cursor" />
          </div>

          {/* Subname */}
          <div className="sig-subname">Pratham Arora</div>

          {/* Quote */}
          <div className="sig-quote">
            "Don't just <strong>scrape</strong> the surface —{' '}
            go <strong>full throttle</strong> through every
            anti-bot wall, honeypot trap, and{' '}
            WASM challenge they throw at you."
          </div>

          {/* Links */}
          <div className="sig-links">
            <a
              href="https://github.com/DownshifterX"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ gap: '7px' }}
            >
              <GithubIcon size={13} />
              @DownshifterX
            </a>
            <Link to="/about" className="btn btn-default" onClick={close}>
              <Info size={13} />
              Project Details
            </Link>
          </div>

          {/* Dismiss hint */}
          <div className="sig-hint">
            Press <span className="sig-kbd">Esc</span> or{' '}
            <span className="sig-kbd">/</span> to close
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────────────

function AppShell() {
  const [trackedCount, setTrackedCount] = useState(0);
  const [showSig, setShowSig] = useState(false);
  const location = useLocation();

  useEffect(() => {
    axios
      .get(`${API_URL}/api/products/tracked`)
      .then((r) => setTrackedCount((r.data.products || []).length))
      .catch(() => {});
  }, []);

  // Global "/" keypress → open signature popup
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't hijack when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '/' && !showSig) {
        e.preventDefault();
        setShowSig(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSig]);

  return (
    <div className="app-shell">
      <Sidebar trackedCount={trackedCount} />
      <div className="main-content">
        {/* key=pathname forces re-mount → zoom-in animation on every nav */}
        <div key={location.pathname} className="page-enter" style={{ display: 'contents' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/about" element={<ProjectHome />} />
            <Route path="/product/:id" element={<ProductDetail />} />
          </Routes>
        </div>
      </div>
      {showSig && <SignaturePopup onClose={() => setShowSig(false)} />}
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
