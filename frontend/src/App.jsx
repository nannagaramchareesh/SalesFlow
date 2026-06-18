import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
