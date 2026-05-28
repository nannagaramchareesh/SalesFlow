import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DataEntry from './pages/DataEntry';
import CollectionEntry from './pages/CollectionEntry';
import ReturnsEntry from './pages/ReturnsEntry';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="data-entry" element={<DataEntry />} />
          <Route path="collections" element={<CollectionEntry />} />
          <Route path="returns" element={<ReturnsEntry />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
