import React, { useState } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Box, TextField, Button, Typography, Alert, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext";

export default function CreateShipment() {
  const { currentUser } = useAuth();
  const [receiver, setReceiver] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [amount, setAmount] = useState(50); // base price
  const [weight, setWeight] = useState("");

  const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

  // Calculate amount automatically when description changes
  React.useEffect(() => {
    if (!weight || isNaN(weight) || Number(weight) <= 0) {
      setAmount("");
      return;
    }
    // Base price: 50 + 10 per 100g + 20 per 5 words in description
    const weightExtra = Math.floor(Number(weight) / 100) * 10;
    const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;
    const descExtra = Math.floor(wordCount / 5) * 20;
    const total = 50 + weightExtra + descExtra;
    console.log({ weight, wordCount, weightExtra, descExtra, total });
    setAmount(total);
  }, [description, weight]);

  function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  const handlePaymentAndCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!weight || isNaN(weight) || Number(weight) <= 0) {
      setError("Please enter a valid weight (greater than 0).");
      return;
    }
    setLoading(true);
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError("Failed to load Razorpay SDK. Please try again.");
      setLoading(false);
      return;
    }
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amount * 100, // INR to paise
      currency: "INR",
      name: "Shipment Payment",
      description: `Payment for shipment to ${receiver}`,
      handler: async function (response) {
        try {
          await addDoc(collection(db, "shipments"), {
            sender: currentUser.email,
            receiver,
            description,
            weight: Number(weight),
            amount,
            status: "Dispatched",
            statusHistory: [
              {
                status: "Dispatched",
                timestamp: new Date(),
                updatedBy: currentUser.email,
              },
            ],
            createdAt: serverTimestamp(),
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id || null,
            payerEmail: currentUser.email, // Razorpay doesn't return payer email in test mode, so use current user
            paymentDate: new Date(),
          });
          showNotification("Shipment created!", "success");
          navigate("/dashboard");
        } catch (err) {
          setError("Failed to create shipment.");
          showNotification("Failed to create shipment.", "error");
        }
        setLoading(false);
      },
      prefill: {
        email: currentUser.email,
      },
      theme: { color: "#1976d2" },
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function () {
      setError("Payment failed. Shipment not created.");
      showNotification("Payment failed. Shipment not created.", "error");
      setLoading(false);
    });
    rzp.open();
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="background.default">
      <Paper elevation={3} sx={{ maxWidth: 480, width: '100%', p: 4, borderRadius: 4 }}>
        <Typography variant="h4" mb={3} align="center">Create New Shipment</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handlePaymentAndCreate}>
          <TextField
            label="Receiver Email"
            type="email"
            fullWidth
            margin="normal"
            value={receiver}
            onChange={e => setReceiver(e.target.value)}
            required
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
          <TextField
            label="Weight (grams)"
            type="number"
            fullWidth
            margin="normal"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            required
          />
          <TextField
            label="Shipping Amount (INR)"
            fullWidth
            margin="normal"
            value={amount}
            InputProps={{ readOnly: true }}
          />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2, fontWeight: 600, fontSize: 18, py: 1.5 }} disabled={loading}>
            {loading ? "Processing..." : "Pay & Create Shipment"}
          </Button>
        </form>
      </Paper>
    </Box>
  );
} 