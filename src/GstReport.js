import React, { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';

function GstReport() {
    const API_URL = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [summary, setSummary] = useState(null);
    const [rows, setRows] = useState([]);

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
            return 'Report API route not found (404). Please restart backend server.';
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

    const fetchReport = async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (fromDate) params.set('from_date', fromDate);
            if (toDate) params.set('to_date', toDate);

            const res = await fetch(`${API_URL}/api/report/gst-summary?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;
            if (!res.ok) {
                const msg = data?.error ? `${data.error} (HTTP ${res.status})` : await buildHttpErrorMessage(res, 'Failed to fetch GST summary report');
                throw new Error(msg);
            }

            setSummary(data?.summary || null);
            setRows(Array.isArray(data?.month_wise) ? data.month_wise : []);
        } catch (err) {
            setError(err.message || 'Unable to load GST report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchReport();
    }, [token]);

    const formatAmount = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const netPayable = Number(summary?.gstr3b?.net_gst_payable || 0);

    const hasData = Boolean(summary) || rows.length > 0;
    const period = `${fromDate || 'Beginning'} to ${toDate || 'Today'}`;
    const num = (v) => Number(v || 0).toFixed(2);

    const triggerDownload = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Structured report data shared by all export formats
    const buildReportSections = () => ([
        {
            title: 'GSTR-1 (Outward Supplies)',
            rows: [
                ['Net Taxable Value', num(summary?.gstr1?.net_outward?.taxable)],
                ['CGST', num(summary?.gstr1?.net_outward?.cgst)],
                ['SGST', num(summary?.gstr1?.net_outward?.sgst)],
                ['IGST', num(summary?.gstr1?.net_outward?.igst)],
                ['Total Outward Tax', num(summary?.gstr1?.net_outward?.total_tax)],
            ],
        },
        {
            title: 'GSTR-3B (Input Tax Credit vs Liability)',
            rows: [
                ['Input CGST', num(summary?.gstr3b?.input_tax_credit?.cgst)],
                ['Input SGST', num(summary?.gstr3b?.input_tax_credit?.sgst)],
                ['Input IGST', num(summary?.gstr3b?.input_tax_credit?.igst)],
                ['Total ITC', num(summary?.gstr3b?.input_tax_credit?.total_tax)],
                ['Outward Tax Liability', num(summary?.gstr3b?.outward_tax_liability?.total_tax)],
                ['Net GST Payable', num(summary?.gstr3b?.net_gst_payable)],
            ],
        },
    ]);

    const monthHeaders = ['Month', 'Outward Taxable', 'Outward Tax', 'Input Taxable', 'Input Tax', 'Net Payable'];
    const monthRows = () => rows.map((row) => [
        row.month,
        num(row.outward_taxable),
        num(row.outward_total_tax),
        num(row.inward_taxable),
        num(row.inward_total_tax),
        num(row.net_gst_payable),
    ]);

    const handleExportCsv = () => {
        if (!hasData) return;
        const csvCell = (v) => {
            const s = String(v ?? '');
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = [];
        lines.push(['Flowventory GST Report']);
        lines.push(['Period', period]);
        lines.push([]);
        buildReportSections().forEach((section) => {
            lines.push([section.title]);
            section.rows.forEach((r) => lines.push(r));
            lines.push([]);
        });
        lines.push(['Month-wise GST Movement']);
        lines.push(monthHeaders);
        monthRows().forEach((r) => lines.push(r));

        const csv = '\uFEFF' + lines.map((cols) => cols.map(csvCell).join(',')).join('\r\n');
        triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `GST_Report_${fromDate || 'all'}_${toDate || 'all'}.csv`);
    };

    const buildReportHtml = () => {
        const esc = (v) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
        const sectionHtml = buildReportSections().map((section) => `
            <h3>${esc(section.title)}</h3>
            <table>
                ${section.rows.map((r) => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td></tr>`).join('')}
            </table>
        `).join('');
        const monthHtml = `
            <h3>Month-wise GST Movement</h3>
            <table>
                <tr>${monthHeaders.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>
                ${monthRows().map((r) => `<tr>${r.map((c, i) => `<td class="${i === 0 ? '' : 'num'}">${esc(c)}</td>`).join('')}</tr>`).join('')}
            </table>
        `;
        return `
            <h1>Flowventory GST Report</h1>
            <p><strong>Period:</strong> ${esc(period)}</p>
            ${sectionHtml}
            ${monthHtml}
        `;
    };

    const handleExportXls = () => {
        if (!hasData) return;
        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="utf-8" />
            <style>
                h1 { font-size: 16px; } h3 { font-size: 13px; margin: 12px 0 4px; }
                table { border-collapse: collapse; }
                td, th { border: 1px solid #999; padding: 4px 8px; font-size: 12px; }
                th { background: #eef2ff; text-align: left; }
                .num { text-align: right; mso-number-format: "0.00"; }
            </style></head>
            <body>${buildReportHtml()}</body></html>`;
        triggerDownload(new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), `GST_Report_${fromDate || 'all'}_${toDate || 'all'}.xls`);
    };

    const handleExportPdf = () => {
        if (!hasData) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`<html><head><title>GST Report</title>
            <style>
                body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; padding: 24px; }
                h1 { font-size: 20px; margin: 0 0 4px; }
                h3 { font-size: 14px; margin: 18px 0 6px; color: #3730a3; }
                p { font-size: 13px; color: #555; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
                td, th { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 12px; }
                th { background: #eef2ff; text-align: left; color: #3730a3; }
                .num { text-align: right; }
            </style></head>
            <body>${buildReportHtml()}</body></html>`);
        win.document.close();
        win.focus();
        win.onload = () => { win.print(); };
        setTimeout(() => { try { win.print(); } catch (_) {} }, 400);
    };

    return (
        <DashboardLayout user={user}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">GST Reports</h1>
                    <p className="text-sm text-gray-500 mt-0.5">GSTR-1 outward summary and GSTR-3B tax liability snapshot.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleExportPdf}
                        disabled={loading || !hasData}
                        className="inline-flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PDF
                    </button>
                    <button
                        onClick={handleExportXls}
                        disabled={loading || !hasData}
                        className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        XLS
                    </button>
                    <button
                        onClick={handleExportCsv}
                        disabled={loading || !hasData}
                        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        CSV
                    </button>
                </div>
            </div>

            <div className="bg-gradient-to-br from-white via-indigo-50/50 to-white rounded-xl border border-indigo-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">From Date</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">To Date</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                </div>
                <button
                    onClick={fetchReport}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-black transition"
                >
                    Apply Filters
                </button>
                <button
                    onClick={() => {
                        setFromDate('');
                        setToDate('');
                        setTimeout(fetchReport, 0);
                    }}
                    className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition"
                >
                    Reset
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
            )}

            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">Loading report...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                        <div className="bg-slate-50 border border-slate-200 border-t-4 border-t-slate-400 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Outward Taxable</div>
                            <div className="text-xl font-bold text-slate-700 mt-1">{formatAmount(summary?.gstr1?.net_outward?.taxable)}</div>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 border-t-4 border-t-rose-500 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-rose-700/80 uppercase tracking-wider font-semibold">Outward GST Liability</div>
                            <div className="text-xl font-bold text-rose-700 mt-1">{formatAmount(summary?.gstr3b?.outward_tax_liability?.total_tax)}</div>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 border-t-4 border-t-indigo-500 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-indigo-700/80 uppercase tracking-wider font-semibold">Input Tax Credit</div>
                            <div className="text-xl font-bold text-indigo-700 mt-1">{formatAmount(summary?.gstr3b?.input_tax_credit?.total_tax)}</div>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 border-t-4 border-t-amber-500 rounded-xl p-4 shadow-sm">
                            <div className="text-xs text-amber-700/80 uppercase tracking-wider font-semibold">Net GST Payable</div>
                            <div className={`text-xl font-bold mt-1 ${netPayable >= 0 ? 'text-amber-700' : 'text-teal-700'}`}>
                                {formatAmount(netPayable)}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h2 className="text-sm font-semibold text-gray-700 mb-3">GSTR-1 (Outward)</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between"><span className="text-gray-500">Net Taxable Value</span><span className="font-semibold text-gray-800">{formatAmount(summary?.gstr1?.net_outward?.taxable)}</span></div>
                                <div className="flex items-center justify-between"><span className="text-gray-500">CGST</span><span className="font-semibold text-gray-800">{formatAmount(summary?.gstr1?.net_outward?.cgst)}</span></div>
                                <div className="flex items-center justify-between"><span className="text-gray-500">SGST</span><span className="font-semibold text-gray-800">{formatAmount(summary?.gstr1?.net_outward?.sgst)}</span></div>
                                <div className="flex items-center justify-between"><span className="text-gray-500">IGST</span><span className="font-semibold text-gray-800">{formatAmount(summary?.gstr1?.net_outward?.igst)}</span></div>
                                <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between"><span className="text-gray-600">Total Outward Tax</span><span className="font-bold text-rose-700">{formatAmount(summary?.gstr1?.net_outward?.total_tax)}</span></div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h2 className="text-sm font-semibold text-gray-700 mb-3">GSTR-3B (Input vs Liability)</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between"><span className="text-gray-500">Input CGST</span><span className="font-semibold text-gray-800">{formatAmount(summary?.gstr3b?.input_tax_credit?.cgst)}</span></div>
                                <div className="flex items-center justify-between"><span className="text-gray-500">Input SGST</span><span className="font-semibold text-gray-800">{formatAmount(summary?.gstr3b?.input_tax_credit?.sgst)}</span></div>
                                <div className="flex items-center justify-between"><span className="text-gray-500">Input IGST</span><span className="font-semibold text-gray-800">{formatAmount(summary?.gstr3b?.input_tax_credit?.igst)}</span></div>
                                <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between"><span className="text-gray-600">Total ITC</span><span className="font-bold text-blue-700">{formatAmount(summary?.gstr3b?.input_tax_credit?.total_tax)}</span></div>
                                <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between"><span className="text-gray-600">Net GST Payable</span><span className={`font-bold ${netPayable >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatAmount(summary?.gstr3b?.net_gst_payable)}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700">Month-wise GST Movement</h2>
                            <span className="text-xs text-gray-400">{rows.length} months</span>
                        </div>
                        {rows.length === 0 ? (
                            <div className="py-12 text-center text-gray-400">No records in selected range.</div>
                        ) : (
                            <div className="overflow-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium">Month</th>
                                            <th className="px-4 py-2 text-right font-medium">Outward Taxable</th>
                                            <th className="px-4 py-2 text-right font-medium">Outward Tax</th>
                                            <th className="px-4 py-2 text-right font-medium">Input Taxable</th>
                                            <th className="px-4 py-2 text-right font-medium">Input Tax</th>
                                            <th className="px-4 py-2 text-right font-medium">Net Payable</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => (
                                            <tr key={row.month} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-700">{row.month}</td>
                                                <td className="px-4 py-3 text-right text-gray-700 font-semibold">{formatAmount(row.outward_taxable)}</td>
                                                <td className="px-4 py-3 text-right text-rose-700 font-semibold">{formatAmount(row.outward_total_tax)}</td>
                                                <td className="px-4 py-3 text-right text-gray-700 font-semibold">{formatAmount(row.inward_taxable)}</td>
                                                <td className="px-4 py-3 text-right text-blue-700 font-semibold">{formatAmount(row.inward_total_tax)}</td>
                                                <td className={`px-4 py-3 text-right font-semibold ${Number(row.net_gst_payable || 0) >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                    {formatAmount(row.net_gst_payable)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </DashboardLayout>
    );
}

export default GstReport;
