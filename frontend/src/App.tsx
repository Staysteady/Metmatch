import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import telemetry from './services/telemetry';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TradingDashboard from './pages/TradingDashboard';
import RFQList from './pages/RFQList';
import CreateRFQ from './pages/CreateRFQ';
import RFQDetail from './pages/RFQDetail';
import Orders from './pages/Orders';
import CreateOrder from './pages/CreateOrder';
import OrderDetail from './pages/OrderDetail';
import MarketBroadcast from './pages/MarketBroadcast';
import Profile from './pages/Profile';
import ExtendedProfile from './pages/ExtendedProfile';
import NetworkVisualization from './pages/NetworkVisualization';
import CounterpartyDiscovery from './pages/CounterpartyDiscovery';
import AdminDashboard from './pages/admin/AdminDashboard';
import TelemetryDashboard from './pages/admin/TelemetryDashboard';

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  
  useEffect(() => {
    // Set user ID for telemetry
    telemetry.setUserId(user?.id);
  }, [user]);

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
      
      <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/trading" element={<TradingDashboard />} />
        <Route path="/rfqs" element={<RFQList />} />
        <Route path="/rfqs/create" element={<CreateRFQ />} />
        <Route path="/rfqs/:id" element={<RFQDetail />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/create" element={<CreateOrder />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/market" element={<MarketBroadcast />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<ExtendedProfile />} />
        <Route path="/extended-profile" element={<ExtendedProfile />} />
        <Route path="/network" element={<NetworkVisualization />} />
        <Route path="/discover" element={<CounterpartyDiscovery />} />
        <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" />} />
        <Route path="/admin/telemetry" element={isAdmin ? <TelemetryDashboard /> : <Navigate to="/dashboard" />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Route>
    </Routes>
  );
}

export default App;