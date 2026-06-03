import React, { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';

function PartyLedgerReport() {
    const API_URL = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [parties, setParties] = useState([]);
    const [partyId, setPartyId] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [summary, setSummary] = useState(null);
    const [entries, setEntries] = useState([]);

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

    const fetchParties = async () => {
        try {
            const res = await fetch(`${API_URL}/api/parties?active=1`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;
            if (!res.ok) {
                const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to fetch parties');
                throw new Error(msg);
            }

            const list = Array.isArray(data) ? data : [];
            setParties(list);
            if (!partyId && list.length > 0) {
                setPartyId(String(list[0].id));
            }
        } catch (err) {
            setError(err.message || 'Unable to load party list');
        }
    };

    const fetchReport = async (selectedPartyId = partyId) => {
        if (!selectedPartyId) return;

        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            params.set('party_id', String(selectedPartyId));
            if (fromDate) params.set('from_date', fromDate);
            if (toDate) params.set('to_date', toDate);

            const res = await fetch(`${API_URL}/api/report/party-ledger?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;
            if (!res.ok) {
                const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to fetch party ledger report');
                throw new Error(msg);
            }

            setSummary(data?.summary || null);
            setEntries(Array.isArray(data?.entries) ? data.entries : []);
        } catch (err) {
            setError(err.message || 'Unable to load party ledger');
            setSummary(null);
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchParties();
    }, [token]);

    useEffect(() => {
        if (token && partyId) fetchReport(partyId);
    }, [token, partyId]);

    const formatAmount = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <DashboardLayout user={user}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Party Ledger</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Voucher-wise statement with opening and running balance for a selected party.</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-white via-indigo-50/50 to-white rounded-xl border border-indigo-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
                <div className="min-w-[260px]">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Party</label>
                    <select
                        value={partyId}
                        onChange={(e) => setPartyId(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    >
                        <option value="">Select Party</option>
                        {parties.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.party_type})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">From Date</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">To Date</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                </div>
                <button
                    onClick={() => fetchReport()}
                    disabled={!partyId}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-black transition disabled:opacity-50"
                >
                    Apply Filters
                </button>
                <button
                    onClick={() => {
                        setFromDate('');
                        setToDate('');
                        setTimeout(() => fetchReport(), 0);
                    }}
                    disabled={!partyId}
                    className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
                >
                    Reset
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
            )}

            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">Loading report...</div>
            ) : !partyId ? (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">Select a party to view ledger.</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
                        <div className="bg-slate-50 border border-slate-200 border-t-4 border-t-slate-400 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Opening</div>
                            <div className="text-xl font-bold text-slate-700 mt-1">{formatAmount(summary?.opening_balance)}</div>
                            <div className="text-xs text-slate-500 mt-1 capitalize">{summary?.opening_nature || '-'}</div>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 border-t-4 border-t-rose-500 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-rose-700/80 uppercase tracking-wider font-semibold">Total Debit</div>
                            <div className="text-xl font-bold text-rose-700 mt-1">{formatAmount(summary?.total_debit)}</div>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 border-t-4 border-t-indigo-500 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-indigo-700/80 uppercase tracking-wider font-semibold">Total Credit</div>
                            <div className="text-xl font-bold text-indigo-700 mt-1">{formatAmount(summary?.total_credit)}</div>
                        </div>
                        <div className="bg-teal-50 border border-teal-100 border-t-4 border-t-teal-500 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-teal-700/80 uppercase tracking-wider font-semibold">Closing</div>
                            <div className="text-xl font-bold text-teal-700 mt-1">{formatAmount(summary?.closing_balance)}</div>
                            <div className="text-xs text-teal-600/80 mt-1 capitalize">{summary?.closing_nature || '-'}</div>
                        </div>
                        <div className="bg-violet-50 border border-violet-100 border-t-4 border-t-violet-500 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-violet-700/80 uppercase tracking-wider font-semibold">Entries</div>
                            <div className="text-xl font-bold text-violet-700 mt-1">{Number(summary?.entry_count || 0)}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700">Statement Entries</h2>
                            <span className="text-xs text-gray-400">{entries.length} rows</span>
                        </div>
                        {entries.length === 0 ? (
                            <div className="py-12 text-center text-gray-400">No records in selected range.</div>
                        ) : (
                            <div className="overflow-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium">Date</th>
                                            <th className="px-4 py-2 text-left font-medium">Source</th>
                                            <th className="px-4 py-2 text-left font-medium">Reference</th>
                                            <th className="px-4 py-2 text-right font-medium">Debit</th>
                                            <th className="px-4 py-2 text-right font-medium">Credit</th>
                                            <th className="px-4 py-2 text-right font-medium">Running Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entries.map((row) => (
                                            <tr key={`${row.txn_type}-${row.ref_id}`} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-700">{String(row.txn_date || '').slice(0, 10)}</td>
                                                <td className="px-4 py-3 text-gray-700">{row.source}</td>
                                                <td className="px-4 py-3 text-gray-700">{row.ref_no}</td>
                                                <td className="px-4 py-3 text-right text-blue-700 font-semibold">{formatAmount(row.debit_amount)}</td>
                                                <td className="px-4 py-3 text-right text-indigo-700 font-semibold">{formatAmount(row.credit_amount)}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                                                    {formatAmount(row.running_balance)}
                                                    <span className="ml-1 text-xs text-gray-500 capitalize">{row.running_nature}</span>
                                                </td>
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

export default PartyLedgerReport;
