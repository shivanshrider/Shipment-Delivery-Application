import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { TextField, Button, Typography, Box, Alert } from "@mui/material";
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import EmailIcon from '@mui/icons-material/Email';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signup(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="background.default" fontFamily="Poppins, Arial, sans-serif">
      <Box display="flex" width="100%" maxWidth="900px" boxShadow={8} borderRadius={6} overflow="hidden" sx={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>
        {/* Left Illustration */}
        <Box flex={1} display={{ xs: 'none', md: 'flex' }} alignItems="center" justifyContent="center" bgcolor="primary.main" p={6} minHeight="400px">
          <Box textAlign="center">
            <PersonAddAlt1Icon sx={{ fontSize: 90, color: '#fff', mb: 2 }} />
            <Typography variant="h4" color="#fff" fontWeight={700} mb={2} letterSpacing={-1}>
              Join Us
            </Typography>
            <Typography variant="h6" color="#fff" fontWeight={400}>
              Sign up to start shipping and tracking with ease.
            </Typography>
          </Box>
        </Box>
        {/* Right Form */}
        <Box flex={1.2} p={{ xs: 2, md: 6 }} display="flex" alignItems="center" justifyContent="center" width="100%">
          <Box sx={{ width: '100%', maxWidth: 400, p: { xs: 2, md: 4 }, borderRadius: 5, boxShadow: '0 8px 32px 0 rgba(108,99,255,0.10)', bgcolor: 'background.paper' }}>
            <Typography variant="h3" mb={3} align="center" fontWeight={700} color="primary.main" letterSpacing={-1}>
              Sign Up
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <form onSubmit={handleSubmit}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                margin="normal"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, color: 'primary.main' }} /> }}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                margin="normal"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                InputProps={{ startAdornment: <VpnKeyIcon sx={{ mr: 1, color: 'primary.main' }} /> }}
              />
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3, fontWeight: 700, fontSize: 20, py: 2, boxShadow: 4 }}>
                Sign Up
              </Button>
            </form>
            <Typography mt={2} align="center">
              Already have an account? <Link to="/login">Log In</Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
