import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

function round2(value) {
	return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

const EMPTY_LINE = {
	item_id: '',
	quantity: '1',
	rate: '0',
	discount_percent: '0',
	gst_percent: '0',
};

function CreateEstimate() {
	const API_URL = process.env.REACT_APP_API_URL;
	const token = localStorage.getItem('token');
	const navigate = useNavigate();
	const { id } = useParams();
	const isEditMode = Boolean(id);
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const [parties, setParties] = useState([]);
	const [items, setItems] = useState([]);
	const [taxRates, setTaxRates] = useState([]);
	const [units, setUnits] = useState([]);

	const [estimateNo, setEstimateNo] = useState('');
	const [partyId, setPartyId] = useState('');
	const [estimateDate, setEstimateDate] = useState(new Date().toISOString().slice(0, 10));
	const [dueDate, setDueDate] = useState('');
	const [placeOfSupply, setPlaceOfSupply] = useState('');
	const [supplyType, setSupplyType] = useState('intra');
	const [status, setStatus] = useState('draft');
	const [roundOff, setRoundOff] = useState('0');
	const [notes, setNotes] = useState('');
	const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
	const defaultUnitCode = useMemo(() => {
		if (!units.length) return 'pcs';
		const firstActive = units.find((u) => Number(u.is_active) === 1);
		return String(firstActive?.unit_code || units[0]?.unit_code || 'pcs');
	}, [units]);

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
			return 'Estimates API route not found (404). Please restart backend server.';
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
				const requests = [
					fetch(`${API_URL}/api/parties?active=1`, { headers: { Authorization: `Bearer ${token}` } }),
					fetch(`${API_URL}/api/items?active=1&limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
					fetch(`${API_URL}/api/settings/tax-rates?active=1`, { headers: { Authorization: `Bearer ${token}` } }),
					fetch(`${API_URL}/api/settings/units?active=1`, { headers: { Authorization: `Bearer ${token}` } }),
				];

				if (isEditMode) {
					requests.push(fetch(`${API_URL}/api/estimates/${id}`, { headers: { Authorization: `Bearer ${token}` } }));
				} else {
					requests.push(fetch(`${API_URL}/api/estimates/next-estimate-no`, { headers: { Authorization: `Bearer ${token}` } }));
				}

				const [partiesRes, itemsRes, taxRatesRes, unitsRes, thirdRes] = await Promise.all(requests);

				const pType = partiesRes.headers.get('content-type') || '';
				const iType = itemsRes.headers.get('content-type') || '';
				const trType = taxRatesRes.headers.get('content-type') || '';
				const uType = unitsRes.headers.get('content-type') || '';
				const tType = thirdRes.headers.get('content-type') || '';

				const pData = pType.includes('application/json') ? await partiesRes.json() : null;
				const iData = iType.includes('application/json') ? await itemsRes.json() : null;
				const trData = trType.includes('application/json') ? await taxRatesRes.json() : null;
				const uData = uType.includes('application/json') ? await unitsRes.json() : null;
				const tData = tType.includes('application/json') ? await thirdRes.json() : null;

				if (!partiesRes.ok) {
					throw new Error(pData?.error ? `${pData.error} (HTTP ${partiesRes.status})` : await buildHttpErrorMessage(partiesRes, 'Failed to fetch parties'));
				}
				if (!itemsRes.ok) {
					throw new Error(iData?.error ? `${iData.error} (HTTP ${itemsRes.status})` : await buildHttpErrorMessage(itemsRes, 'Failed to fetch items'));
				}
				if (!taxRatesRes.ok) {
					throw new Error(trData?.error ? `${trData.error} (HTTP ${taxRatesRes.status})` : await buildHttpErrorMessage(taxRatesRes, 'Failed to fetch tax presets'));
				}
				if (!unitsRes.ok) {
					throw new Error(uData?.error ? `${uData.error} (HTTP ${unitsRes.status})` : await buildHttpErrorMessage(unitsRes, 'Failed to fetch unit presets'));
				}
				if (!thirdRes.ok) {
					throw new Error(tData?.error ? `${tData.error} (HTTP ${thirdRes.status})` : await buildHttpErrorMessage(thirdRes, isEditMode ? 'Failed to fetch estimate' : 'Failed to get next estimate number'));
				}

				setParties(Array.isArray(pData) ? pData : []);
				setItems(Array.isArray(iData?.data) ? iData.data : Array.isArray(iData) ? iData : []);
				setTaxRates(Array.isArray(trData) ? trData : []);
				setUnits(Array.isArray(uData) ? uData : []);

				if (isEditMode) {
					const estimate = tData?.estimate || null;
					const linesData = Array.isArray(tData?.items) ? tData.items : [];
					if (!estimate) {
						throw new Error('Estimate not found');
					}

					if (String(estimate.status) !== 'draft') {
						throw new Error('Only draft estimates can be edited');
					}

					setEstimateNo(estimate.invoice_no || '');
					setPartyId(String(estimate.party_id || ''));
					setEstimateDate(String(estimate.invoice_date || '').slice(0, 10));
					setDueDate(estimate.due_date ? String(estimate.due_date).slice(0, 10) : '');
					setPlaceOfSupply(estimate.place_of_supply || '');
					setStatus(estimate.status || 'draft');
					setRoundOff(String(estimate.round_off ?? '0'));
					setNotes(estimate.notes || '');

					const detectedSupplyType = Number(estimate.igst_amount || 0) > 0 ? 'inter' : 'intra';
					setSupplyType(detectedSupplyType);

					setLines(
						linesData.length
							? linesData.map((line) => ({
								item_id: String(line.item_id || ''),
								quantity: String(Math.max(1, Math.trunc(Number(line.quantity ?? 1)))),
								rate: String(line.rate ?? '0'),
								discount_percent: String(line.discount_percent ?? '0'),
								gst_percent: String(line.gst_percent ?? '0'),
							}))
							: [{ ...EMPTY_LINE }]
					);
				} else {
					setEstimateNo(tData?.estimateNo || '');
				}
			} catch (err) {
				setError(err.message || 'Failed to load estimate form data');
			}
		};

		if (token) init();
	}, [token, isEditMode, id]);

	const computed = useMemo(() => {
		const normalized = lines.map((line) => {
			const qty = Number(line.quantity || 0);
			const rate = Number(line.rate || 0);
			const discountPercent = Number(line.discount_percent || 0);
			const gstPercent = Number(line.gst_percent || 0);
			const base = round2(qty * rate);
			const discount = round2((base * discountPercent) / 100);
			const taxable = round2(base - discount);
			const gstAmount = round2((taxable * gstPercent) / 100);
			const cgst = supplyType === 'intra' ? round2(gstAmount / 2) : 0;
			const sgst = supplyType === 'intra' ? round2(gstAmount - cgst) : 0;
			const igst = supplyType === 'inter' ? gstAmount : 0;
			const total = round2(taxable + cgst + sgst + igst);
			return { base, discount, taxable, cgst, sgst, igst, total };
		});

		const subtotal = round2(normalized.reduce((sum, n) => sum + n.base, 0));
		const taxable = round2(normalized.reduce((sum, n) => sum + n.taxable, 0));
		const cgst = round2(normalized.reduce((sum, n) => sum + n.cgst, 0));
		const sgst = round2(normalized.reduce((sum, n) => sum + n.sgst, 0));
		const igst = round2(normalized.reduce((sum, n) => sum + n.igst, 0));
		const total = round2(taxable + cgst + sgst + igst + Number(roundOff || 0));

		return { subtotal, taxable, cgst, sgst, igst, total };
	}, [lines, roundOff, supplyType]);

	const handleLineChange = (index, field, value) => {
		setLines((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], [field]: value };

			if (field === 'quantity') {
				if (value === '') {
					next[index].quantity = '';
				} else {
					const qtyInt = Math.max(1, Math.trunc(Number(value) || 0));
					next[index].quantity = String(qtyInt);
				}
			}

			if (field === 'item_id') {
				const selected = items.find((it) => String(it.id) === String(value));
				if (selected) {
					next[index].rate = String(selected.sale_price ?? '0');
					next[index].gst_percent = String(selected.gst_percent ?? '0');
				}
			}
			return next;
		});
	};

	const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);
	const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

	const getLineUnit = (line) => {
		const selected = items.find((it) => String(it.id) === String(line.item_id));
		return String(selected?.unit || defaultUnitCode || 'pcs');
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		try {
			const payload = {
				estimate_no: estimateNo || undefined,
				party_id: Number(partyId),
				invoice_date: estimateDate,
				due_date: dueDate || null,
				place_of_supply: placeOfSupply || null,
				supply_type: supplyType,
				status,
				round_off: Number(roundOff || 0),
				notes: notes || null,
				items: lines
					.filter((line) => line.item_id)
					.map((line) => ({
						item_id: Number(line.item_id),
						quantity: Math.max(1, Math.trunc(Number(line.quantity || 0))),
						rate: Number(line.rate || 0),
						discount_percent: Number(line.discount_percent || 0),
						gst_percent: Number(line.gst_percent || 0),
					})),
			};

			const endpoint = isEditMode ? `${API_URL}/api/estimates/${id}` : `${API_URL}/api/estimates`;
			const method = isEditMode ? 'PUT' : 'POST';

			const res = await fetch(endpoint, {
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
				const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, isEditMode ? 'Failed to update estimate' : 'Failed to create estimate');
				throw new Error(msg);
			}
			navigate('/estimates');
		} catch (err) {
			setError(err.message || (isEditMode ? 'Failed to update estimate' : 'Failed to create estimate'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<DashboardLayout user={user}>
			<datalist id="gst-rate-options">
				{taxRates.map((rate) => (
					<option key={rate.id} value={Number(rate.rate_percent || 0)}>{rate.name}</option>
				))}
			</datalist>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Draft Estimate' : 'Create Estimate'}</h1>
					<p className="text-sm text-gray-500 mt-0.5">Prepare a GST estimate before final invoice creation.</p>
				</div>
				<button
					onClick={() => navigate('/estimates')}
					className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition"
				>
					Back to Estimates
				</button>
			</div>

			{error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
					<div>
						<label className="block text-xs text-gray-500 mb-1">Estimate No</label>
						<input value={estimateNo} onChange={(e) => setEstimateNo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
					</div>
					<div>
						<label className="block text-xs text-gray-500 mb-1">Party *</label>
						<select value={partyId} onChange={(e) => setPartyId(e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
							<option value="">Select party</option>
							{parties.map((party) => (
								<option key={party.id} value={party.id}>{party.name}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-xs text-gray-500 mb-1">Estimate Date *</label>
						<input type="date" value={estimateDate} onChange={(e) => setEstimateDate(e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
					</div>
					<div>
						<label className="block text-xs text-gray-500 mb-1">Valid Until</label>
						<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
					</div>
					<div>
						<label className="block text-xs text-gray-500 mb-1">Place Of Supply</label>
						<input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
					</div>
					<div>
						<label className="block text-xs text-gray-500 mb-1">Supply Type *</label>
						<select value={supplyType} onChange={(e) => setSupplyType(e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
							<option value="intra">Intra-state (CGST/SGST)</option>
							<option value="inter">Inter-state (IGST)</option>
						</select>
					</div>
				</div>

				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
						<h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
						<button type="button" onClick={addLine} className="text-sm font-semibold text-green-700 hover:text-green-800">+ Add Line</button>
					</div>
					<div className="overflow-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
								<tr>
									<th className="px-3 py-2 text-left">Item *</th>
									<th className="px-3 py-2 text-left">Unit</th>
									<th className="px-3 py-2 text-right">Qty *</th>
									<th className="px-3 py-2 text-right">Rate *</th>
									<th className="px-3 py-2 text-right">Disc %</th>
									<th className="px-3 py-2 text-right">GST %</th>
									<th className="px-3 py-2 text-right">Action</th>
								</tr>
							</thead>
							<tbody>
								{lines.map((line, index) => (
									<tr key={index} className="border-t border-gray-100">
										<td className="px-3 py-2 min-w-[260px]">
											<select value={line.item_id} onChange={(e) => handleLineChange(index, 'item_id', e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
												<option value="">Select item</option>
												{items.map((it) => (
													<option key={it.id} value={it.id}>{it.name} ({it.sku})</option>
												))}
											</select>
										</td>
										<td className="px-3 py-2 min-w-[80px] text-gray-700 font-medium">{getLineUnit(line)}</td>
										<td className="px-3 py-2 min-w-[110px]"><input type="number" step="1" min="1" value={line.quantity} onChange={(e) => handleLineChange(index, 'quantity', e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right" /></td>
										<td className="px-3 py-2 min-w-[120px]"><input type="number" step="0.01" min="0" value={line.rate} onChange={(e) => handleLineChange(index, 'rate', e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right" /></td>
										<td className="px-3 py-2 min-w-[110px]"><input type="number" step="0.01" min="0" value={line.discount_percent} onChange={(e) => handleLineChange(index, 'discount_percent', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right" /></td>
										<td className="px-3 py-2 min-w-[110px]"><input type="number" step="0.01" min="0" list="gst-rate-options" value={line.gst_percent} onChange={(e) => handleLineChange(index, 'gst_percent', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right" /></td>
										<td className="px-3 py-2 text-right">
											<button type="button" onClick={() => removeLine(index)} disabled={lines.length === 1} className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">Remove</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				<div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
					<div>
						<label className="block text-xs text-gray-500 mb-1">Status</label>
						<select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
							<option value="draft">Draft</option>
							<option value="confirmed">Confirmed</option>
						</select>
					</div>
					<div>
						<label className="block text-xs text-gray-500 mb-1">Round Off</label>
						<input type="number" step="0.01" value={roundOff} onChange={(e) => setRoundOff(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
					</div>
					<div className="md:col-span-1">
						<label className="block text-xs text-gray-500 mb-1">Notes</label>
						<input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
					</div>
					<div className="md:col-span-3 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
						<div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"><div className="text-xs text-gray-500">Subtotal</div><div className="font-semibold">{computed.subtotal.toFixed(2)}</div></div>
						<div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"><div className="text-xs text-gray-500">Taxable</div><div className="font-semibold">{computed.taxable.toFixed(2)}</div></div>
						<div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"><div className="text-xs text-gray-500">CGST</div><div className="font-semibold">{computed.cgst.toFixed(2)}</div></div>
						<div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"><div className="text-xs text-gray-500">SGST</div><div className="font-semibold">{computed.sgst.toFixed(2)}</div></div>
						<div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"><div className="text-xs text-gray-500">IGST</div><div className="font-semibold">{computed.igst.toFixed(2)}</div></div>
						<div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2"><div className="text-xs text-green-700">Total</div><div className="font-bold text-green-700">{computed.total.toFixed(2)}</div></div>
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<button type="button" onClick={() => navigate('/estimates')} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
					<button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
						{loading ? 'Saving...' : isEditMode ? 'Update Estimate' : 'Save Estimate'}
					</button>
				</div>
			</form>
		</DashboardLayout>
	);
}

export default CreateEstimate;
