import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

function CreatePaymentIn() {
    const API_URL = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [parties, setParties] = useState([]);
    const [invoices, setInvoices] = useState([]);

    const [receiptNo, setReceiptNo] = useState('');
    const [partyId, setPartyId] = useState('');
    const [salesInvoiceId, setSalesInvoiceId] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [amount, setAmount] = useState('0');
    const [paymentMode, setPaymentMode] = useState('cash');
    const [referenceNo, setReferenceNo] = useState('');
    const [notes, setNotes] = useState('');

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
            return 'Payment In API route not found (404). Please restart backend server.';
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

    useEffect(() => {
        const init = async () => {
            try {
                const [partiesRes, nextRes] = await Promise.all([
                    fetch(`${API_URL}/api/parties?active=1&type=customer`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${API_URL}/api/payment-in/next-receipt-no`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);

                const pType = partiesRes.headers.get('content-type') || '';
                const nType = nextRes.headers.get('content-type') || '';

                const pData = pType.includes('application/json') ? await partiesRes.json() : null;
                const nData = nType.includes('application/json') ? await nextRes.json() : null;

                if (!partiesRes.ok) {
                    throw new Error(pData?.error ? `${pData.error} (HTTP ${partiesRes.status})` : await buildHttpErrorMessage(partiesRes, 'Failed to fetch parties'));
                }
                if (!nextRes.ok) {
                    throw new Error(nData?.error ? `${nData.error} (HTTP ${nextRes.status})` : await buildHttpErrorMessage(nextRes, 'Failed to get next receipt number'));
                }

                setParties(Array.isArray(pData) ? pData : []);
                setReceiptNo(nData?.receiptNo || '');
            } catch (err) {
                setError(err.message || 'Failed to load payment form');
            }
        };

        if (token) init();
    }, [token]);

    const fetchOpenInvoices = async (selectedPartyId) => {
        if (!selectedPartyId) {
            setInvoices([]);
            setSalesInvoiceId('');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/payment-in/open-invoices?party_id=${selectedPartyId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;
            if (!res.ok) {
                const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to fetch open invoices');
                throw new Error(msg);
            }
            const list = Array.isArray(data) ? data : [];
            setInvoices(list);
            setSalesInvoiceId('');
        } catch (err) {
            setError(err.message || 'Failed to fetch open invoices');
            setInvoices([]);
            setSalesInvoiceId('');
        }
    };

    const selectedInvoice = invoices.find((inv) => String(inv.id) === String(salesInvoiceId));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = {
                receipt_no: receiptNo || undefined,
                party_id: Number(partyId),
                sales_invoice_id: salesInvoiceId ? Number(salesInvoiceId) : null,
                payment_date: paymentDate,
                amount: Number(amount || 0),
                payment_mode: paymentMode,
                reference_no: referenceNo || null,
                notes: notes || null,
            };

            const res = await fetch(`${API_URL}/api/payment-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;
            if (!res.ok) {
                const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to receive payment');
                throw new Error(msg);
            }
            navigate('/payment-in');
        } catch (err) {
            setError(err.message || 'Failed to receive payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout user={user}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Receive Payment</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Record customer receipts and settle open invoices.</p>
                </div>
                <button
                    onClick={() => navigate('/payment-in')}
                    className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition"
                >
                    Back to Payment In
                </button>
            </div>

            {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Receipt No</label>
                        <input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Customer Party *</label>
                        <select
                            value={partyId}
                            onChange={(e) => {
                                const nextPartyId = e.target.value;
                                setPartyId(nextPartyId);
                                fetchOpenInvoices(nextPartyId);
                            }}
                            required
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">Select customer</option>
                            {parties.map((party) => (
                                <option key={party.id} value={party.id}>{party.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Payment Date *</label>
                        <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Invoice (Optional)</label>
                        <select
                            value={salesInvoiceId}
                            onChange={(e) => setSalesInvoiceId(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">Advance / On-account</option>
                            {invoices.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                    {inv.invoice_no} | Bal: {Number(inv.balance_amount || 0).toFixed(2)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Amount *</label>
                        <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Payment Mode *</label>
                        <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                            <option value="cash">Cash</option>
                            <option value="bank">Bank</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                            <option value="cheque">Cheque</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Reference No</label>
                        <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Notes</label>
                        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                </div>

                {selectedInvoice && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                        Selected invoice balance: {Number(selectedInvoice.balance_amount || 0).toFixed(2)}.
                        Payment amount must be less than or equal to this balance.
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => navigate('/payment-in')} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
                        {loading ? 'Saving...' : 'Save Receipt'}
                    </button>
                </div>
            </form>
        </DashboardLayout>
    );
}

export default CreatePaymentIn;
