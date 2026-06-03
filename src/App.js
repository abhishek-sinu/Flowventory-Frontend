import './App.css';
import Login from './Login';
import Signup from './Signup';
import Dashboard from './Dashboard';
import DashboardLayout from './DashboardLayout';
import Items from './Items';
import PartyList from './PartyList';
import SalesList from './SalesList';
import CreateInvoice from './CreateInvoice';
import EstimateList from './EstimateList';
import CreateEstimate from './CreateEstimate';
import DeliveryChallanList from './DeliveryChallanList';
import CreateDeliveryChallan from './CreateDeliveryChallan';
import CreditNoteList from './CreditNoteList';
import CreateCreditNote from './CreateCreditNote';
import PurchaseList from './PurchaseList';
import CreatePurchase from './CreatePurchase';
import PaymentInList from './PaymentInList';
import CreatePaymentIn from './CreatePaymentIn';
import PaymentOutList from './PaymentOutList';
import CreatePaymentOut from './CreatePaymentOut';
import DebitNoteList from './DebitNoteList';
import CreateDebitNote from './CreateDebitNote';
import ProfitLossReport from './ProfitLossReport';
import StockSummaryReport from './StockSummaryReport';
import DayBookReport from './DayBookReport';
import GstReport from './GstReport';
import PartyLedgerReport from './PartyLedgerReport';
import Settings from './Settings';
import Help from './Help';

import { BrowserRouter, Routes, Route } from 'react-router-dom';

function ComingSoon({ title }) {
	return (
		<DashboardLayout>
			<div className="flex flex-col items-center justify-center py-32 text-center">
				<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
					<svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
				<p className="text-gray-500 max-w-sm">This module is coming soon. It will be built in the next phase.</p>
			</div>
		</DashboardLayout>
	);
}

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Login />} />
				<Route path="/signup" element={<Signup />} />
				<Route path="/dashboard" element={<Dashboard />} />
				{/* Sales */}
				<Route path="/sales" element={<SalesList />} />
				<Route path="/sales/create" element={<CreateInvoice />} />
				<Route path="/sales/:id/edit" element={<CreateInvoice />} />
				<Route path="/estimates" element={<EstimateList />} />
				<Route path="/estimates/create" element={<CreateEstimate />} />
				<Route path="/estimates/:id/edit" element={<CreateEstimate />} />
				<Route path="/delivery-challans" element={<DeliveryChallanList />} />
				<Route path="/delivery-challans/create" element={<CreateDeliveryChallan />} />
				<Route path="/delivery-challans/:id/edit" element={<CreateDeliveryChallan />} />
				<Route path="/payment-in" element={<PaymentInList />} />
				<Route path="/payment-in/create" element={<CreatePaymentIn />} />
				<Route path="/credit-notes" element={<CreditNoteList />} />
				<Route path="/credit-notes/create" element={<CreateCreditNote />} />
				<Route path="/credit-notes/:id/edit" element={<CreateCreditNote />} />
				{/* Purchase */}
				<Route path="/purchases" element={<PurchaseList />} />
				<Route path="/purchases/create" element={<CreatePurchase />} />
				<Route path="/purchases/:id/edit" element={<CreatePurchase />} />
				<Route path="/payment-out" element={<PaymentOutList />} />
				<Route path="/payment-out/create" element={<CreatePaymentOut />} />
				<Route path="/debit-notes" element={<DebitNoteList />} />
				<Route path="/debit-notes/create" element={<CreateDebitNote />} />
				<Route path="/debit-notes/:id/edit" element={<CreateDebitNote />} />
				{/* Inventory */}
				<Route path="/items" element={<Items />} />
				{/* Parties */}
				<Route path="/parties" element={<PartyList />} />
				{/* Reports */}
				<Route path="/reports/profit-loss" element={<ProfitLossReport />} />
				<Route path="/reports/stock" element={<StockSummaryReport />} />
				<Route path="/reports/day-book" element={<DayBookReport />} />
				<Route path="/reports/gst" element={<GstReport />} />
				<Route path="/reports/party-ledger" element={<PartyLedgerReport />} />
				{/* Settings */}
				<Route path="/settings" element={<Settings />} />
				<Route path="/help" element={<Help />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;