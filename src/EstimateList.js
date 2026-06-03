import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

function EstimateList() {
	const API_URL = process.env.REACT_APP_API_URL;
	const token = localStorage.getItem('token');
	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [estimates, setEstimates] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [query, setQuery] = useState('');
	const [status, setStatus] = useState('');
	const [downloadingId, setDownloadingId] = useState(null);

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

	const fetchEstimates = async () => {
		setLoading(true);
		setError('');
		try {
			const params = new URLSearchParams();
			if (query.trim()) params.set('q', query.trim());
			if (status) params.set('status', status);

			const res = await fetch(`${API_URL}/api/estimates?${params.toString()}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const contentType = res.headers.get('content-type') || '';
			const data = contentType.includes('application/json') ? await res.json() : null;
			if (!res.ok) {
				const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to fetch estimates');
				throw new Error(msg);
			}
			setEstimates(Array.isArray(data) ? data : []);
		} catch (err) {
			setError(err.message || 'Unable to load estimates');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (token) fetchEstimates();
	}, [token]);

	const handleDownloadPdf = async (estimate) => {
		setDownloadingId(estimate.id);
		setError('');
		try {
			const res = await fetch(`${API_URL}/api/estimates/${estimate.id}/pdf`, {
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
			a.download = `${estimate.invoice_no || 'estimate'}.pdf`;
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

	return (
		<DashboardLayout user={user}>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-800">Estimates</h1>
					<p className="text-sm text-gray-500 mt-0.5">Create and manage customer estimates.</p>
				</div>
				<button
					onClick={() => navigate('/estimates/create')}
					className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
				>
					+ Create Estimate
				</button>
			</div>

			<div className="bg-gradient-to-br from-white via-indigo-50/50 to-white rounded-xl border border-indigo-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
				<div className="min-w-[220px] flex-1">
					<label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Search</label>
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Estimate no or party"
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
					onClick={fetchEstimates}
					className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-black transition"
				>
					Apply Filters
				</button>
				<button
					onClick={() => {
						setQuery('');
						setStatus('');
						fetchEstimates();
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
					<h2 className="text-sm font-semibold text-gray-700">Estimate List</h2>
					<span className="text-xs text-gray-400">{estimates.length} records</span>
				</div>

				{loading ? (
					<div className="py-16 text-center text-gray-400">Loading estimates...</div>
				) : estimates.length === 0 ? (
					<div className="py-16 text-center text-gray-400">No estimates found.</div>
				) : (
					<div className="overflow-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
								<tr>
									<th className="px-4 py-2 text-left font-medium">Estimate</th>
									<th className="px-4 py-2 text-left font-medium">Date</th>
									<th className="px-4 py-2 text-left font-medium">Party</th>
									<th className="px-4 py-2 text-right font-medium">Total</th>
									<th className="px-4 py-2 text-left font-medium">Status</th>
									<th className="px-4 py-2 text-right font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{estimates.map((est) => (
									<tr key={est.id} className="border-t border-gray-100 hover:bg-gray-50">
										<td className="px-4 py-3 font-medium text-gray-800">{est.invoice_no}</td>
										<td className="px-4 py-3 text-gray-600">{String(est.invoice_date || '').slice(0, 10)}</td>
										<td className="px-4 py-3 text-gray-600">{est.party_name}</td>
										<td className="px-4 py-3 text-right font-medium text-gray-700">{Number(est.total_amount || 0).toFixed(2)}</td>
										<td className="px-4 py-3">
											<span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
												{String(est.status || '').replace('_', ' ')}
											</span>
										</td>
										<td className="px-4 py-3 text-right">
											{String(est.status) === 'draft' && (
												<button
													onClick={() => navigate(`/estimates/${est.id}/edit`)}
													className="mr-3 text-xs font-semibold text-blue-700 hover:text-blue-900"
												>
													Edit
												</button>
											)}
											<button
												onClick={() => handleDownloadPdf(est)}
												disabled={downloadingId === est.id}
												className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-60"
											>
												{downloadingId === est.id ? 'Downloading...' : 'PDF'}
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</DashboardLayout>
	);
}

export default EstimateList;
