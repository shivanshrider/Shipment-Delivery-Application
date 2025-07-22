import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Navbar from "./components/Navbar";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateShipment from "./pages/CreateShipment";
import YourShipments from './pages/YourShipments';
import AdminPanel from './pages/AdminPanel';
import AgentPanel from './pages/AgentPanel';
import AddressBook from './pages/AddressBook';
import Footer from "./components/Footer";
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function PrivateAdminRoute({ children }) {
  const { currentUser, role } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (role !== 'admin') return <Navigate to="/" />;
  return children;
}

function PrivateAgentRoute({ children }) {
  const { currentUser, role } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (role !== 'agent') return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { currentUser } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Navigate to={currentUser ? "/dashboard" : "/login"} />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/create-shipment" element={<PrivateRoute><CreateShipment /></PrivateRoute>} />
      <Route path="/your-shipments" element={<PrivateRoute><YourShipments /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateAdminRoute><AdminPanel /></PrivateAdminRoute>} />
      <Route path="/agent" element={<PrivateAgentRoute><AgentPanel /></PrivateAgentRoute>} />
      <Route path="/address-book" element={<PrivateRoute><AddressBook /></PrivateRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <Navbar />
            <AppRoutes />
            <Footer />
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
} 