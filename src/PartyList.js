import React, { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from './DashboardLayout';

const EMPTY_FORM = {
	party_type: 'customer',
	name: '',
	phone: '',
	email: '',
	gstin: '',
	pan: '',
	billing_address: '',
	shipping_address: '',
	city: '',
	state: '',
	pincode: '',
	opening_balance: '0',
	balance_nature: 'receivable',
	current_balance: '0',
	is_active: true,
};

function PartyList() {
	const API_URL = process.env.REACT_APP_API_URL;
	const token = localStorage.getItem('token');
	const [user, setUser] = useState(null);
	const [parties, setParties] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [importFailures, setImportFailures] = useState([]);

	const [query, setQuery] = useState('');
	const [type, setType] = useState('');
	const [onlyActive, setOnlyActive] = useState(true);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingParty, setEditingParty] = useState(null);
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);

	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleteConfirmText, setDeleteConfirmText] = useState('');
	const [deleting, setDeleting] = useState(false);
	const [importing, setImporting] = useState(false);
	const fileInputRef = useRef(null);

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
			return 'Parties API route not found (404). Please restart backend server.';
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
		setLoading(true);
		setError('');
		try {
			const params = new URLSearchParams();
			if (query.trim()) params.set('q', query.trim());
			if (type) params.set('type', type);
			if (onlyActive) params.set('active', '1');

			const res = await fetch(`${API_URL}/api/parties?${params.toString()}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const contentType = res.headers.get('content-type') || '';
			const data = contentType.includes('application/json') ? await res.json() : null;
			if (!res.ok) {
				const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to fetch parties');
				throw new Error(msg);
			}
			setParties(Array.isArray(data) ? data : []);
		} catch (err) {
			setError(err.message || 'Unable to load parties');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (token) fetchParties();
	}, [token]);

	const summary = useMemo(() => {
		let receivables = 0;
		let payables = 0;
		for (const party of parties) {
			const bal = Number(party.current_balance || 0);
			const nature = (party.balance_nature_live || party.balance_nature || '').toLowerCase();
			if (nature === 'payable') {
				payables += bal;
			} else {
				receivables += bal;
			}
		}
		return { receivables, payables };
	}, [parties]);

	const openCreateModal = () => {
		setEditingParty(null);
		setForm({ ...EMPTY_FORM });
		setError('');
		setNotice('');
		setImportFailures([]);
		setIsModalOpen(true);
	};

	const openEditModal = (party) => {
		setEditingParty(party);
		setForm({
			party_type: party.party_type || 'customer',
			name: party.name || '',
			phone: party.phone || '',
			email: party.email || '',
			gstin: party.gstin || '',
			pan: party.pan || '',
			billing_address: party.billing_address || '',
			shipping_address: party.shipping_address || '',
			city: party.city || '',
			state: party.state || '',
			pincode: party.pincode || '',
			opening_balance: String(party.opening_balance ?? '0'),
			balance_nature: party.balance_nature || 'receivable',
			current_balance: String(party.current_balance ?? '0'),
			is_active: Boolean(party.is_active),
		});
		setError('');
		setNotice('');
		setImportFailures([]);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		if (saving) return;
		setIsModalOpen(false);
		setEditingParty(null);
		setForm({ ...EMPTY_FORM });
	};

	const handleFormChange = (field, value) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleSave = async (e) => {
		e.preventDefault();
		setSaving(true);
		setError('');
		setNotice('');
		setImportFailures([]);
		try {
			const payload = {
				...form,
				opening_balance: Number(form.opening_balance || 0),
				current_balance: Number(form.current_balance || 0),
				is_active: form.is_active ? 1 : 0,
			};

			const isEditing = Boolean(editingParty?.id);
			const url = isEditing ? `${API_URL}/api/parties/${editingParty.id}` : `${API_URL}/api/parties`;
			const method = isEditing ? 'PUT' : 'POST';

			const res = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});
			const contentType = res.headers.get('content-type') || '';
			const data = contentType.includes('application/json') ? await res.json() : null;
			if (!res.ok) {
				const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to save party');
				throw new Error(msg);
			}
			closeModal();
			setNotice(isEditing ? 'Party updated successfully' : 'Party created successfully');
			await fetchParties();
		} catch (err) {
			setError(err.message || 'Failed to save party');
		} finally {
			setSaving(false);
		}
	};

	const openDeleteModal = (party) => {
		setDeleteTarget(party);
		setDeleteConfirmText('');
		setError('');
		setNotice('');
		setImportFailures([]);
	};

	const closeDeleteModal = () => {
		if (deleting) return;
		setDeleteTarget(null);
		setDeleteConfirmText('');
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		if (deleteConfirmText.trim() !== deleteTarget.name) {
			setError('Party name does not match. Type exact party name to confirm delete.');
			return;
		}

		setDeleting(true);
		setError('');
		setNotice('');
		setImportFailures([]);
		try {
			const res = await fetch(`${API_URL}/api/parties/${deleteTarget.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` },
			});
			const contentType = res.headers.get('content-type') || '';
			const data = contentType.includes('application/json') ? await res.json() : null;
			if (!res.ok) {
				const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to delete party');
				throw new Error(msg);
			}
			closeDeleteModal();
			setNotice('Party deleted successfully');
			await fetchParties();
		} catch (err) {
			setError(err.message || 'Failed to delete party');
		} finally {
			setDeleting(false);
		}
	};

	const handleDownloadTemplate = async () => {
		setError('');
		setNotice('');
		setImportFailures([]);
		try {
			const res = await fetch(`${API_URL}/api/parties/template`, {
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
			a.download = 'parties_import_template.xlsx';
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		} catch (err) {
			setError(err.message || 'Failed to download template');
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

			const res = await fetch(`${API_URL}/api/parties/import`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});
			const contentType = res.headers.get('content-type') || '';
			const data = contentType.includes('application/json') ? await res.json() : null;
			if (!res.ok) {
				const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to import parties');
				throw new Error(msg);
			}

			const summary = data.summary || {};
			const failedText = summary.failedCount ? `, Failed: ${summary.failedCount}` : '';
			setNotice(`Import completed. Created: ${summary.created || 0}, Updated: ${summary.updated || 0}${failedText}`);
			setImportFailures(Array.isArray(summary.failed) ? summary.failed : []);

			if (summary.failedCount && Array.isArray(summary.failed) && summary.failed.length) {
				setError('Some rows failed. See failed rows section below, fix them, and re-import.');
			}

			await fetchParties();
		} catch (err) {
			setError(err.message || 'Failed to import parties');
		} finally {
			setImporting(false);
		}
	};

	return (
		<DashboardLayout user={user}>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-800">Parties</h1>
					<p className="text-sm text-gray-500 mt-0.5">Manage customers and suppliers with receivable/payable balances.</p>
				</div>
				<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
					<input
						ref={fileInputRef}
						type="file"
						accept=".xls,.xlsx"
						onChange={handleImportFileChange}
						className="hidden"
					/>
					<button
						onClick={handleDownloadTemplate}
						className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition"
					>
						Download Sample XLS
					</button>
					<button
						onClick={handleImportClick}
						disabled={importing}
						className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-60"
					>
						{importing ? 'Importing...' : 'Import XLS'}
					</button>
					<button
						onClick={openCreateModal}
						className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
					>
						+ Add Party
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
				<div className="bg-indigo-50 rounded-xl border border-indigo-100 border-t-4 border-t-indigo-500 p-4 shadow-sm">
					<div className="text-xs font-semibold uppercase tracking-wider text-indigo-700/80">Total Parties</div>
					<div className="text-2xl font-bold text-indigo-700 mt-1">{parties.length}</div>
				</div>
				<div className="bg-teal-50 rounded-xl border border-teal-100 border-t-4 border-t-teal-500 p-4 shadow-sm">
					<div className="text-xs font-semibold uppercase tracking-wider text-teal-700/80">Receivables</div>
					<div className="text-2xl font-bold text-teal-700 mt-1">{summary.receivables.toFixed(2)}</div>
				</div>
				<div className="bg-rose-50 rounded-xl border border-rose-100 border-t-4 border-t-rose-500 p-4 shadow-sm">
					<div className="text-xs font-semibold uppercase tracking-wider text-rose-700/80">Payables</div>
					<div className="text-2xl font-bold text-rose-700 mt-1">{summary.payables.toFixed(2)}</div>
				</div>
			</div>

			<div className="bg-gradient-to-br from-white via-indigo-50/50 to-white rounded-xl border border-indigo-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
				<div className="min-w-[220px] flex-1">
					<label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Search</label>
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Name, phone or GSTIN"
						className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
					/>
				</div>
				<div className="min-w-[180px]">
					<label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Type</label>
					<select
						value={type}
						onChange={(e) => setType(e.target.value)}
						className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
					>
						<option value="">All</option>
						<option value="customer">Customer</option>
						<option value="supplier">Supplier</option>
						<option value="both">Both</option>
					</select>
				</div>
				<label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
					<input
						type="checkbox"
						checked={onlyActive}
						onChange={(e) => setOnlyActive(e.target.checked)}
						className="rounded border-gray-300 text-green-600 focus:ring-green-500"
					/>
					Active only
				</label>
				<button
					onClick={fetchParties}
					className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-black transition"
				>
					Apply Filters
				</button>
				<button
					onClick={() => {
						setQuery('');
						setType('');
						setOnlyActive(true);
						setError('');
						setNotice('');
						setImportFailures([]);
						fetchParties();
					}}
					className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition"
				>
					Reset
				</button>
			</div>

			{error && (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
					{error}
				</div>
			)}

			{notice && (
				<div className="mb-4 rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">
					{notice}
				</div>
			)}

			{importFailures.length > 0 && (
				<div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
					<div className="px-4 py-3 border-b border-amber-200 flex items-center justify-between">
						<h3 className="text-sm font-semibold text-amber-900">Failed Import Rows</h3>
						<span className="text-xs font-semibold text-amber-800">{importFailures.length} rows</span>
					</div>
					<div className="px-4 py-3 text-xs text-amber-900">
						Fix these rows in your file and re-import only corrected entries.
					</div>
					<div className="overflow-auto max-h-72 bg-white">
						<table className="min-w-full text-sm">
							<thead className="bg-amber-100 text-amber-900 text-xs uppercase tracking-wider">
								<tr>
									<th className="px-4 py-2 text-left font-medium">Row</th>
									<th className="px-4 py-2 text-left font-medium">Party Name</th>
									<th className="px-4 py-2 text-left font-medium">GSTIN</th>
									<th className="px-4 py-2 text-left font-medium">Reason</th>
								</tr>
							</thead>
							<tbody>
								{importFailures.map((f, idx) => (
									<tr key={`${f.row || idx}-${f.gstin || idx}`} className="border-t border-amber-100">
										<td className="px-4 py-2 text-gray-700">{f.row || '-'}</td>
										<td className="px-4 py-2 text-gray-700">{f.name || '-'}</td>
										<td className="px-4 py-2 text-gray-700">{f.gstin || '-'}</td>
										<td className="px-4 py-2 text-red-700">{f.reason || 'Unknown error'}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-gray-700">Party List</h2>
					<span className="text-xs text-gray-400">{parties.length} records</span>
				</div>

				{loading ? (
					<div className="py-16 text-center text-gray-400">Loading parties...</div>
				) : parties.length === 0 ? (
					<div className="py-16 text-center text-gray-400">No parties found.</div>
				) : (
					<div className="overflow-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
								<tr>
									<th className="px-4 py-2 text-left font-medium">Party</th>
									<th className="px-4 py-2 text-left font-medium">Type</th>
									<th className="px-4 py-2 text-left font-medium">Contact</th>
									<th className="px-4 py-2 text-left font-medium">Location</th>
									<th className="px-4 py-2 text-right font-medium">Balance</th>
									<th className="px-4 py-2 text-left font-medium">Status</th>
									<th className="px-4 py-2 text-right font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{parties.map((party) => (
									<tr key={party.id} className="border-t border-gray-100 hover:bg-gray-50">
										<td className="px-4 py-3">
											<div className="font-medium text-gray-800">{party.name}</div>
											<div className="text-xs text-gray-400">GSTIN: {party.gstin || '-'}</div>
										</td>
										<td className="px-4 py-3 text-gray-600 capitalize">{party.party_type}</td>
										<td className="px-4 py-3 text-gray-600">
											<div>{party.phone || '-'}</div>
											<div className="text-xs text-gray-400">{party.email || '-'}</div>
										</td>
										<td className="px-4 py-3 text-gray-600">{party.city || '-'}{party.state ? `, ${party.state}` : ''}</td>
										<td className="px-4 py-3 text-right">
											<div className={`font-semibold ${(party.balance_nature_live || party.balance_nature) === 'payable' ? 'text-rose-700' : 'text-emerald-700'}`}>
												{Number(party.current_balance || 0).toFixed(2)}
											</div>
											<div className="text-[10px] uppercase text-gray-400 tracking-wider">{party.balance_nature_live || party.balance_nature}</div>
										</td>
										<td className="px-4 py-3">
											<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${party.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
												{party.is_active ? 'Active' : 'Inactive'}
											</span>
										</td>
										<td className="px-4 py-3 text-right space-x-2">
											<button onClick={() => openEditModal(party)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Edit</button>
											<button onClick={() => openDeleteModal(party)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Delete</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{isModalOpen && (
				<div className="fixed inset-0 z-50 bg-black/30 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
					<div className="bg-white w-full max-w-4xl rounded-xl shadow-lg border border-gray-200 max-h-[92vh] flex flex-col">
						<div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
							<h3 className="font-semibold text-gray-800">{editingParty ? 'Edit Party' : 'Add Party'}</h3>
							<button onClick={closeModal} className="text-gray-400 hover:text-gray-700">Close</button>
						</div>
						<form onSubmit={handleSave} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
							<div className="md:col-span-2 text-xs text-gray-500">
								<span className="text-red-500 font-semibold">*</span> indicates required fields
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Name <span className="text-red-500">*</span></label>
								<input value={form.name} onChange={(e) => handleFormChange('name', e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Party Type <span className="text-red-500">*</span></label>
								<select value={form.party_type} onChange={(e) => handleFormChange('party_type', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
									<option value="customer">Customer</option>
									<option value="supplier">Supplier</option>
									<option value="both">Both</option>
								</select>
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Phone</label>
								<input value={form.phone} onChange={(e) => handleFormChange('phone', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Email</label>
								<input value={form.email} onChange={(e) => handleFormChange('email', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">GSTIN</label>
								<input value={form.gstin} onChange={(e) => handleFormChange('gstin', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">PAN</label>
								<input value={form.pan} onChange={(e) => handleFormChange('pan', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">City</label>
								<input value={form.city} onChange={(e) => handleFormChange('city', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">State</label>
								<input value={form.state} onChange={(e) => handleFormChange('state', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Pincode</label>
								<input value={form.pincode} onChange={(e) => handleFormChange('pincode', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Balance Nature <span className="text-red-500">*</span></label>
								<select value={form.balance_nature} onChange={(e) => handleFormChange('balance_nature', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
									<option value="receivable">Receivable</option>
									<option value="payable">Payable</option>
								</select>
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Opening Balance</label>
								<input type="number" step="0.01" value={form.opening_balance} onChange={(e) => handleFormChange('opening_balance', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Current Balance</label>
								<input type="number" step="0.01" value={form.current_balance} onChange={(e) => handleFormChange('current_balance', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Active</label>
								<select value={form.is_active ? '1' : '0'} onChange={(e) => handleFormChange('is_active', e.target.value === '1')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
									<option value="1">Active</option>
									<option value="0">Inactive</option>
								</select>
							</div>
							<div className="md:col-span-2">
								<label className="block text-xs text-gray-500 mb-1">Billing Address</label>
								<textarea value={form.billing_address} onChange={(e) => handleFormChange('billing_address', e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div className="md:col-span-2">
								<label className="block text-xs text-gray-500 mb-1">Shipping Address</label>
								<textarea value={form.shipping_address} onChange={(e) => handleFormChange('shipping_address', e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div className="md:col-span-2 flex justify-end gap-2 pt-2">
								<button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
									Cancel
								</button>
								<button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
									{saving ? 'Saving...' : editingParty ? 'Update Party' : 'Create Party'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{deleteTarget && (
				<div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
					<div className="bg-white w-full max-w-md rounded-xl shadow-lg border border-gray-200">
						<div className="px-5 py-4 border-b border-gray-100">
							<h3 className="font-semibold text-gray-800">Delete Party</h3>
						</div>
						<div className="p-5 space-y-3">
							<p className="text-sm text-gray-600">
								Type <span className="font-semibold text-gray-900">{deleteTarget.name}</span> to confirm delete.
							</p>
							<input
								value={deleteConfirmText}
								onChange={(e) => setDeleteConfirmText(e.target.value)}
								placeholder="Type exact party name"
								className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
							/>
							<div className="flex justify-end gap-2 pt-2">
								<button onClick={closeDeleteModal} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
									Cancel
								</button>
								<button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
									{deleting ? 'Deleting...' : 'Delete Party'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</DashboardLayout>
	);
}

export default PartyList;
