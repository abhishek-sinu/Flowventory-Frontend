import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const API_URL = process.env.REACT_APP_API_URL;

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const res = await fetch(`${API_URL}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			});
			const data = await res.json();
			if (res.ok && data.success) {
				localStorage.setItem('token', data.token);
				navigate('/dashboard');
			} else {
				setError(data.error || 'Login failed');
			}
		} catch (err) {
			setError('Server error: ' + err);
		}
		setLoading(false);
	};

	return (
		<div className="min-h-screen flex" style={{ background: 'linear-gradient(180deg, #eef2ff 0%, #f8fafc 45%, #ffffff 100%)' }}>
			{/* Left panel */}
			<div className="hidden lg:flex flex-col justify-between w-[45%] p-12" style={{ background: 'linear-gradient(130deg, #312e81 0%, #4f46e5 58%, #0d9488 100%)' }}>
				<div className="flex items-center gap-3">
					<div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-0.5 shadow-sm overflow-hidden">
						<img src="/logo.png" alt="Flowventory" className="w-full h-full object-contain scale-150" />
					</div>
					<span className="text-white font-bold text-xl">Flowventory</span>
				</div>

				<div>
					<h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
						Manage your business with confidence
					</h2>
					<p className="text-green-100 text-lg leading-relaxed">
						GST billing, inventory tracking, party management and smart reports — all in one place.
					</p>
					<div className="mt-8 grid grid-cols-2 gap-4">
						{[['🧾','GST Invoicing'],['📦','Inventory'],['👥','Parties'],['📊','Reports']].map(([icon, label]) => (
							<div key={label} className="bg-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
								<span className="text-2xl">{icon}</span>
								<span className="text-white font-medium">{label}</span>
							</div>
						))}
					</div>
				</div>

				<p className="text-green-200 text-sm">© 2026 Flowventory. GST Billing &amp; Inventory Software.</p>
			</div>

			{/* Right panel — login form */}
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="w-full max-w-md">
					{/* Mobile logo */}
					<div className="flex lg:hidden items-center gap-2 mb-8">
						<div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden">
							<img src="/logo.png" alt="Flowventory" className="w-full h-full object-contain scale-150" />
						</div>
						<span className="font-bold text-xl text-gray-800">Flowventory</span>
					</div>

					<h1 className="text-3xl font-extrabold text-gray-800 mb-1">Welcome back</h1>
					<p className="text-gray-500 mb-8">Sign in to your Flowventory account</p>

					{error && (
						<div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-medium rounded-xl px-4 py-3">
							<svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-5">
						<div>
							<label className="block mb-1.5 text-sm font-semibold text-gray-700">Username</label>
							<div className="relative">
								<span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
								</span>
								<input
									className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-700 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition placeholder-gray-400"
									value={username}
									onChange={e => setUsername(e.target.value)}
									required
									placeholder="Enter your username"
									autoComplete="username"
								/>
							</div>
						</div>

						<div>
							<label className="block mb-1.5 text-sm font-semibold text-gray-700">Password</label>
							<div className="relative">
								<span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
								</span>
								<input
									type="password"
									className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-700 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition placeholder-gray-400"
									value={password}
									onChange={e => setPassword(e.target.value)}
									required
									placeholder="Enter your password"
									autoComplete="current-password"
								/>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full text-white py-3 rounded-xl font-bold text-base shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
							style={{ background: loading ? '#a5b4fc' : 'linear-gradient(120deg, #4f46e5 0%, #4338ca 55%, #0d9488 100%)' }}
						>
							{loading ? (
								<span className="flex items-center justify-center gap-2">
									<svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
									Signing in...
								</span>
							) : 'Sign In'}
						</button>
					</form>

					<div className="flex items-center my-6">
						<div className="flex-1 h-px bg-gray-200"></div>
						<span className="px-3 text-xs text-gray-400 uppercase tracking-wider">or</span>
						<div className="flex-1 h-px bg-gray-200"></div>
					</div>

					<p className="text-center text-sm text-gray-500">
						Don't have an account?{' '}
						<Link to="/signup" className="text-green-600 font-semibold hover:text-green-800 transition">Create account</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

export default Login;

