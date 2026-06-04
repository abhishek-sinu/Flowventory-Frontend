import React, { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';

const EMPTY_COMPANY = {
    company_name: '',
    legal_name: '',
    gstin: '',
    pan: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    logo_url: '',
};

const EMPTY_TAX = { name: '', rate_percent: '0', tax_type: 'gst', is_active: true };
const EMPTY_UNIT = { unit_name: '', unit_code: '', is_active: true };
const EMPTY_BANK = {
    account_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    upi_id: '',
    opening_balance: '0',
    current_balance: '0',
    is_active: true,
};

function Settings() {
    const API_URL = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [company, setCompany] = useState(EMPTY_COMPANY);
    const [taxRates, setTaxRates] = useState([]);
    const [units, setUnits] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);

    const [taxForm, setTaxForm] = useState(EMPTY_TAX);
    const [unitForm, setUnitForm] = useState(EMPTY_UNIT);
    const [bankForm, setBankForm] = useState(EMPTY_BANK);

    const [editingTaxId, setEditingTaxId] = useState(null);
    const [editingUnitId, setEditingUnitId] = useState(null);
    const [editingBankId, setEditingBankId] = useState(null);

    const [savingCompany, setSavingCompany] = useState(false);
    const [savingTax, setSavingTax] = useState(false);
    const [savingUnit, setSavingUnit] = useState(false);
    const [savingBank, setSavingBank] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    useEffect(() => {
        if (token) {
            try {
                setUser(JSON.parse(atob(token.split('.')[1])));
            } catch {
                setUser(null);
            }
        }
    }, [token]);

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

    const authHeaders = {
        Authorization: `Bearer ${token}`,
    };

    const fetchAll = async () => {
        setLoading(true);
        setError('');

        try {
            const [companyRes, taxRes, unitRes, bankRes] = await Promise.all([
                fetch(`${API_URL}/api/settings/company-profile`, { headers: authHeaders }),
                fetch(`${API_URL}/api/settings/tax-rates`, { headers: authHeaders }),
                fetch(`${API_URL}/api/settings/units`, { headers: authHeaders }),
                fetch(`${API_URL}/api/settings/bank-accounts`, { headers: authHeaders }),
            ]);

            if (!companyRes.ok) throw new Error(await readErrorMessage(companyRes, 'Failed to fetch company profile'));
            if (!taxRes.ok) throw new Error(await readErrorMessage(taxRes, 'Failed to fetch tax rates'));
            if (!unitRes.ok) throw new Error(await readErrorMessage(unitRes, 'Failed to fetch units'));
            if (!bankRes.ok) throw new Error(await readErrorMessage(bankRes, 'Failed to fetch bank accounts'));

            const companyData = await companyRes.json();
            const taxData = await taxRes.json();
            const unitData = await unitRes.json();
            const bankData = await bankRes.json();

            setCompany({
                company_name: companyData?.company_name || '',
                legal_name: companyData?.legal_name || '',
                gstin: companyData?.gstin || '',
                pan: companyData?.pan || '',
                email: companyData?.email || '',
                phone: companyData?.phone || '',
                address: companyData?.address || '',
                city: companyData?.city || '',
                state: companyData?.state || '',
                pincode: companyData?.pincode || '',
                logo_url: companyData?.logo_url || '',
            });
            setTaxRates(Array.isArray(taxData) ? taxData : []);
            setUnits(Array.isArray(unitData) ? unitData : []);
            setBankAccounts(Array.isArray(bankData) ? bankData : []);
        } catch (err) {
            setError(err.message || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchAll();
    }, [token]);

    const handleSaveCompany = async (e) => {
        e.preventDefault();
        setSavingCompany(true);
        setError('');
        setNotice('');

        try {
            const res = await fetch(`${API_URL}/api/settings/company-profile`, {
                method: 'PUT',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(company),
            });

            if (!res.ok) {
                throw new Error(await readErrorMessage(res, 'Failed to save company profile'));
            }

            setNotice('Company profile saved successfully');
            await fetchAll();
        } catch (err) {
            setError(err.message || 'Failed to save company profile');
        } finally {
            setSavingCompany(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file
        if (!file) return;

        setUploadingLogo(true);
        setError('');
        setNotice('');
        try {
            const formData = new FormData();
            formData.append('logo', file);
            const res = await fetch(`${API_URL}/api/settings/company-logo`, {
                method: 'POST',
                headers: { ...authHeaders },
                body: formData,
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, 'Failed to upload logo'));
            }
            const data = await res.json();
            setCompany((p) => ({ ...p, logo_url: data.logo_url }));
            setNotice('Logo uploaded. Click "Save Company Profile" to apply.');
        } catch (err) {
            setError(err.message || 'Failed to upload logo');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSubmitTax = async (e) => {
        e.preventDefault();
        setSavingTax(true);
        setError('');
        setNotice('');
        try {
            const isEdit = Number.isFinite(editingTaxId) && editingTaxId > 0;
            const endpoint = isEdit ? `${API_URL}/api/settings/tax-rates/${editingTaxId}` : `${API_URL}/api/settings/tax-rates`;

            const res = await fetch(endpoint, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...taxForm,
                    rate_percent: Number(taxForm.rate_percent || 0),
                    is_active: taxForm.is_active ? 1 : 0,
                }),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, isEdit ? 'Failed to update tax rate' : 'Failed to add tax rate'));
            }
            setTaxForm(EMPTY_TAX);
            setEditingTaxId(null);
            setNotice(isEdit ? 'Tax rate updated' : 'Tax rate added');
            await fetchAll();
        } catch (err) {
            setError(err.message || 'Failed to save tax rate');
        } finally {
            setSavingTax(false);
        }
    };

    const handleStartEditTax = (row) => {
        setEditingTaxId(Number(row.id));
        setTaxForm({
            name: row.name || '',
            rate_percent: String(row.rate_percent ?? '0'),
            tax_type: row.tax_type || 'gst',
            is_active: Number(row.is_active) === 1,
        });
    };

    const handleCancelTaxEdit = () => {
        setEditingTaxId(null);
        setTaxForm(EMPTY_TAX);
    };

    const handleDeleteTax = async (id) => {
        setError('');
        setNotice('');
        try {
            const res = await fetch(`${API_URL}/api/settings/tax-rates/${id}`, {
                method: 'DELETE',
                headers: authHeaders,
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, 'Failed to delete tax rate'));
            }
            setNotice('Tax rate deleted');
            await fetchAll();
        } catch (err) {
            setError(err.message || 'Failed to delete tax rate');
        }
    };

    const handleSubmitUnit = async (e) => {
        e.preventDefault();
        setSavingUnit(true);
        setError('');
        setNotice('');
        try {
            const isEdit = Number.isFinite(editingUnitId) && editingUnitId > 0;
            const endpoint = isEdit ? `${API_URL}/api/settings/units/${editingUnitId}` : `${API_URL}/api/settings/units`;

            const res = await fetch(endpoint, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...unitForm,
                    is_active: unitForm.is_active ? 1 : 0,
                }),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, isEdit ? 'Failed to update unit' : 'Failed to add unit'));
            }
            setUnitForm(EMPTY_UNIT);
            setEditingUnitId(null);
            setNotice(isEdit ? 'Unit updated' : 'Unit added');
            await fetchAll();
        } catch (err) {
            setError(err.message || 'Failed to save unit');
        } finally {
            setSavingUnit(false);
        }
    };

    const handleStartEditUnit = (row) => {
        setEditingUnitId(Number(row.id));
        setUnitForm({
            unit_name: row.unit_name || '',
            unit_code: row.unit_code || '',
            is_active: Number(row.is_active) === 1,
        });
    };

    const handleCancelUnitEdit = () => {
        setEditingUnitId(null);
        setUnitForm(EMPTY_UNIT);
    };

    const handleDeleteUnit = async (id) => {
        setError('');
        setNotice('');
        try {
            const res = await fetch(`${API_URL}/api/settings/units/${id}`, {
                method: 'DELETE',
                headers: authHeaders,
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, 'Failed to delete unit'));
            }
            setNotice('Unit deleted');
            await fetchAll();
        } catch (err) {
            setError(err.message || 'Failed to delete unit');
        }
    };

    const handleSubmitBank = async (e) => {
        e.preventDefault();
        setSavingBank(true);
        setError('');
        setNotice('');
        try {
            const isEdit = Number.isFinite(editingBankId) && editingBankId > 0;
            const endpoint = isEdit ? `${API_URL}/api/settings/bank-accounts/${editingBankId}` : `${API_URL}/api/settings/bank-accounts`;

            const res = await fetch(endpoint, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...bankForm,
                    opening_balance: Number(bankForm.opening_balance || 0),
                    current_balance: Number(bankForm.current_balance || 0),
                    is_active: bankForm.is_active ? 1 : 0,
                }),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, isEdit ? 'Failed to update bank account' : 'Failed to add bank account'));
            }
            setBankForm(EMPTY_BANK);
            setEditingBankId(null);
            setNotice(isEdit ? 'Bank account updated' : 'Bank account added');
            await fetchAll();
        } catch (err) {
            setError(err.message || 'Failed to save bank account');
        } finally {
            setSavingBank(false);
        }
    };

    const handleStartEditBank = (row) => {
        setEditingBankId(Number(row.id));
        setBankForm({
            account_name: row.account_name || '',
            bank_name: row.bank_name || '',
            account_number: row.account_number || '',
            ifsc_code: row.ifsc_code || '',
            branch_name: row.branch_name || '',
            upi_id: row.upi_id || '',
            opening_balance: String(row.opening_balance ?? '0'),
            current_balance: String(row.current_balance ?? '0'),
            is_active: Number(row.is_active) === 1,
        });
    };

    const handleCancelBankEdit = () => {
        setEditingBankId(null);
        setBankForm(EMPTY_BANK);
    };

    const handleDeleteBank = async (id) => {
        setError('');
        setNotice('');
        try {
            const res = await fetch(`${API_URL}/api/settings/bank-accounts/${id}`, {
                method: 'DELETE',
                headers: authHeaders,
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, 'Failed to delete bank account'));
            }
            setNotice('Bank account deleted');
            await fetchAll();
        } catch (err) {
            setError(err.message || 'Failed to delete bank account');
        }
    };

    return (
        <DashboardLayout user={user}>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Company &amp; Settings</h1>
                <p className="text-sm text-gray-500 mt-0.5">Maintain company profile, tax rates, units, and bank accounts.</p>
            </div>

            {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
            {notice && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">{notice}</div>}

            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">Loading settings...</div>
            ) : (
                <div className="space-y-4">
                    <form onSubmit={handleSaveCompany} className="bg-white border border-gray-200 rounded-xl p-4">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">Company Profile</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <input value={company.company_name} onChange={(e) => setCompany((p) => ({ ...p, company_name: e.target.value }))} placeholder="Company Name *" className="border border-gray-200 rounded-lg px-3 py-2" required />
                            <input value={company.legal_name} onChange={(e) => setCompany((p) => ({ ...p, legal_name: e.target.value }))} placeholder="Legal Name" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <input value={company.gstin} onChange={(e) => setCompany((p) => ({ ...p, gstin: e.target.value }))} placeholder="GSTIN" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <input value={company.pan} onChange={(e) => setCompany((p) => ({ ...p, pan: e.target.value }))} placeholder="PAN" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <input value={company.email} onChange={(e) => setCompany((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <input value={company.phone} onChange={(e) => setCompany((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <input value={company.city} onChange={(e) => setCompany((p) => ({ ...p, city: e.target.value }))} placeholder="City" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <input value={company.state} onChange={(e) => setCompany((p) => ({ ...p, state: e.target.value }))} placeholder="State" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <input value={company.pincode} onChange={(e) => setCompany((p) => ({ ...p, pincode: e.target.value }))} placeholder="Pincode" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
                                <input value={company.logo_url} onChange={(e) => setCompany((p) => ({ ...p, logo_url: e.target.value }))} placeholder="Logo URL (or upload an image)" className="border border-gray-200 rounded-lg px-3 py-2" />
                                <label className="inline-flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition cursor-pointer whitespace-nowrap">
                                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                                    <input type="file" accept="image/png,image/jpeg" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" />
                                </label>
                            </div>
                            {company.logo_url ? (
                                <div className="md:col-span-3 flex items-center gap-3">
                                    <img
                                        src={company.logo_url.startsWith('/uploads') ? `${API_URL}${company.logo_url}` : company.logo_url}
                                        alt="Company logo preview"
                                        className="h-16 w-auto border border-gray-200 rounded-lg object-contain bg-white p-1"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                    <span className="text-xs text-gray-500">Logo preview (appears on all invoices &amp; PDFs)</span>
                                </div>
                            ) : null}
                            <textarea value={company.address} onChange={(e) => setCompany((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className="border border-gray-200 rounded-lg px-3 py-2 md:col-span-3" rows={2} />
                        </div>
                        <div className="mt-3">
                            <button disabled={savingCompany} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-black transition disabled:opacity-50">
                                {savingCompany ? 'Saving...' : 'Save Company Profile'}
                            </button>
                        </div>
                    </form>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h2 className="text-sm font-semibold text-gray-700 mb-3">Tax Rates</h2>
                            <form onSubmit={handleSubmitTax} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3 text-sm">
                                <input value={taxForm.name} onChange={(e) => setTaxForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className="border border-gray-200 rounded-lg px-3 py-2" required />
                                <input type="number" step="0.01" value={taxForm.rate_percent} onChange={(e) => setTaxForm((p) => ({ ...p, rate_percent: e.target.value }))} placeholder="Rate %" className="border border-gray-200 rounded-lg px-3 py-2" required />
                                <select value={taxForm.tax_type} onChange={(e) => setTaxForm((p) => ({ ...p, tax_type: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2">
                                    <option value="gst">GST</option>
                                    <option value="igst">IGST</option>
                                    <option value="cess">CESS</option>
                                    <option value="other">Other</option>
                                </select>
                                <button disabled={savingTax} className="bg-green-600 text-white rounded-lg px-3 py-2 font-semibold disabled:opacity-50">{savingTax ? 'Saving...' : editingTaxId ? 'Update' : 'Add'}</button>
                                {editingTaxId && (
                                    <button type="button" onClick={handleCancelTaxEdit} className="md:col-span-4 bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2 font-semibold">Cancel Edit</button>
                                )}
                            </form>
                            <div className="space-y-2">
                                {taxRates.map((row) => (
                                    <div key={row.id} className="border border-gray-100 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-gray-800">{row.name} ({Number(row.rate_percent || 0).toFixed(2)}%)</div>
                                            <div className="text-xs text-gray-500 uppercase">{row.tax_type}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button type="button" onClick={() => handleStartEditTax(row)} className="text-blue-600 text-xs font-semibold">Edit</button>
                                            <button type="button" onClick={() => handleDeleteTax(row.id)} className="text-red-600 text-xs font-semibold">Delete</button>
                                        </div>
                                    </div>
                                ))}
                                {taxRates.length === 0 && <div className="text-sm text-gray-400">No tax rates added.</div>}
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h2 className="text-sm font-semibold text-gray-700 mb-3">Units</h2>
                            <form onSubmit={handleSubmitUnit} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 text-sm">
                                <input value={unitForm.unit_name} onChange={(e) => setUnitForm((p) => ({ ...p, unit_name: e.target.value }))} placeholder="Unit Name" className="border border-gray-200 rounded-lg px-3 py-2" required />
                                <input value={unitForm.unit_code} onChange={(e) => setUnitForm((p) => ({ ...p, unit_code: e.target.value }))} placeholder="Unit Code" className="border border-gray-200 rounded-lg px-3 py-2" required />
                                <button disabled={savingUnit} className="bg-green-600 text-white rounded-lg px-3 py-2 font-semibold disabled:opacity-50">{savingUnit ? 'Saving...' : editingUnitId ? 'Update' : 'Add'}</button>
                                {editingUnitId && (
                                    <button type="button" onClick={handleCancelUnitEdit} className="md:col-span-3 bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2 font-semibold">Cancel Edit</button>
                                )}
                            </form>
                            <div className="space-y-2">
                                {units.map((row) => (
                                    <div key={row.id} className="border border-gray-100 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-gray-800">{row.unit_name}</div>
                                            <div className="text-xs text-gray-500 uppercase">{row.unit_code}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button type="button" onClick={() => handleStartEditUnit(row)} className="text-blue-600 text-xs font-semibold">Edit</button>
                                            <button type="button" onClick={() => handleDeleteUnit(row.id)} className="text-red-600 text-xs font-semibold">Delete</button>
                                        </div>
                                    </div>
                                ))}
                                {units.length === 0 && <div className="text-sm text-gray-400">No units added.</div>}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">Bank Accounts</h2>
                        <form onSubmit={handleSubmitBank} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3 text-sm">
                            <input value={bankForm.account_name} onChange={(e) => setBankForm((p) => ({ ...p, account_name: e.target.value }))} placeholder="Account Name" className="border border-gray-200 rounded-lg px-3 py-2" required />
                            <input value={bankForm.bank_name} onChange={(e) => setBankForm((p) => ({ ...p, bank_name: e.target.value }))} placeholder="Bank Name" className="border border-gray-200 rounded-lg px-3 py-2" required />
                            <input value={bankForm.account_number} onChange={(e) => setBankForm((p) => ({ ...p, account_number: e.target.value }))} placeholder="Account Number" className="border border-gray-200 rounded-lg px-3 py-2" required />
                            <input value={bankForm.ifsc_code} onChange={(e) => setBankForm((p) => ({ ...p, ifsc_code: e.target.value }))} placeholder="IFSC" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <input value={bankForm.branch_name} onChange={(e) => setBankForm((p) => ({ ...p, branch_name: e.target.value }))} placeholder="Branch" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <input value={bankForm.upi_id} onChange={(e) => setBankForm((p) => ({ ...p, upi_id: e.target.value }))} placeholder="UPI ID" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <input type="number" step="0.01" value={bankForm.opening_balance} onChange={(e) => setBankForm((p) => ({ ...p, opening_balance: e.target.value }))} placeholder="Opening Balance" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <input type="number" step="0.01" value={bankForm.current_balance} onChange={(e) => setBankForm((p) => ({ ...p, current_balance: e.target.value }))} placeholder="Current Balance" className="border border-gray-200 rounded-lg px-3 py-2" />
                            <button disabled={savingBank} className="md:col-span-4 bg-green-600 text-white rounded-lg px-3 py-2 font-semibold disabled:opacity-50">{savingBank ? 'Saving...' : editingBankId ? 'Update Bank Account' : 'Add Bank Account'}</button>
                            {editingBankId && (
                                <button type="button" onClick={handleCancelBankEdit} className="md:col-span-4 bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2 font-semibold">Cancel Edit</button>
                            )}
                        </form>
                        <div className="overflow-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Account</th>
                                        <th className="px-3 py-2 text-left">Bank</th>
                                        <th className="px-3 py-2 text-left">Number</th>
                                        <th className="px-3 py-2 text-right">Balance</th>
                                        <th className="px-3 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bankAccounts.map((row) => (
                                        <tr key={row.id} className="border-t border-gray-100">
                                            <td className="px-3 py-2">{row.account_name}</td>
                                            <td className="px-3 py-2">{row.bank_name}</td>
                                            <td className="px-3 py-2">{row.account_number}</td>
                                            <td className="px-3 py-2 text-right">{Number(row.current_balance || 0).toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button type="button" onClick={() => handleStartEditBank(row)} className="text-blue-600 text-xs font-semibold">Edit</button>
                                                    <button type="button" onClick={() => handleDeleteBank(row.id)} className="text-red-600 text-xs font-semibold">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {bankAccounts.length === 0 && (
                                        <tr>
                                            <td className="px-3 py-6 text-center text-gray-400" colSpan={5}>No bank accounts added.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

export default Settings;
