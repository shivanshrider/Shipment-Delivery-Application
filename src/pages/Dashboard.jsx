import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs, or, orderBy } from "firebase/firestore";
import { Box, Typography, CircularProgress, Grid, Container, Paper } from "@mui/material";
import ShipmentCard from "../components/ShipmentCard";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, bgcolor: 'background.paper' }}>
        <Typography variant="h4" mb={3} align="center">Your Shipments</Typography>
        {shipments.length === 0 ? (
          <Typography align="center">No shipments found.</Typography>
        ) : (
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }} gap={3}>
            {shipments.map(shipment => (
              <ShipmentCard shipment={shipment} key={shipment.id} />
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
}
