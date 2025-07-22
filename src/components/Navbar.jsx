import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from '@mui/material/Avatar';
import logo from '../assets/logo.png';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const role = currentUser?.role;

  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', color: 'text.primary', boxShadow: '0 2px 8px 0 rgba(60,72,100,0.06)', borderBottom: theme => `1.5px solid ${theme.palette.divider}` }}>
      <Toolbar sx={{ minHeight: 64 }}>
        <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, textDecoration: 'none' }}>
          <img src={logo} alt="Celebal Shipment Logo" style={{ height: 40, marginRight: 14, verticalAlign: 'middle' }} />
        </Box>
        {currentUser ? (
          <Box display="flex" alignItems="center" gap={2}>
            {location.pathname === "/create-shipment" && (
              <Button color="inherit" component={Link} to="/your-shipments">Your Shipments</Button>
            )}
            {location.pathname === "/your-shipments" && (
            <Button color="inherit" component={Link} to="/create-shipment">Create Shipment</Button>
            )}
            {role === 'admin' && (
              <Button color="inherit" component={Link} to="/admin">Admin Panel</Button>
            )}
            {role === 'agent' && location.pathname !== '/agent' && (
              <Button color="inherit" component={Link} to="/agent">Agent Panel</Button>
            )}
            {location.pathname !== '/address-book' && (
              <Button color="inherit" component={Link} to="/address-book">Address Book</Button>
            )}
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, ml: 1 }}>{userName[0]?.toUpperCase()}</Avatar>
            <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 600 }}>{userName}</Typography>
            <Button color="inherit" onClick={handleLogout}>Logout</Button>
          </Box>
        ) : (
          <Box>
            <Button color="inherit" component={Link} to="/login">Login</Button>
            <Button color="inherit" component={Link} to="/signup">Sign Up</Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
