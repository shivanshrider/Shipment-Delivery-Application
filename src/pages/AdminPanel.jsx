import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Container, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, Button, Box, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const { currentUser, role } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/');
      return;
    }
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        setError("Failed to fetch users.");
      }
      setLoading(false);
    };
    fetchUsers();
  }, [role, navigate]);

  const handleRoleChange = async (userId, newRole) => {
    setError("");
    setSuccess("");
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      setUsers(users => users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setSuccess("Role updated successfully.");
    } catch (err) {
      setError("Failed to update role.");
    }
  };

  if (role !== 'admin') return null;

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Paper elevation={2} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h4" mb={3} align="center">Admin Panel - User Management</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {loading ? (
          <Typography align="center">Loading users...</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Change Role</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        size="small"
                      >
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="agent">Agent</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
} 