import React, { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';

function StockSummaryReport() {
    const API_URL = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [active, setActive] = useState('1');
    const [lowStockOnly, setLowStockOnly] = useState(false);

    const [categories, setCategories] = useState([]);
    const [summary, setSummary] = useState(null);
    const [items, setItems] = useState([]);

    const readErrorMessage = async (res, fallbackMessage) => {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                const data = await res.json();
                return data?.error || fallbackMessage;
            } catch (_) {
                return fallbackMessage;
            }
        }

        try {
            const text = await res.text();
            if (!text) return fallbackMessage;
            if (text.toLowerCase().includes('<!doctype') || text.toLowerCase().includes('<html')) {
                return fallbackMessage;
            }
            return text;
        } catch (_) {
            return fallbackMessage;
        }
    };

    const buildHttpErrorMessage = async (res, fallbackMessage) => {
        if (res.status === 401 || res.status === 403) {
            return 'Session expired or access denied. Please login again.';
        }
        if (res.status === 404) {
            return 'Report API route not found (404). Please restart backend server.';
        }
        const serverMessage = await readErrorMessage(res, fallbackMessage);
        return `${serverMessage} (HTTP ${res.status})`;
    };

    useEffect(() => {
        if (token) {
            try {
                setUser(JSON.parse(atob(token.split('.')[1])));
            } catch {
                setUser(null);
            }
        }
    }, [token]);

    const fetchReport = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.set('q', query.trim());
            if (category) params.set('category', category);
            if (active !== '') params.set('active', active);
            if (lowStockOnly) params.set('low_stock_only', '1');

            const res = await fetch(`${API_URL}/api/report/stock-summary?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;
            if (!res.ok) {
                const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to fetch stock summary report');
                throw new Error(msg);
            }

            setSummary(data?.summary || null);
            setItems(Array.isArray(data?.items) ? data.items : []);
            setCategories(Array.isArray(data?.categories) ? data.categories : []);
        } catch (err) {
            setError(err.message || 'Unable to load stock summary report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchReport();
    }, [token]);

    const formatAmount = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <DashboardLayout user={user}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Stock Summary</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Current stock quantities with inventory valuation snapshots.</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-white via-indigo-50/50 to-white rounded-xl border border-indigo-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
                <div className="min-w-[220px] flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Search</label>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Item name or SKU"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                </div>
                <div className="min-w-[180px]">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    >
                        <option value="">All</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="min-w-[150px]">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Active</label>
                    <select
                        value={active}
                        onChange={(e) => setActive(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    >
                        <option value="1">Active Only</option>
                        <option value="0">Inactive Only</option>
                        <option value="">All</option>
                    </select>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 pb-2">
                    <input
                        type="checkbox"
                        checked={lowStockOnly}
                        onChange={(e) => setLowStockOnly(e.target.checked)}
                    />
                    Low stock only
                </label>
                <button
                    onClick={fetchReport}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-black transition"
                >
                    Apply Filters
                </button>
                <button
                    onClick={() => {
                        setQuery('');
                        setCategory('');
                        setActive('1');
                        setLowStockOnly(false);
                        setTimeout(fetchReport, 0);
                    }}
                    className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition"
                >
                    Reset
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
            )}

            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">Loading report...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
                        <div className="bg-slate-50 border border-slate-200 border-t-4 border-t-slate-400 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Items</div>
                            <div className="text-xl font-bold text-slate-700 mt-1">{Number(summary?.total_items || 0)}</div>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 border-t-4 border-t-indigo-500 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-indigo-700/80 uppercase tracking-wider font-semibold">Total Stock Qty</div>
                            <div className="text-xl font-bold text-indigo-700 mt-1">{Number(summary?.total_stock_qty || 0).toFixed(3)}</div>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 border-t-4 border-t-rose-500 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-rose-700/80 uppercase tracking-wider font-semibold">Stock Value (Cost)</div>
                            <div className="text-xl font-bold text-rose-700 mt-1">{formatAmount(summary?.stock_value_cost)}</div>
                        </div>
                        <div className="bg-teal-50 border border-teal-100 border-t-4 border-t-teal-500 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-teal-700/80 uppercase tracking-wider font-semibold">Stock Value (Sale)</div>
                            <div className="text-xl font-bold text-teal-700 mt-1">{formatAmount(summary?.stock_value_sale)}</div>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 border-t-4 border-t-amber-500 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-amber-700/80 uppercase tracking-wider font-semibold">Low Stock Items</div>
                            <div className="text-xl font-bold text-amber-700 mt-1">{Number(summary?.low_stock_items || 0)}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700">Item-wise Stock</h2>
                            <span className="text-xs text-gray-400">{items.length} items</span>
                        </div>
                        {items.length === 0 ? (
                            <div className="py-12 text-center text-gray-400">No items found in selected filters.</div>
                        ) : (
                            <div className="overflow-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium">Item</th>
                                            <th className="px-4 py-2 text-left font-medium">SKU</th>
                                            <th className="px-4 py-2 text-left font-medium">Category</th>
                                            <th className="px-4 py-2 text-right font-medium">Current Stock</th>
                                            <th className="px-4 py-2 text-right font-medium">Threshold</th>
                                            <th className="px-4 py-2 text-right font-medium">Cost Value</th>
                                            <th className="px-4 py-2 text-right font-medium">Sale Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((row) => (
                                            <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                                                <td className="px-4 py-3 text-gray-600">{row.sku}</td>
                                                <td className="px-4 py-3 text-gray-600">{row.category || '-'}</td>
                                                <td className={`px-4 py-3 text-right font-semibold ${Number(row.low_stock_flag) === 1 ? 'text-amber-700' : 'text-gray-700'}`}>
                                                    {Number(row.current_stock || 0).toFixed(3)} {row.unit || ''}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-600">{Number(row.low_stock_threshold || 0).toFixed(3)}</td>
                                                <td className="px-4 py-3 text-right text-rose-700 font-semibold">{formatAmount(row.stock_value_cost)}</td>
                                                <td className="px-4 py-3 text-right text-green-700 font-semibold">{formatAmount(row.stock_value_sale)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </DashboardLayout>
    );
}

export default StockSummaryReport;
