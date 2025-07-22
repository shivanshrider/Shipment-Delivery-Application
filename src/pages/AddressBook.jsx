import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Container, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function AddressBook() {
  const { currentUser } = useAuth();
  const [receivers, setReceivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", address: "" });

  useEffect(() => {
    if (!currentUser) return;
    const fetchReceivers = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "users", currentUser.uid, "addressBook"));
        setReceivers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        setError("Failed to fetch address book.");
      }
      setLoading(false);
    };
    fetchReceivers();
  }, [currentUser]);

  const handleOpen = (receiver = null) => {
    setEditId(receiver ? receiver.id : null);
    setForm(receiver ? { name: receiver.name, email: receiver.email, address: receiver.address } : { name: "", email: "", address: "" });
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setEditId(null);
    setForm({ name: "", email: "", address: "" });
    setError("");
    setSuccess("");
  };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!form.name || !form.email || !form.address) {
      setError("All fields are required.");
      return;
    }
    try {
      if (editId) {
        await updateDoc(doc(db, "users", currentUser.uid, "addressBook", editId), form);
        setReceivers(rs => rs.map(r => r.id === editId ? { ...r, ...form } : r));
        setSuccess("Receiver updated.");
      } else {
        const docRef = await addDoc(collection(db, "users", currentUser.uid, "addressBook"), form);
        setReceivers(rs => [...rs, { id: docRef.id, ...form }]);
        setSuccess("Receiver added.");
      }
      handleClose();
    } catch (err) {
      setError("Failed to save receiver.");
    }
  };
  const handleDelete = async (id) => {
    setError("");
    setSuccess("");
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "addressBook", id));
      setReceivers(rs => rs.filter(r => r.id !== id));
      setSuccess("Receiver deleted.");
    } catch (err) {
      setError("Failed to delete receiver.");
    }
  };

  if (!currentUser) return null;

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Paper elevation={2} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h4" mb={3} align="center">Address Book</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Box mb={2} display="flex" justifyContent="flex-end">
          <Button variant="contained" color="primary" onClick={() => handleOpen()}>Add Receiver</Button>
        </Box>
        {loading ? (
          <Typography align="center">Loading...</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receivers.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.address}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => handleOpen(r)}><EditIcon /></IconButton>
                      <IconButton onClick={() => handleDelete(r.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
          <DialogTitle>{editId ? "Edit Receiver" : "Add Receiver"}</DialogTitle>
          <DialogContent>
            <TextField label="Name" name="name" value={form.name} onChange={handleChange} fullWidth margin="normal" required />
            <TextField label="Email" name="email" value={form.email} onChange={handleChange} fullWidth margin="normal" required />
            <TextField label="Address" name="address" value={form.address} onChange={handleChange} fullWidth margin="normal" required />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" color="primary">Save</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
} 