import React from "react";
import { useAuth } from "../context/AuthContext";
import { Container, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function AgentPanel() {
  const { role } = useAuth();
  const navigate = useNavigate();

  if (role !== 'agent') {
    navigate('/');
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Paper elevation={2} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h4" mb={3} align="center">Agent Panel</Typography>
        <Typography align="center" color="text.secondary">
          Welcome, Delivery Agent!<br />
          (Assigned shipments and status update features coming soon.)
        </Typography>
      </Paper>
    </Container>
  );
} 