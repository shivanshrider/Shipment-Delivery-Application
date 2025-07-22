import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs, or, orderBy } from "firebase/firestore";
import { Box, Typography, CircularProgress, Grid, Container, Paper, Button, Chip } from "@mui/material";
import ShipmentCard from "../components/ShipmentCard";
import AddBoxIcon from '@mui/icons-material/AddBox';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Stack
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import ScaleIcon from '@mui/icons-material/Scale';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import HomeIcon from '@mui/icons-material/Home';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import EventIcon from '@mui/icons-material/Event';
import HistoryIcon from '@mui/icons-material/History';
import UpdateIcon from '@mui/icons-material/Update';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useNotification } from '../context/NotificationContext';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { showNotification } = useNotification();
  const STATUS_OPTIONS = ["Dispatched", "In Transit", "Delivered", "Returned", "Cancelled"];
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const canUpdate = selectedShipment && currentUser && (currentUser.email === selectedShipment.sender || currentUser.email === selectedShipment.receiver) && selectedShipment.status !== 'Delivered' && selectedShipment.status !== 'Cancelled';
  const handleStatusUpdate = async () => {
    if (!selectedShipment || !newStatus) return;
    setUpdating(true);
    try {
      const shipmentRef = doc(db, "shipments", selectedShipment.id);
      await updateDoc(shipmentRef, {
        status: newStatus,
        statusHistory: arrayUnion({
          status: newStatus,
          timestamp: serverTimestamp(),
          updatedBy: currentUser.email,
        }),
      });
      showNotification("Status updated!", "success");
      setModalOpen(false);
    } catch (err) {
      showNotification("Failed to update status.", "error");
    }
    setUpdating(false);
  };

  const handleView = (shipment) => {
    setSelectedShipment(shipment);
    setModalOpen(true);
  };
  const handleClose = () => {
    setModalOpen(false);
    setSelectedShipment(null);
  };

  useEffect(() => {
    if (!currentUser) return;
    const fetchShipments = async () => {
      setLoading(true);
      try {
        const shipmentsRef = collection(db, "shipments");
        // Fetch shipments where user is sender or receiver
        const q = query(
          shipmentsRef,
          or(
            where("sender", "==", currentUser.email),
            where("receiver", "==", currentUser.email)
          )
        );
        const querySnapshot = await getDocs(q);
        setShipments(
          querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
              if (!a.createdAt || !b.createdAt) return 0;
              return b.createdAt.seconds - a.createdAt.seconds;
            })
        );
      } catch (err) {
        setShipments([]);
      }
      setLoading(false);
    };
    fetchShipments();
  }, [currentUser]);

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Box display="flex" gap={4} mb={5} justifyContent="center" flexWrap="wrap">
        <Box
          onClick={() => navigate('/create-shipment')}
          sx={{
            flex: 1,
            minWidth: 280,
            maxWidth: 360,
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderRadius: 2,
            boxShadow: 2,
            p: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            cursor: 'pointer',
            border: theme => `1.5px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: 4, bgcolor: 'background.paper' },
            mb: { xs: 3, md: 0 },
          }}
        >
          <AddBoxIcon sx={{ fontSize: 36, mb: 2, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight={600} mb={0.5} color="primary.main">Create New Shipment</Typography>
          <Typography variant="body2" color="text.secondary">Start a new delivery order</Typography>
        </Box>
        <Box
          onClick={() => navigate('/your-shipments')}
          sx={{
            flex: 1,
            minWidth: 280,
            maxWidth: 360,
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderRadius: 2,
            boxShadow: 2,
            p: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            cursor: 'pointer',
            border: theme => `1.5px solid ${alpha(theme.palette.secondary.main, 0.12)}`,
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: 4, bgcolor: 'background.paper' },
            mb: { xs: 3, md: 0 },
          }}
        >
          <ListAltIcon sx={{ fontSize: 36, mb: 2, color: 'secondary.main' }} />
          <Typography variant="h5" fontWeight={600} mb={0.5} color="secondary.main">Your Shipments</Typography>
          <Typography variant="body2" color="text.secondary">View and track all your shipments</Typography>
        </Box>
      </Box>
    </Container>
  );
}
