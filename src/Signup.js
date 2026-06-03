import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Signup() {
	const API_URL = process.env.REACT_APP_API_URL;
	const navigate = useNavigate();
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const res = await fetch(`${API_URL}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, email, password, role_id: 2 }),
			});
			const data = await res.json();
			if (res.ok && data.success) {
				navigate('/');
			} else {
				setError(data.error || 'Signup failed');
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
						Start managing your business smarter
					</h2>
					<p className="text-green-100 text-lg">
						Create your free account and get started with GST billing and inventory in minutes.
					</p>
				</div>
				<p className="text-green-200 text-sm">© 2026 Flowventory. GST Billing &amp; Inventory Software.</p>
			</div>

			{/* Right panel */}
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="w-full max-w-md">
					{/* Mobile logo */}
					<div className="flex lg:hidden items-center gap-2 mb-8">
						<div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden">
							<img src="/logo.png" alt="Flowventory" className="w-full h-full object-contain scale-150" />
						</div>
						<span className="font-bold text-xl text-gray-800">Flowventory</span>
					</div>

					<h1 className="text-3xl font-extrabold text-gray-800 mb-1">Create account</h1>
					<p className="text-gray-500 mb-8">Get started with Flowventory for free</p>

					{error && (
						<div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-medium rounded-xl px-4 py-3">
							<svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-5">
						<div>
							<label className="block mb-1.5 text-sm font-semibold text-gray-700">Username</label>
							<input
								className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition placeholder-gray-400"
								value={username}
								onChange={e => setUsername(e.target.value)}
								required
								placeholder="Choose a username"
								autoComplete="username"
							/>
						</div>
						<div>
							<label className="block mb-1.5 text-sm font-semibold text-gray-700">Email</label>
							<input
								type="email"
								className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition placeholder-gray-400"
								value={email}
								onChange={e => setEmail(e.target.value)}
								required
								placeholder="your@email.com"
								autoComplete="email"
							/>
						</div>
						<div>
							<label className="block mb-1.5 text-sm font-semibold text-gray-700">Password</label>
							<input
								type="password"
								className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition placeholder-gray-400"
								value={password}
								onChange={e => setPassword(e.target.value)}
								required
								placeholder="Create a password"
								autoComplete="new-password"
							/>
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
									Creating account...
								</span>
							) : 'Create Account'}
						</button>
					</form>

					<div className="flex items-center my-6">
						<div className="flex-1 h-px bg-gray-200"></div>
						<span className="px-3 text-xs text-gray-400 uppercase tracking-wider">or</span>
						<div className="flex-1 h-px bg-gray-200"></div>
					</div>

					<p className="text-center text-sm text-gray-500">
						Already have an account?{' '}
						<Link to="/" className="text-green-600 font-semibold hover:text-green-800 transition">Sign in</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

export default Signup;