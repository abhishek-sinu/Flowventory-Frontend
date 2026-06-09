import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

function PaymentOutList() {
    const API_URL = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [paymentMode, setPaymentMode] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

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
            return 'Payment Out API route not found (404). Please restart backend server.';
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

    const fetchPayments = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.set('q', query.trim());
            if (paymentMode) params.set('payment_mode', paymentMode);

            const res = await fetch(`${API_URL}/api/payment-out?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;
            if (!res.ok) {
                const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to fetch payment out entries');
                throw new Error(msg);
            }
            setPayments(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Unable to load payment out entries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchPayments();
    }, [token]);

    const confirmDelete = async () => {
        const payment = deleteTarget;
        if (!payment) return;
        setDeletingId(payment.id);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/payment-out/${payment.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const msg = await buildHttpErrorMessage(res, 'Failed to delete payment');
                throw new Error(msg);
            }
            setDeleteTarget(null);
            await fetchPayments();
        } catch (err) {
            setError(err.message || 'Unable to delete payment');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <DashboardLayout user={user}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Payment Out</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Track and record supplier payments.</p>
                </div>
                <button
                    onClick={() => navigate('/payment-out/create')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                >
                    + Pay Supplier
                </button>
            </div>

            <div className="bg-gradient-to-br from-white via-indigo-50/50 to-white rounded-xl border border-indigo-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
                <div className="min-w-[220px] flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Search</label>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Payment no, party, bill or ref"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                </div>
                <div className="min-w-[180px]">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Mode</label>
                    <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    >
                        <option value="">All</option>
                        <option value="cash">Cash</option>
                        <option value="bank">Bank</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                        <option value="cheque">Cheque</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <button
                    onClick={fetchPayments}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-black transition"
                >
                    Apply Filters
                </button>
                <button
                    onClick={() => {
                        setQuery('');
                        setPaymentMode('');
                        fetchPayments();
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
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">Payments</h2>
                    <span className="text-xs text-gray-400">{payments.length} records</span>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-gray-400">Loading payment out entries...</div>
                ) : payments.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">No payment out entries found.</div>
                ) : (
                    <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Payment No</th>
                                    <th className="px-4 py-2 text-left font-medium">Date</th>
                                    <th className="px-4 py-2 text-left font-medium">Party</th>
                                    <th className="px-4 py-2 text-left font-medium">Bill</th>
                                    <th className="px-4 py-2 text-left font-medium">Mode</th>
                                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                                    <th className="px-4 py-2 text-left font-medium">Reference</th>
                                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">{payment.payment_no}</td>
                                        <td className="px-4 py-3 text-gray-600">{String(payment.payment_date || '').slice(0, 10)}</td>
                                        <td className="px-4 py-3 text-gray-600">{payment.party_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{payment.bill_no || 'Advance / On-account'}</td>
                                        <td className="px-4 py-3 text-gray-600 uppercase">{payment.payment_mode}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-rose-700">{Number(payment.amount || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-gray-600">{payment.reference_no || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setDeleteTarget(payment)}
                                                disabled={deletingId === payment.id}
                                                className="text-rose-600 hover:text-rose-800 font-semibold text-xs border border-rose-200 rounded-lg px-3 py-1.5 hover:bg-rose-50 transition disabled:opacity-50"
                                            >
                                                {deletingId === payment.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => deletingId ? null : setDeleteTarget(null)}
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
                                    <h3 className="text-base font-semibold text-gray-900">Delete payment {deleteTarget.payment_no}?</h3>
                                    <p className="mt-1.5 text-sm text-gray-500">This will reverse the linked bill's paid amount and balance. This action cannot be undone.</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deletingId === deleteTarget.id}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition disabled:opacity-60"
                            >
                                Keep Payment
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deletingId === deleteTarget.id}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition disabled:opacity-60"
                            >
                                {deletingId === deleteTarget.id ? 'Deleting...' : 'Yes, Delete Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

export default PaymentOutList;
