import React, { useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import DashboardLayout from './DashboardLayout';

// Show whole numbers as-is (e.g. pcs => "10") and only keep decimals
// when the quantity is actually fractional (e.g. kg/litre => "9.5").
const formatQty = (value) => {
	const num = Number(value || 0);
	if (Number.isInteger(num)) return String(num);
	return parseFloat(num.toFixed(3)).toString();
};

const EMPTY_FORM = {
	name: '',
	sku: '',
	barcode: '',
	category: '',
	unit: 'pcs',
	hsn_code: '',
	sale_price: '0',
	purchase_price: '0',
	gst_percent: '0',
	opening_stock: '0',
	current_stock: '0',
	low_stock_threshold: '0',
	is_active: true,
};

function Items() {
	const API_URL = process.env.REACT_APP_API_URL;
	const [user, setUser] = useState(null);
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [importFailures, setImportFailures] = useState([]);
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState('');
	const [onlyLowStock, setOnlyLowStock] = useState(false);
	const [sortBy, setSortBy] = useState('updated_at');
	const [sortDir, setSortDir] = useState('desc');
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState(null);
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleteConfirmText, setDeleteConfirmText] = useState('');
	const [deleting, setDeleting] = useState(false);
	const [adjustTarget, setAdjustTarget] = useState(null);
	const [adjustForm, setAdjustForm] = useState({ direction: 'in', quantity: '1', reason: 'manual_adjustment' });
	const [adjusting, setAdjusting] = useState(false);
	const [importing, setImporting] = useState(false);
	const [selectedIds, setSelectedIds] = useState(() => new Set());
	const [labelModalOpen, setLabelModalOpen] = useState(false);
	const [labelTargets, setLabelTargets] = useState([]);
	const [labelOpts, setLabelOpts] = useState({ size: 'roll', showName: true, showPrice: false, showSku: false, copies: 1 });
	const fileInputRef = useRef(null);
	const labelPreviewRef = useRef(null);

	// Barcode camera scanner (fills the Barcode field in the item form).
	const [cameraOpen, setCameraOpen] = useState(false);
	const [cameraError, setCameraError] = useState('');
	const [cameraStarting, setCameraStarting] = useState(false);
	const cameraRef = useRef(null);

	const token = localStorage.getItem('token');

	useEffect(() => {
		if (token) {
			try {
				setUser(JSON.parse(atob(token.split('.')[1])));
			} catch {
				setUser(null);
			}
		}
	}, [token]);

	const fetchItems = async (nextPage = page) => {
		setLoading(true);
		setError('');
		try {
			const params = new URLSearchParams();
			if (query.trim()) params.set('q', query.trim());
			if (category.trim()) params.set('category', category.trim());
			if (onlyLowStock) params.set('lowStock', '1');
			params.set('page', String(nextPage));
			params.set('limit', String(limit));
			params.set('sortBy', sortBy);
			params.set('sortDir', sortDir);

			const res = await fetch(`${API_URL}/api/items?${params.toString()}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to fetch items');
			}
			if (Array.isArray(data)) {
				setItems(data);
				setPagination({ page: nextPage, totalPages: 1, total: data.length, limit });
			} else {
				setItems(Array.isArray(data.data) ? data.data : []);
				setPagination(data.pagination || { page: nextPage, totalPages: 1, total: 0, limit });
			}
			setPage(nextPage);
		} catch (err) {
			setError(err.message || 'Unable to load items');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (token) fetchItems(1);
	}, [token, query, category, onlyLowStock, limit, sortBy, sortDir]);

	const categories = useMemo(() => {
		const all = items.map((item) => item.category).filter(Boolean);
		return [...new Set(all)].sort((a, b) => a.localeCompare(b));
	}, [items]);

	const openCreateModal = () => {
		setNotice('');
		setImportFailures([]);
		setEditingItem(null);
		setForm({ ...EMPTY_FORM });
		setIsModalOpen(true);
	};

	const openEditModal = (item) => {
		setEditingItem(item);
		setForm({
			name: item.name || '',
			sku: item.sku || '',
			barcode: item.barcode || '',
			category: item.category || '',
			unit: item.unit || 'pcs',
			hsn_code: item.hsn_code || '',
			sale_price: String(item.sale_price ?? '0'),
			purchase_price: String(item.purchase_price ?? '0'),
			gst_percent: String(item.gst_percent ?? '0'),
			opening_stock: String(item.opening_stock ?? '0'),
			current_stock: String(item.current_stock ?? '0'),
			low_stock_threshold: String(item.low_stock_threshold ?? '0'),
			is_active: Boolean(item.is_active),
		});
		setIsModalOpen(true);
	};

	const closeModal = () => {
		if (saving) return;
		if (cameraRef.current) stopCamera();
		setIsModalOpen(false);
		setEditingItem(null);
		setForm({ ...EMPTY_FORM });
	};

	const handleFormChange = (field, value) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const stopCamera = async () => {
		const instance = cameraRef.current;
		cameraRef.current = null;
		if (instance) {
			try {
				await instance.stop();
			} catch (_) {
				/* already stopped */
			}
			try {
				instance.clear();
			} catch (_) {
				/* ignore */
			}
		}
		setCameraOpen(false);
		setCameraStarting(false);
	};

	const handleCameraDetected = (decodedText) => {
		const code = String(decodedText || '').trim();
		if (!code) return;
		setForm((prev) => ({ ...prev, barcode: code }));
		stopCamera();
	};

	const openCamera = async () => {
		setCameraError('');
		setCameraOpen(true);
		setCameraStarting(true);
		// Wait for the modal container to mount before starting the camera.
		setTimeout(async () => {
			try {
				const html5Qrcode = new Html5Qrcode('item-barcode-camera-region', {
					formatsToSupport: [
						Html5QrcodeSupportedFormats.CODE_128,
						Html5QrcodeSupportedFormats.CODE_39,
						Html5QrcodeSupportedFormats.EAN_13,
						Html5QrcodeSupportedFormats.EAN_8,
						Html5QrcodeSupportedFormats.UPC_A,
						Html5QrcodeSupportedFormats.UPC_E,
						Html5QrcodeSupportedFormats.QR_CODE,
					],
					verbose: false,
				});
				cameraRef.current = html5Qrcode;
				await html5Qrcode.start(
					{ facingMode: 'environment' },
					{ fps: 10, qrbox: { width: 250, height: 150 } },
					handleCameraDetected,
					() => { /* per-frame decode failures are normal; ignore */ }
				);
				setCameraStarting(false);
			} catch (err) {
				cameraRef.current = null;
				setCameraStarting(false);
				const message = String(err?.message || err || '');
				if (/NotAllowedError|Permission/i.test(message)) {
					setCameraError('Camera permission was denied. Please allow camera access and try again.');
				} else if (/NotFoundError|no camera|Requested device not found/i.test(message)) {
					setCameraError('No camera was found on this device.');
				} else if (/secure|https/i.test(message)) {
					setCameraError('Camera needs a secure (HTTPS) connection. It works on localhost during development.');
				} else {
					setCameraError(message || 'Unable to start the camera.');
				}
			}
		}, 150);
	};

	useEffect(() => {
		return () => {
			const instance = cameraRef.current;
			if (instance) {
				instance.stop().catch(() => {});
			}
		};
	}, []);

	const handleSave = async (e) => {
		e.preventDefault();
		setSaving(true);
		setError('');
		setNotice('');
		setImportFailures([]);
		try {
			const payload = {
				...form,
				sale_price: Number(form.sale_price || 0),
				purchase_price: Number(form.purchase_price || 0),
				gst_percent: Number(form.gst_percent || 0),
				opening_stock: Number(form.opening_stock || 0),
				current_stock: Number(form.current_stock || 0),
				low_stock_threshold: Number(form.low_stock_threshold || 0),
				is_active: form.is_active ? 1 : 0,
			};

			const isEditing = Boolean(editingItem?.id);
			const url = isEditing ? `${API_URL}/api/items/${editingItem.id}` : `${API_URL}/api/items`;
			const method = isEditing ? 'PUT' : 'POST';

			const res = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to save item');
			}

			closeModal();
			await fetchItems();
		} catch (err) {
			setError(err.message || 'Failed to save item');
		} finally {
			setSaving(false);
		}
	};

	const openDeleteModal = (item) => {
		setDeleteTarget(item);
		setDeleteConfirmText('');
	};

	const closeDeleteModal = () => {
		if (deleting) return;
		setDeleteTarget(null);
		setDeleteConfirmText('');
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		if (deleteConfirmText.trim() !== deleteTarget.name) {
			setError('Item name does not match. Please type the exact item name to confirm delete.');
			return;
		}

		setDeleting(true);
		setError('');
		setNotice('');
		setImportFailures([]);
		try {
			const res = await fetch(`${API_URL}/api/items/${deleteTarget.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to delete item');
			}
			closeDeleteModal();
			await fetchItems();
		} catch (err) {
			setError(err.message || 'Failed to delete item');
		} finally {
			setDeleting(false);
		}
	};

	const openAdjustModal = (item) => {
		setAdjustTarget(item);
		setAdjustForm({ direction: 'in', quantity: '1', reason: 'manual_adjustment' });
	};

	const closeAdjustModal = () => {
		if (adjusting) return;
		setAdjustTarget(null);
		setAdjustForm({ direction: 'in', quantity: '1', reason: 'manual_adjustment' });
	};

	const handleAdjustStock = async () => {
		if (!adjustTarget) return;
		const direction = String(adjustForm.direction || '').toLowerCase().trim();
		const quantity = Number(adjustForm.quantity);
		const reason = String(adjustForm.reason || 'manual_adjustment').trim() || 'manual_adjustment';

		if (direction !== 'in' && direction !== 'out') {
			setError('Direction must be "in" or "out"');
			return;
		}
		if (!Number.isFinite(quantity) || quantity <= 0) {
			setError('Quantity must be a positive number');
			return;
		}

		setAdjusting(true);
		setError('');
		setNotice('');
		setImportFailures([]);
		try {
			const res = await fetch(`${API_URL}/api/items/${adjustTarget.id}/adjust-stock`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ direction, quantity, reason }),
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to adjust stock');
			}
			closeAdjustModal();
			await fetchItems(page);
		} catch (err) {
			setError(err.message || 'Failed to adjust stock');
		} finally {
			setAdjusting(false);
		}
	};

	const handleDownloadTemplate = async () => {
		setError('');
		setNotice('');
		setImportFailures([]);
		try {
			const res = await fetch(`${API_URL}/api/items/template`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) {
				let msg = 'Failed to download template';
				try {
					const data = await res.json();
					msg = data.error || msg;
				} catch (_) {}
				throw new Error(msg);
			}

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'items_import_template.xlsx';
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

			const res = await fetch(`${API_URL}/api/items/import`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to import items');
			}

			const summary = data.summary || {};
			const failedText = summary.failedCount ? `, Failed: ${summary.failedCount}` : '';
			setNotice(`Import completed. Created: ${summary.created || 0}, Updated: ${summary.updated || 0}${failedText}`);
			setImportFailures(Array.isArray(summary.failed) ? summary.failed : []);

			if (summary.failedCount && Array.isArray(summary.failed) && summary.failed.length) {
				setError('Some rows failed. See failed rows section below, fix them, and re-import.');
			}

			await fetchItems(1);
		} catch (err) {
			setError(err.message || 'Failed to import items');
		} finally {
			setImporting(false);
		}
	};

	const handleResetFilters = () => {
		setQuery('');
		setCategory('');
		setOnlyLowStock(false);
		setSortBy('updated_at');
		setSortDir('desc');
		setLimit(20);
		setError('');
		setNotice('');
		setImportFailures([]);
		fetchItems(1);
	};

	// ---------- Barcode label printing ----------
	const toggleSelected = (id) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const allOnPageSelected = items.length > 0 && items.every((it) => selectedIds.has(it.id));

	const toggleSelectAllOnPage = () => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (allOnPageSelected) {
				items.forEach((it) => next.delete(it.id));
			} else {
				items.forEach((it) => next.add(it.id));
			}
			return next;
		});
	};

	const openLabelModal = (targets) => {
		const list = (targets || []).filter(Boolean);
		if (list.length === 0) {
			setError('Select at least one item to print labels.');
			return;
		}
		const missing = list.filter((it) => !it.barcode);
		if (missing.length === list.length) {
			setError('Selected item(s) have no barcode yet. Edit and save the item to auto-generate one first.');
			return;
		}
		setError('');
		setLabelTargets(list.filter((it) => it.barcode));
		setLabelOpts({ size: 'roll', showName: true, showPrice: false, showSku: false, copies: 1 });
		setLabelModalOpen(true);
	};

	const closeLabelModal = () => {
		setLabelModalOpen(false);
		setLabelTargets([]);
	};

	const renderBarcodeSvgMarkup = (code) => {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		try {
			JsBarcode(svg, code, {
				format: 'CODE128',
				width: labelOpts.size === 'a4' ? 1.6 : 1.4,
				height: labelOpts.size === 'a4' ? 45 : 36,
				fontSize: 12,
				margin: 4,
				displayValue: true,
			});
		} catch (_) {
			return `<span>${code}</span>`;
		}
		return svg.outerHTML;
	};

	const buildLabelHtml = (item) => {
		const safe = (v) => String(v == null ? '' : v).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
		const name = labelOpts.showName && item.name ? `<div class="lbl-name">${safe(item.name).slice(0, 28)}</div>` : '';
		const sku = labelOpts.showSku && item.sku ? `<div class="lbl-sku">${safe(item.sku)}</div>` : '';
		const price = labelOpts.showPrice ? `<div class="lbl-price">₹${Number(item.sale_price || 0).toFixed(2)}</div>` : '';
		return `<div class="label">${name}<div class="lbl-bc">${renderBarcodeSvgMarkup(item.barcode)}</div>${sku}${price}</div>`;
	};

	const handlePrintLabels = () => {
		const copies = Math.max(1, Math.min(200, Number(labelOpts.copies) || 1));
		const labels = [];
		labelTargets.forEach((item) => {
			for (let i = 0; i < copies; i += 1) labels.push(buildLabelHtml(item));
		});
		if (labels.length === 0) return;

		const isRoll = labelOpts.size === 'roll';
		const pageCss = isRoll
			? `@page { size: 50mm 25mm; margin: 0; }
			   body { margin: 0; }
			   .sheet { display: block; }
			   .label { width: 50mm; height: 25mm; box-sizing: border-box; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1mm; }`
			: `@page { size: A4; margin: 8mm; }
			   body { margin: 0; }
			   .sheet { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
			   .label { border: 1px dashed #cbd5e1; box-sizing: border-box; height: 25mm; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1mm; }`;

		const html = `<!doctype html><html><head><meta charset="utf-8"><title>Barcode Labels</title>
			<style>
				* { font-family: Arial, Helvetica, sans-serif; }
				${pageCss}
				.lbl-name { font-size: 9px; font-weight: 600; text-align: center; line-height: 1.1; max-width: 100%; overflow: hidden; }
				.lbl-sku { font-size: 8px; color: #444; }
				.lbl-price { font-size: 10px; font-weight: 700; }
				.lbl-bc svg { max-width: 100%; height: auto; }
				@media screen { body { background: #f3f4f6; padding: 16px; } .sheet { background:#fff; padding:8px; } }
			</style></head>
			<body><div class="sheet">${labels.join('')}</div>
			<script>window.onload = function(){ window.focus(); window.print(); };<\/script>
			</body></html>`;

		const win = window.open('', '_blank', 'width=900,height=650');
		if (!win) {
			setError('Could not open the print window. Please allow pop-ups for this site and try again.');
			return;
		}
		win.document.open();
		win.document.write(html);
		win.document.close();
	};

	// Live preview of the first label inside the modal.
	useEffect(() => {
		if (!labelModalOpen || !labelPreviewRef.current || labelTargets.length === 0) return;
		labelPreviewRef.current.innerHTML = buildLabelHtml(labelTargets[0]);
	}, [labelModalOpen, labelTargets, labelOpts]);

	return (
		<DashboardLayout user={user}>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-800">Items</h1>
					<p className="text-sm text-gray-500 mt-0.5">Manage inventory, pricing and stock levels.</p>
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
						onClick={() => openLabelModal(items.filter((it) => selectedIds.has(it.id)))}
						disabled={selectedIds.size === 0}
						className="bg-white text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold border border-indigo-300 hover:bg-indigo-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
						title="Print barcode labels for selected items"
					>
						🏷️ Print Labels{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
					</button>
					<button
						onClick={openCreateModal}
						className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
					>
						+ Add Item
					</button>
				</div>
			</div>

			<div className="bg-gradient-to-br from-white via-indigo-50/50 to-white rounded-xl border border-indigo-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
				<div className="min-w-[220px] flex-1">
					<label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Search</label>
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Name, SKU or barcode"
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
						<option value="">All categories</option>
						{categories.map((cat) => (
							<option key={cat} value={cat}>{cat}</option>
						))}
					</select>
				</div>
				<div className="min-w-[160px]">
					<label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Sort By</label>
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
						className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
					>
						<option value="updated_at">Last Updated</option>
						<option value="name">Name</option>
						<option value="sku">SKU</option>
						<option value="sale_price">Sale Price</option>
						<option value="purchase_price">Purchase Price</option>
						<option value="current_stock">Current Stock</option>
						<option value="gst_percent">GST %</option>
					</select>
				</div>
				<div className="min-w-[130px]">
					<label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Direction</label>
					<select
						value={sortDir}
						onChange={(e) => setSortDir(e.target.value)}
						className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
					>
						<option value="desc">Desc</option>
						<option value="asc">Asc</option>
					</select>
				</div>
				<div className="min-w-[120px]">
					<label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Rows</label>
					<select
						value={limit}
						onChange={(e) => setLimit(Number(e.target.value))}
						className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
					>
						<option value={10}>10</option>
						<option value={20}>20</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
				</div>
				<label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
					<input
						type="checkbox"
						checked={onlyLowStock}
						onChange={(e) => setOnlyLowStock(e.target.checked)}
						className="rounded border-gray-300 text-green-600 focus:ring-green-500"
					/>
					Low stock only
				</label>
				<button
					onClick={() => fetchItems(1)}
					className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-black transition"
				>
					Apply Filters
				</button>
				<button
					onClick={handleResetFilters}
					className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition"
				>
					Reset Filters
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
									<th className="px-4 py-2 text-left font-medium">Item Name</th>
									<th className="px-4 py-2 text-left font-medium">SKU</th>
									<th className="px-4 py-2 text-left font-medium">Reason</th>
								</tr>
							</thead>
							<tbody>
								{importFailures.map((f, idx) => (
									<tr key={`${f.row || idx}-${f.sku || idx}`} className="border-t border-amber-100">
										<td className="px-4 py-2 text-gray-700">{f.row || '-'}</td>
										<td className="px-4 py-2 text-gray-700">{f.name || '-'}</td>
										<td className="px-4 py-2 text-gray-700">{f.sku || '-'}</td>
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
					<h2 className="text-sm font-semibold text-gray-700">Items List</h2>
					<span className="text-xs text-gray-400">{pagination.total} records</span>
				</div>

				{loading ? (
					<div className="py-16 text-center text-gray-400">Loading items...</div>
				) : items.length === 0 ? (
					<div className="py-16 text-center text-gray-400">No items found.</div>
				) : (
					<div className="overflow-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
								<tr>
									<th className="px-4 py-2 text-left font-medium">
										<input
											type="checkbox"
											checked={allOnPageSelected}
											onChange={toggleSelectAllOnPage}
											className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
											title="Select all on this page"
										/>
									</th>
									<th className="px-4 py-2 text-left font-medium">Item</th>
									<th className="px-4 py-2 text-left font-medium">Category</th>
									<th className="px-4 py-2 text-left font-medium">Unit</th>
									<th className="px-4 py-2 text-right font-medium">Sale Price</th>
									<th className="px-4 py-2 text-right font-medium">Purchase Price</th>
									<th className="px-4 py-2 text-right font-medium">Stock</th>
									<th className="px-4 py-2 text-right font-medium">GST %</th>
									<th className="px-4 py-2 text-left font-medium">Status</th>
									<th className="px-4 py-2 text-right font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{items.map((item) => {
									const isLowStock = Number(item.current_stock) <= Number(item.low_stock_threshold);
									return (
										<tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
											<td className="px-4 py-3">
												<input
													type="checkbox"
													checked={selectedIds.has(item.id)}
													onChange={() => toggleSelected(item.id)}
													className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
												/>
											</td>
											<td className="px-4 py-3">
												<div className="font-medium text-gray-800">{item.name}</div>
												<div className="text-xs text-gray-400">SKU: {item.sku}</div>
												{item.barcode && (
													<div className="text-xs text-gray-400">Barcode: {item.barcode}</div>
												)}
											</td>
											<td className="px-4 py-3 text-gray-600">{item.category || '-'}</td>
											<td className="px-4 py-3 text-gray-600">{item.unit}</td>
											<td className="px-4 py-3 text-right font-medium text-gray-700">{Number(item.sale_price).toFixed(2)}</td>
											<td className="px-4 py-3 text-right font-medium text-gray-700">{Number(item.purchase_price).toFixed(2)}</td>
											<td className="px-4 py-3 text-right">
												<span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-700'}`}>
													{formatQty(item.current_stock)}
												</span>
												{isLowStock && (
													<span className="ml-2 inline-flex px-2 py-0.5 text-[10px] rounded-full bg-red-100 text-red-700 font-semibold">Low</span>
												)}
											</td>
											<td className="px-4 py-3 text-right text-gray-600">{Number(item.gst_percent).toFixed(2)}</td>
											<td className="px-4 py-3">
												<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
													{item.is_active ? 'Active' : 'Inactive'}
												</span>
											</td>
											<td className="px-4 py-3 text-right space-x-2">
												<button onClick={() => openAdjustModal(item)} className="text-amber-600 hover:text-amber-800 text-xs font-semibold">Adjust</button>
												<button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Edit</button>
												<button onClick={() => openLabelModal([item])} className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold">Label</button>
												<button onClick={() => openDeleteModal(item)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Delete</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<div className="mt-3 flex items-center justify-between text-sm text-gray-500">
				<span>
					Page {pagination.page} of {pagination.totalPages}
				</span>
				<div className="flex items-center gap-2">
					<button
						onClick={() => fetchItems(Math.max(1, page - 1))}
						disabled={page <= 1 || loading}
						className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
					>
						Previous
					</button>
					<button
						onClick={() => fetchItems(Math.min(pagination.totalPages || 1, page + 1))}
						disabled={page >= (pagination.totalPages || 1) || loading}
						className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
					>
						Next
					</button>
				</div>
			</div>

			{isModalOpen && (
				<div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
					<div className="bg-white w-full max-w-3xl rounded-xl shadow-lg border border-gray-200 flex flex-col max-h-[90vh]">
						<div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
							<h3 className="font-semibold text-gray-800">{editingItem ? 'Edit Item' : 'Add Item'}</h3>
							<button onClick={closeModal} className="text-gray-400 hover:text-gray-700">Close</button>
						</div>
						<form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
						<div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1 min-h-0">
							<div className="md:col-span-2 text-xs text-gray-500">
								<span className="text-red-500 font-semibold">*</span> indicates required fields
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Item Name <span className="text-red-500">*</span></label>
								<input value={form.name} onChange={(e) => handleFormChange('name', e.target.value)} required placeholder="Example: Parle-G 100g" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">SKU <span className="text-red-500">*</span></label>
								<input value={form.sku} onChange={(e) => handleFormChange('sku', e.target.value)} required placeholder="Example: FMCG-PARLE-100G" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Barcode</label>
								<div className="flex items-stretch gap-2">
									<input value={form.barcode} onChange={(e) => handleFormChange('barcode', e.target.value)} placeholder="Leave blank to auto-generate" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
									<button type="button" onClick={openCamera} title="Scan barcode with camera" className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100">
										<span role="img" aria-label="camera">📷</span> Camera
									</button>
								</div>
								<p className="mt-1 text-[11px] text-gray-400">Code128 — auto-generated if left blank.</p>
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Category</label>
								<input value={form.category} onChange={(e) => handleFormChange('category', e.target.value)} placeholder="Example: Biscuits" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Unit</label>
								<input value={form.unit} onChange={(e) => handleFormChange('unit', e.target.value)} placeholder="Example: pcs" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">HSN Code</label>
								<input value={form.hsn_code} onChange={(e) => handleFormChange('hsn_code', e.target.value)} placeholder="Example: 1905" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">GST %</label>
								<input type="number" step="0.01" value={form.gst_percent} onChange={(e) => handleFormChange('gst_percent', e.target.value)} placeholder="Example: 18" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Sale Price</label>
								<input type="number" step="0.01" value={form.sale_price} onChange={(e) => handleFormChange('sale_price', e.target.value)} placeholder="Example: 25.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Purchase Price</label>
								<input type="number" step="0.01" value={form.purchase_price} onChange={(e) => handleFormChange('purchase_price', e.target.value)} placeholder="Example: 20.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Opening Stock</label>
								<input type="number" step="0.001" value={form.opening_stock} onChange={(e) => handleFormChange('opening_stock', e.target.value)} placeholder="Example: 100" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Current Stock</label>
								<input type="number" step="0.001" value={form.current_stock} onChange={(e) => handleFormChange('current_stock', e.target.value)} placeholder="Example: 95" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">Low Stock Threshold</label>
								<input type="number" step="0.001" value={form.low_stock_threshold} onChange={(e) => handleFormChange('low_stock_threshold', e.target.value)} placeholder="Example: 20" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
							</div>
							<div className="flex items-center gap-2 pt-6">
								<input type="checkbox" checked={form.is_active} onChange={(e) => handleFormChange('is_active', e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
								<span className="text-sm text-gray-600">Active item</span>
							</div>
						</div>
						<div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-white shrink-0">
							<button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">Cancel</button>
							<button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
								{saving ? 'Saving...' : (editingItem ? 'Update Item' : 'Create Item')}
							</button>
						</div>
						</form>
					</div>
				</div>
			)}

			{cameraOpen && (
				<div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
					<div className="bg-white w-full max-w-md rounded-xl shadow-lg border border-gray-200 overflow-hidden">
						<div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
							<h3 className="font-semibold text-gray-800">Scan Barcode With Camera</h3>
							<button type="button" onClick={stopCamera} className="text-gray-400 hover:text-gray-700">Close</button>
						</div>
						<div className="p-4 space-y-3">
							<div className="relative w-full rounded-lg overflow-hidden bg-black/5 min-h-[220px]">
								{/* This div is owned entirely by html5-qrcode. React must NOT render children inside it. */}
								<div id="item-barcode-camera-region" className="w-full" />
								{cameraStarting && (
									<span className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 pointer-events-none">
										Starting camera…
									</span>
								)}
							</div>
							{cameraError && (
								<div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{cameraError}</div>
							)}
							<p className="text-xs text-gray-500">Point the camera at a barcode. The number fills in automatically once detected.</p>
							<div className="flex justify-end">
								<button type="button" onClick={stopCamera} className="px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-semibold hover:bg-gray-700">Cancel</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{adjustTarget && (
				<div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
					<div className="bg-white w-full max-w-lg rounded-xl shadow-lg border border-gray-200">
						<div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
							<h3 className="font-semibold text-gray-800">Adjust Stock</h3>
							<button onClick={closeAdjustModal} className="text-gray-400 hover:text-gray-700">Close</button>
						</div>
						<div className="p-5 space-y-4">
							<div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
								<p className="font-semibold text-gray-800">{adjustTarget.name}</p>
								<p className="text-gray-500">Current stock: {formatQty(adjustTarget.current_stock)}</p>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div>
									<label className="block text-xs text-gray-500 mb-1">Direction</label>
									<select
										value={adjustForm.direction}
										onChange={(e) => setAdjustForm((prev) => ({ ...prev, direction: e.target.value }))}
										className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
									>
										<option value="in">in (increase)</option>
										<option value="out">out (decrease)</option>
									</select>
								</div>
								<div>
									<label className="block text-xs text-gray-500 mb-1">Quantity</label>
									<input
										type="number"
										step="0.001"
										min="0.001"
										value={adjustForm.quantity}
										onChange={(e) => setAdjustForm((prev) => ({ ...prev, quantity: e.target.value }))}
										className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
									/>
								</div>
								<div className="md:col-span-1">
									<label className="block text-xs text-gray-500 mb-1">Reason</label>
									<input
										value={adjustForm.reason}
										onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
										placeholder="manual_adjustment"
										className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
									/>
								</div>
							</div>
							<div className="flex justify-end gap-2 pt-1">
								<button
									type="button"
									onClick={closeAdjustModal}
									className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleAdjustStock}
									disabled={adjusting}
									className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
								>
									{adjusting ? 'Updating...' : 'Apply Adjustment'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{deleteTarget && (
				<div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
					<div className="bg-white w-full max-w-lg rounded-xl shadow-lg border border-gray-200">
						<div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
							<h3 className="font-semibold text-gray-800">Delete Item</h3>
							<button onClick={closeDeleteModal} className="text-gray-400 hover:text-gray-700">Close</button>
						</div>
						<div className="p-5 space-y-4">
							<p className="text-sm text-gray-600">
								This action cannot be undone. To confirm deletion, type item name exactly:
							</p>
							<div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">
								{deleteTarget.name}
							</div>
							<input
								value={deleteConfirmText}
								onChange={(e) => setDeleteConfirmText(e.target.value)}
								placeholder="Type exact item name"
								className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
							/>
							<div className="flex justify-end gap-2 pt-1">
								<button
									type="button"
									onClick={closeDeleteModal}
									className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleDelete}
									disabled={deleting || deleteConfirmText.trim() !== deleteTarget.name}
									className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
								>
									{deleting ? 'Deleting...' : 'Delete Item'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{labelModalOpen && (
				<div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
					<div className="bg-white w-full max-w-2xl rounded-xl shadow-lg border border-gray-200 max-h-[90vh] overflow-auto">
						<div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
							<h3 className="font-semibold text-gray-800">Print Barcode Labels</h3>
							<button onClick={closeLabelModal} className="text-gray-400 hover:text-gray-700">Close</button>
						</div>
						<div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
							<div className="space-y-4">
								<div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
									<p className="font-semibold text-gray-800">{labelTargets.length} item{labelTargets.length === 1 ? '' : 's'} selected</p>
									<p className="text-gray-500 text-xs mt-0.5 truncate">
										{labelTargets.map((it) => it.name).slice(0, 4).join(', ')}{labelTargets.length > 4 ? '…' : ''}
									</p>
								</div>

								<div>
									<label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Label Size</label>
									<select
										value={labelOpts.size}
										onChange={(e) => setLabelOpts((p) => ({ ...p, size: e.target.value }))}
										className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
									>
										<option value="roll">Label roll (50mm × 25mm, one per label)</option>
										<option value="a4">A4 sheet (grid of labels)</option>
									</select>
								</div>

								<div>
									<label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Copies per item</label>
									<input
										type="number"
										min="1"
										max="200"
										value={labelOpts.copies}
										onChange={(e) => setLabelOpts((p) => ({ ...p, copies: e.target.value }))}
										className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
									/>
								</div>

								<div className="space-y-2">
									<label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Show On Label</label>
									<label className="flex items-center gap-2 text-sm text-gray-600">
										<input type="checkbox" checked={labelOpts.showName} onChange={(e) => setLabelOpts((p) => ({ ...p, showName: e.target.checked }))} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
										Item name
									</label>
									<label className="flex items-center gap-2 text-sm text-gray-600">
										<input type="checkbox" checked={labelOpts.showPrice} onChange={(e) => setLabelOpts((p) => ({ ...p, showPrice: e.target.checked }))} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
										Price <span className="text-[11px] text-gray-400">(changes over time — off by default)</span>
									</label>
									<label className="flex items-center gap-2 text-sm text-gray-600">
										<input type="checkbox" checked={labelOpts.showSku} onChange={(e) => setLabelOpts((p) => ({ ...p, showSku: e.target.checked }))} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
										SKU <span className="text-[11px] text-gray-400">(internal — off by default)</span>
									</label>
								</div>
							</div>

							<div className="space-y-3">
								<label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Preview</label>
								<div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-center min-h-[140px]">
									<div ref={labelPreviewRef} className="text-center [&_.lbl-name]:text-[11px] [&_.lbl-name]:font-semibold [&_.lbl-sku]:text-[10px] [&_.lbl-sku]:text-gray-500 [&_.lbl-price]:text-xs [&_.lbl-price]:font-bold" />
								</div>
								<p className="text-[11px] text-gray-400">
									The barcode (Code128) and its number always print. Preview shows the first selected item.
								</p>
							</div>
						</div>
						<div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
							<button type="button" onClick={closeLabelModal} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">Cancel</button>
							<button type="button" onClick={handlePrintLabels} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">Print</button>
						</div>
					</div>
				</div>
			)}
		</DashboardLayout>
	);
}

export default Items;
