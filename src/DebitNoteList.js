import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

function DebitNoteList() {
    const API_URL = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [debitNotes, setDebitNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);
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
            return 'Debit note API route not found (404). Please restart backend server.';
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

    const fetchDebitNotes = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.set('q', query.trim());
            if (status) params.set('status', status);

            const res = await fetch(`${API_URL}/api/debit-notes?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;
            if (!res.ok) {
                const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to fetch debit notes');
                throw new Error(msg);
            }
            setDebitNotes(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Unable to load debit notes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchDebitNotes();
    }, [token]);

    const handleDownloadPdf = async (debitNote) => {
        setDownloadingId(debitNote.id);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/debit-notes/${debitNote.id}/pdf`, {
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
            a.download = `${debitNote.bill_no || 'debit_note'}.pdf`;
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

    const confirmCancel = async () => {
        const debitNote = cancelTarget;
        if (!debitNote) return;

        setCancellingId(debitNote.id);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/debit-notes/${debitNote.id}/cancel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;
            if (!res.ok) {
                const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to cancel debit note');
                throw new Error(msg);
            }
            setCancelTarget(null);
            await fetchDebitNotes();
        } catch (err) {
            setError(err.message || 'Failed to cancel debit note');
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <DashboardLayout user={user}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Debit Notes</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Create and manage supplier-side purchase debit notes.</p>
                </div>
                <button
                    onClick={() => navigate('/debit-notes/create')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                >
                    + Create Debit Note
                </button>
            </div>

            <div className="bg-gradient-to-br from-white via-indigo-50/50 to-white rounded-xl border border-indigo-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
                <div className="min-w-[220px] flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Search</label>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Debit note no or supplier"
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
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <button
                    onClick={fetchDebitNotes}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-black transition"
                >
                    Apply Filters
                </button>
                <button
                    onClick={() => {
                        setQuery('');
                        setStatus('');
                        fetchDebitNotes();
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
                    <h2 className="text-sm font-semibold text-gray-700">Debit Note List</h2>
                    <span className="text-xs text-gray-400">{debitNotes.length} records</span>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-gray-400">Loading debit notes...</div>
                ) : debitNotes.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">No debit notes found.</div>
                ) : (
                    <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Debit Note</th>
                                    <th className="px-4 py-2 text-left font-medium">Date</th>
                                    <th className="px-4 py-2 text-left font-medium">Supplier</th>
                                    <th className="px-4 py-2 text-right font-medium">Debit Total</th>
                                    <th className="px-4 py-2 text-left font-medium">Status</th>
                                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {debitNotes.map((dn) => (
                                    <tr key={dn.id} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">{dn.bill_no}</td>
                                        <td className="px-4 py-3 text-gray-600">{String(dn.bill_date || '').slice(0, 10)}</td>
                                        <td className="px-4 py-3 text-gray-600">{dn.party_name}</td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-700">{Number(dn.total_amount || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
                                                {String(dn.status || '').replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {String(dn.status) === 'draft' && (
                                                <button
                                                    onClick={() => navigate(`/debit-notes/${dn.id}/edit`)}
                                                    className="mr-3 text-xs font-semibold text-blue-700 hover:text-blue-900"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDownloadPdf(dn)}
                                                disabled={downloadingId === dn.id}
                                                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-60"
                                            >
                                                {downloadingId === dn.id ? 'Downloading...' : 'PDF'}
                                            </button>
                                            {String(dn.status) !== 'draft' && String(dn.status) !== 'cancelled' && (
                                                <button
                                                    onClick={() => setCancelTarget(dn)}
                                                    disabled={cancellingId === dn.id}
                                                    className="ml-3 text-xs font-semibold text-rose-700 hover:text-rose-900 disabled:opacity-60"
                                                >
                                                    {cancellingId === dn.id ? 'Cancelling...' : 'Cancel'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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
                                    <h3 className="text-base font-semibold text-gray-900">Cancel debit note {cancelTarget.bill_no}?</h3>
                                    <p className="mt-1.5 text-sm text-gray-500">This will restore the returned quantities back into stock. This action cannot be undone.</p>
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
                                Keep Debit Note
                            </button>
                            <button
                                type="button"
                                onClick={confirmCancel}
                                disabled={cancellingId === cancelTarget.id}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition disabled:opacity-60"
                            >
                                {cancellingId === cancelTarget.id ? 'Cancelling...' : 'Yes, Cancel Debit Note'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

export default DebitNoteList;
