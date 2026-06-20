import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

function PurchaseList() {
    const API_URL = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [user, setUser] = useState(null);
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [importing, setImporting] = useState(false);
    const [importFailures, setImportFailures] = useState([]);
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
    const [cancellingId, setCancellingId] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);

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
            return 'Purchase API route not found (404). Please restart backend server.';
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

    const fetchBills = async (nextPage = page, nextLimit = limit) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.set('q', query.trim());
            if (status) params.set('status', status);
            params.set('page', String(nextPage));
            params.set('limit', String(nextLimit));

            const res = await fetch(`${API_URL}/api/purchases?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;
            if (!res.ok) {
                const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to fetch purchase bills');
                throw new Error(msg);
            }

            if (Array.isArray(data)) {
                setBills(data);
                setPagination({ page: nextPage, totalPages: 1, total: data.length, limit: nextLimit });
            } else {
                setBills(Array.isArray(data.data) ? data.data : []);
                setPagination(data.pagination || { page: nextPage, totalPages: 1, total: 0, limit: nextLimit });
            }
            setPage(nextPage);
            setLimit(nextLimit);
        } catch (err) {
            setError(err.message || 'Unable to load purchase bills');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchBills(1, limit);
    }, [token]);

    const handleDownloadPdf = async (bill) => {
        setDownloadingId(bill.id);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/purchases/${bill.id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const msg = await buildHttpErrorMessage(res, 'Failed to download PDF');
                throw new Error(msg);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${bill.bill_no || 'purchase_bill'}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message || 'Failed to download PDF');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDownloadTemplate = async () => {
        setError('');
        setNotice('');
        setImportFailures([]);
        try {
            const res = await fetch(`${API_URL}/api/purchases/template`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const msg = await buildHttpErrorMessage(res, 'Failed to download template');
                throw new Error(msg);
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'purchase_import_template.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message || 'Failed to download template');
        }
    };

    const handleExportPurchases = async () => {
        setExporting(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.set('q', query.trim());
            if (status) params.set('status', status);

            const res = await fetch(`${API_URL}/api/purchases/xls?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const msg = await buildHttpErrorMessage(res, 'Failed to export purchases');
                throw new Error(msg);
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'purchase_export.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message || 'Failed to export purchases');
        } finally {
            setExporting(false);
        }
    };

    const handleImportClick = () => {
        setError('');
        setNotice('');
        setImportFailures([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleImportFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const name = file.name.toLowerCase();
        if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
            setError('Please select a valid .xls or .xlsx file');
            return;
        }

        setImporting(true);
        setError('');
        setNotice('');
        setImportFailures([]);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${API_URL}/api/purchases/import`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;
            if (!res.ok) {
                const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to import purchase bills');
                throw new Error(msg);
            }

            const summary = data?.summary || {};
            const failedText = summary.failedCount ? `, Failed: ${summary.failedCount}` : '';
            setNotice(`Import completed. Created: ${summary.created || 0}${failedText}`);
            setImportFailures(Array.isArray(summary.failed) ? summary.failed : []);
            await fetchBills();
        } catch (err) {
            setError(err.message || 'Failed to import purchase bills');
        } finally {
            setImporting(false);
        }
    };

    const confirmCancel = async () => {
        const bill = cancelTarget;
        if (!bill) return;

        setCancellingId(bill.id);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/purchases/${bill.id}/cancel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;
            if (!res.ok) {
                const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to cancel purchase bill');
                throw new Error(msg);
            }
            setCancelTarget(null);
            await fetchBills();
        } catch (err) {
            setError(err.message || 'Failed to cancel purchase bill');
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <DashboardLayout user={user}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Purchase Bills</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Create and manage supplier purchase bills.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleDownloadTemplate}
                        className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition"
                    >
                        Download Template
                    </button>
                    <button
                        onClick={handleExportPurchases}
                        disabled={exporting}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                    >
                        {exporting ? 'Exporting...' : 'Export Purchases'}
                    </button>
                    <label
                        htmlFor="purchase-import-file"
                        className="inline-flex items-center justify-center bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition cursor-pointer disabled:opacity-60"
                        aria-disabled={importing}
                    >
                        {importing ? 'Importing...' : 'Import Purchases'}
                    </label>
                    <button
                        onClick={() => navigate('/purchases/create')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                    >
                        + Record Purchase
                    </button>
                </div>
            </div>
            <input
                id="purchase-import-file"
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx"
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
                onChange={handleImportFileChange}
            />

            {notice && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
                    {notice}
                </div>
            )}

            {importFailures.length > 0 && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">Failed import rows</div>
                        <div className="text-xs font-medium text-amber-800">{importFailures.length} rows</div>
                    </div>
                    <div className="space-y-2">
                        {importFailures.slice(0, 5).map((failure, index) => (
                            <div key={index} className="rounded-lg bg-amber-100 px-3 py-2">
                                <div className="font-medium">Row {failure.row}{failure.bill_no ? ` (${failure.bill_no})` : ''}</div>
                                <div>{failure.reason}</div>
                            </div>
                        ))}
                        {importFailures.length > 5 && (
                            <div className="text-xs text-amber-800">And {importFailures.length - 5} more rows failed. Fix these rows and re-import the file.</div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-gradient-to-br from-white via-indigo-50/50 to-white rounded-xl border border-indigo-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
                <div className="min-w-[220px] flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Search</label>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Bill no or party"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                </div>
                <div className="min-w-[180px]">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    >
                        <option value="">All</option>
                        <option value="draft">Draft</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="partially_paid">Partially Paid</option>
                        <option value="paid">Paid</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <button
                    onClick={() => fetchBills(1, limit)}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-black transition"
                >
                    Apply Filters
                </button>
                <button
                    onClick={() => {
                        setQuery('');
                        setStatus('');
                        setPage(1);
                        fetchBills(1, limit);
                    }}
                    className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition"
                >
                    Reset
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">Purchase Bills</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span>{pagination.total} records</span>
                        <label className="flex items-center gap-2">
                            <span>Page</span>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    const nextLimit = Number(e.target.value) || 20;
                                    setPage(1);
                                    fetchBills(1, nextLimit);
                                }}
                                className="border border-gray-200 rounded-lg px-2 py-1 bg-white text-xs"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </label>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-gray-400">Loading purchase bills...</div>
                ) : bills.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">No purchase bills found.</div>
                ) : (
                    <div>
                        <div className="overflow-auto">
                            <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Bill</th>
                                    <th className="px-4 py-2 text-left font-medium">Date</th>
                                    <th className="px-4 py-2 text-left font-medium">Party</th>
                                    <th className="px-4 py-2 text-right font-medium">Total</th>
                                    <th className="px-4 py-2 text-right font-medium">Paid</th>
                                    <th className="px-4 py-2 text-right font-medium">Balance</th>
                                    <th className="px-4 py-2 text-left font-medium">Status</th>
                                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bills.map((bill) => (
                                    <tr key={bill.id} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">{bill.bill_no}</td>
                                        <td className="px-4 py-3 text-gray-600">{String(bill.bill_date || '').slice(0, 10)}</td>
                                        <td className="px-4 py-3 text-gray-600">{bill.party_name}</td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-700">{Number(bill.total_amount || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right text-gray-600">{Number(bill.paid_amount || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-rose-700">{Number(bill.balance_amount || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
                                                {String(bill.status || '').replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {String(bill.status) === 'draft' && (
                                                <button
                                                    onClick={() => navigate(`/purchases/${bill.id}/edit`)}
                                                    className="mr-3 text-xs font-semibold text-blue-700 hover:text-blue-900"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDownloadPdf(bill)}
                                                disabled={downloadingId === bill.id}
                                                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-60"
                                            >
                                                {downloadingId === bill.id ? 'Downloading...' : 'PDF'}
                                            </button>
                                            {String(bill.status) !== 'draft' && String(bill.status) !== 'cancelled' && (
                                                <button
                                                    onClick={() => setCancelTarget(bill)}
                                                    disabled={cancellingId === bill.id}
                                                    className="ml-3 text-xs font-semibold text-rose-700 hover:text-rose-900 disabled:opacity-60"
                                                >
                                                    {cancellingId === bill.id ? 'Cancelling...' : 'Cancel'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-gray-500">
                        Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fetchBills(Math.max(1, pagination.page - 1), limit)}
                            disabled={pagination.page <= 1 || loading}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => fetchBills(Math.min(pagination.totalPages || 1, pagination.page + 1), limit)}
                            disabled={pagination.page >= (pagination.totalPages || 1) || loading}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {cancelTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => cancellingId ? null : setCancelTarget(null)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-semibold text-gray-900">Cancel purchase bill {cancelTarget.bill_no}?</h3>
                                    <p className="mt-1.5 text-sm text-gray-500">This will remove the purchased quantities from stock. This action cannot be undone.</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setCancelTarget(null)}
                                disabled={cancellingId === cancelTarget.id}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition disabled:opacity-60"
                            >
                                Keep Bill
                            </button>
                            <button
                                type="button"
                                onClick={confirmCancel}
                                disabled={cancellingId === cancelTarget.id}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition disabled:opacity-60"
                            >
                                {cancellingId === cancelTarget.id ? 'Cancelling...' : 'Yes, Cancel Bill'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

export default PurchaseList;
