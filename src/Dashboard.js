import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

function Dashboard() {
	const API_URL = process.env.REACT_APP_API_URL;
	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const token = localStorage.getItem('token');
		if (token) {
			try {
				const payload = JSON.parse(atob(token.split('.')[1]));
				setUser(payload);
			} catch {
				setUser(null);
			}
			fetch(`${API_URL}/api/dashboard/stats`, {
				headers: { Authorization: `Bearer ${token}` },
			})
				.then(res => res.json())
				.then(data => { setStats(data); setLoading(false); })
				.catch(() => setLoading(false));
		} else {
			setLoading(false);
		}
	}, []);

	if (!user) {
		return <div className="min-h-screen flex items-center justify-center text-xl text-gray-500">Not logged in</div>;
	}

	const fmt = (n) => `\u20B9${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

	const kpiCards = [
		{
			label: "Today's Sales",
			value: stats ? fmt(stats.todaySales) : '-',
			icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
			gradient: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', text: 'text-teal-700', nav: '/sales',
		},
		{
			label: 'Monthly Revenue',
			value: stats ? fmt(stats.monthRevenue) : '-',
			icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
			gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-700', nav: '/reports/profit-loss',
		},
		{
			label: 'Receivables',
			value: stats ? fmt(stats.totalReceivables) : '-',
			icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>,
			gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-50', text: 'text-orange-700', nav: '/parties',
		},
		{
			label: 'Payables',
			value: stats ? fmt(stats.totalPayables) : '-',
			icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>,
			gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50', text: 'text-red-700', nav: '/parties',
		},
		{
			label: 'Low Stock Items',
			value: stats ? (stats.lowStockItems || 0) : '-',
			icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
			gradient: 'from-amber-500 to-yellow-500', bg: 'bg-amber-50', text: 'text-amber-700', nav: '/items',
		},
		{
			label: 'Total Parties',
			value: stats ? (stats.totalParties || 0) : '-',
			icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
			gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-50', text: 'text-purple-700', nav: '/parties',
		},
	];

	const quickActions = [
		{ label: 'New Sale', icon: '\u{1F9FE}', to: '/sales', color: 'bg-teal-600 hover:bg-teal-700' },
		{ label: 'New Purchase', icon: '\u{1F6D2}', to: '/purchases', color: 'bg-indigo-600 hover:bg-indigo-700' },
		{ label: 'Add Item', icon: '\u{1F4E6}', to: '/items', color: 'bg-amber-600 hover:bg-amber-700' },
		{ label: 'Add Party', icon: '\u{1F464}', to: '/parties', color: 'bg-purple-600 hover:bg-purple-700' },
	];

	return (
		<DashboardLayout user={user}>
			{/* Page Header */}
			<div className="mb-6 flex items-center justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
					<p className="text-gray-500 text-sm mt-0.5">Welcome back, {user.username}! Here's your business at a glance.</p>
				</div>
				<span className="text-sm text-gray-400 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
					{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
				</span>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-32">
					<div className="flex flex-col items-center gap-3">
						<svg className="animate-spin w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
						</svg>
						<span className="text-gray-400 font-medium">Loading dashboard...</span>
					</div>
				</div>
			) : (
				<>
					{/* KPI Cards */}
					<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
						{kpiCards.map((card, i) => (
							<div
								key={i}
								onClick={() => navigate(card.nav)}
								className={`${card.bg} rounded-xl p-4 cursor-pointer hover:shadow-md transition-all group border border-white hover:border-gray-200`}
							>
								<div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}>
									{card.icon}
								</div>
								<p className="text-2xl font-bold text-gray-800 truncate">{card.value}</p>
								<p className={`text-xs font-medium mt-0.5 ${card.text}`}>{card.label}</p>
							</div>
						))}
					</div>

					{/* Quick Actions */}
					<div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
						<h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</h2>
						<div className="flex flex-wrap gap-3">
							{quickActions.map((action, i) => (
								<button
									key={i}
									onClick={() => navigate(action.to)}
									className={`${action.color} text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all`}
								>
									<span>{action.icon}</span>
									{action.label}
								</button>
							))}
						</div>
					</div>

					{/* Recent Transactions */}
					<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
						<div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
							<h2 className="font-semibold text-gray-800">Recent Transactions</h2>
							<button onClick={() => navigate('/sales')} className="text-green-600 text-sm font-medium hover:text-green-700 transition">View all &rarr;</button>
						</div>
						<div className="p-5">
							{stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
								<table className="w-full text-sm">
									<thead>
										<tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
											<th className="pb-2 text-left font-medium">Party</th>
											<th className="pb-2 text-left font-medium">Type</th>
											<th className="pb-2 pr-6 text-right font-medium">Amount</th>
											<th className="pb-2 text-right font-medium">Date</th>
											<th className="pb-2 text-right font-medium">Status</th>
										</tr>
									</thead>
									<tbody>
										{stats.recentTransactions.map((tx, i) => (
											<tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition">
												<td className="py-3 font-medium text-gray-800">{tx.party_name || '-'}</td>
												<td className="py-3">
														<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${tx.type === 'sale' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}`}>
														{tx.type === 'sale' ? 'Sale' : 'Purchase'}
													</span>
												</td>
												<td className="py-3 pr-6 text-right font-bold text-gray-800 whitespace-nowrap">{fmt(tx.amount)}</td>
												<td className="py-3 text-right text-gray-500 whitespace-nowrap">{tx.date ? new Date(tx.date).toLocaleDateString('en-IN') : '-'}</td>
												<td className="py-3 text-right">
														<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${tx.status === 'paid' ? 'bg-teal-100 text-teal-700' : 'bg-yellow-100 text-yellow-700'}`}>
														{tx.status || 'Pending'}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<div className="text-center py-12">
									<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
										<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
										</svg>
									</div>
									<p className="text-gray-500 font-medium">No transactions yet</p>
									<p className="text-gray-400 text-sm mt-1">Create your first sale or purchase to see it here.</p>
									<button
										onClick={() => navigate('/sales')}
										className="mt-4 bg-green-600 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-green-700 transition"
									>
										Create Sale Invoice
									</button>
								</div>
							)}
						</div>
					</div>
				</>
			)}
		</DashboardLayout>
	);
}

export default Dashboard;
