import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';

function isAuthenticated() {
  return !!localStorage.getItem('token');
}

function ReportList() {
  const API_URL = process.env.REACT_APP_API_URL;
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [scheme, setScheme] = useState('');
  const [reportMode, setReportMode] = useState('individual');

  useEffect(() => {
    if (!isAuthenticated()) {
      setError('You must be logged in to view reports.');
      setLoading(false);
      return;
    }
    fetchDonations();
  }, []);

  const fetchDonations = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/donations`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setDonations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch report data');
        setLoading(false);
      });
  };

  const filtered = donations.filter(d => {
    const raw = d.transaction_date || d.donation_date || d.created_at;
    if (!raw) return true;
    const rowDate = new Date(raw);
    if (isNaN(rowDate)) return true;
    rowDate.setHours(0, 0, 0, 0);
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (rowDate < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (rowDate > to) return false;
    }
    const amt = parseFloat(d.amount) || 0;
    if (amountMin !== '' && amt < parseFloat(amountMin)) return false;
    if (amountMax !== '' && amt > parseFloat(amountMax)) return false;
    if (scheme && d.scheme_name && !d.scheme_name.toLowerCase().includes(scheme.toLowerCase())) return false;
    return true;
  });

  const aggregated = Object.values(
    filtered.reduce((acc, d) => {
      const donorPhone = d.donor_phone || d.phone_number || '';
      const donorName = d.donor_name || '-';
      const key = donorPhone || `NO_PHONE_${donorName}`;
      const amount = parseFloat(d.amount) || 0;
      const dateValue = d.donation_date || d.transaction_date || d.created_at || null;

      if (!acc[key]) {
        acc[key] = {
          id: key,
          donor_name: donorName,
          donor_phone: donorPhone || '-',
          cultivator_name: d.cultivator_name || '-',
          amount: 0,
          donation_count: 0,
          scheme_names: new Set(),
          first_date: dateValue,
          last_date: dateValue
        };
      }

      acc[key].amount += amount;
      acc[key].donation_count += 1;
      if (d.scheme_name) acc[key].scheme_names.add(d.scheme_name);
      if (dateValue) {
        if (!acc[key].first_date || new Date(dateValue) < new Date(acc[key].first_date)) {
          acc[key].first_date = dateValue;
        }
        if (!acc[key].last_date || new Date(dateValue) > new Date(acc[key].last_date)) {
          acc[key].last_date = dateValue;
        }
      }
      if ((!acc[key].cultivator_name || acc[key].cultivator_name === '-') && d.cultivator_name) {
        acc[key].cultivator_name = d.cultivator_name;
      }

      return acc;
    }, {})
  ).map(item => ({
    ...item,
    scheme_names: Array.from(item.scheme_names).join(', ')
  }));

  const visibleRows = reportMode === 'aggregate' ? aggregated : filtered;
  const totalAmount = visibleRows.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const handleExport = (type) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (amountMin !== '') params.set('amountMin', amountMin);
    if (amountMax !== '') params.set('amountMax', amountMax);
    if (scheme) params.set('scheme', scheme);
    params.set('mode', reportMode);

    fetch(`${API_URL}/api/report/donations/${type}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `donations.${type === 'xls' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => setError(`Failed to export as ${type.toUpperCase()}`));
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-blue-800">Reports</h1>

        {error && <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{error}</div>}

        {/* Filters & Export */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Mode</label>
            <select
              value={reportMode}
              onChange={e => setReportMode(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="individual">Individual Donations</option>
              <option value="aggregate">Aggregate by Phone</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Min Amount</label>
            <input
              type="number"
              value={amountMin}
              onChange={e => setAmountMin(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-28"
              placeholder="₹ Min"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Max Amount</label>
            <input
              type="number"
              value={amountMax}
              onChange={e => setAmountMax(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-28"
              placeholder="₹ Max"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Scheme</label>
            <input
              type="text"
              value={scheme}
              onChange={e => setScheme(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-32"
              placeholder="Scheme name"
            />
          </div>
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setAmountMin(''); setAmountMax(''); setScheme(''); }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-semibold"
          >Clear Filters</button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => handleExport('xls')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold text-sm"
            >Export Excel</button>
            <button
              onClick={() => handleExport('pdf')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold text-sm"
            >Export PDF</button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-sm text-gray-500 font-semibold">
              {reportMode === 'aggregate' ? 'Total Phones' : 'Total Donations'}
            </div>
            <div className="text-2xl font-bold text-blue-700">{visibleRows.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-sm text-gray-500 font-semibold">Total Amount</div>
            <div className="text-2xl font-bold text-green-700">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-sm text-gray-500 font-semibold">
              {reportMode === 'aggregate' ? 'Average Per Phone' : 'Average Donation'}
            </div>
            <div className="text-2xl font-bold text-purple-700">
              ₹{visibleRows.length ? (totalAmount / visibleRows.length).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
            </div>
          </div>
        </div>

        {/* Donations Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : visibleRows.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No donations found for the selected filters.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-50 text-blue-800">
                  {reportMode === 'aggregate' ? (
                    <>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Donor</th>
                      <th className="px-4 py-3 text-left">Phone Number</th>
                      <th className="px-4 py-3 text-left">Total Amount</th>
                      <th className="px-4 py-3 text-left">Donations</th>
                      <th className="px-4 py-3 text-left">First Date</th>
                      <th className="px-4 py-3 text-left">Last Date</th>
                      <th className="px-4 py-3 text-left">Cultivator</th>
                      <th className="px-4 py-3 text-left">Schemes</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Donor</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Phone Number</th>
                      <th className="px-4 py-3 text-left">Cultivator</th>
                      <th className="px-4 py-3 text-left">Scheme</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((d, i) => (
                  reportMode === 'aggregate' ? (
                    <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2">{i + 1}</td>
                      <td className="px-4 py-2">{d.donor_name || '-'}</td>
                      <td className="px-4 py-2">{d.donor_phone || '-'}</td>
                      <td className="px-4 py-2 font-semibold text-green-700">₹{parseFloat(d.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2">{d.donation_count || 0}</td>
                      <td className="px-4 py-2">{d.first_date ? new Date(d.first_date).toLocaleDateString('en-IN') : '-'}</td>
                      <td className="px-4 py-2">{d.last_date ? new Date(d.last_date).toLocaleDateString('en-IN') : '-'}</td>
                      <td className="px-4 py-2">{d.cultivator_name || '-'}</td>
                      <td className="px-4 py-2">{d.scheme_names || '-'}</td>
                    </tr>
                  ) : (
                    <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2">{i + 1}</td>
                      <td className="px-4 py-2">{d.donor_name || '-'}</td>
                      <td className="px-4 py-2 font-semibold text-green-700">₹{parseFloat(d.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2">{d.donation_date || d.transaction_date || d.created_at ? new Date(d.donation_date || d.transaction_date || d.created_at).toLocaleDateString('en-IN') : '-'}</td>
                      <td className="px-4 py-2">{d.donor_phone || '-'}</td>
                      <td className="px-4 py-2">{d.cultivator_name || '-'}</td>
                      <td className="px-4 py-2">{d.scheme_name || '-'}</td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ReportList;