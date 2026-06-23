import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DataEntry from './pages/DataEntry';
import CollectionEntry from './pages/CollectionEntry';
import ReturnsEntry from './pages/ReturnsEntry';
import InvoiceImage from './pages/InvoiceImage';
import DealersMaster from './pages/DealersMaster';
import Reports from './pages/Reports';
import AlertsSettings from './pages/AlertsSettings';
import Catalogues from './pages/Catalogues';
import PriceLists from './pages/PriceLists';
import CreditDebitNotes from './pages/CreditDebitNotes';
import Schemes from './pages/Schemes';
import Stock from './pages/Stock';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="data-entry" element={<DataEntry />} />
          <Route path="collections" element={<CollectionEntry />} />
          <Route path="returns" element={<ReturnsEntry />} />
          <Route path="invoice-image" element={<InvoiceImage />} />
          <Route path="dealers" element={<DealersMaster />} />
          <Route path="reports" element={<Reports />} />
          <Route path="alerts" element={<AlertsSettings />} />
          <Route path="catalogues" element={<Catalogues />} />
          <Route path="price-lists" element={<PriceLists />} />
          <Route path="credit-debit-notes" element={<CreditDebitNotes />} />
          <Route path="schemes" element={<Schemes />} />
          <Route path="stock" element={<Stock />} />
        </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
// Trigger hot reload update
