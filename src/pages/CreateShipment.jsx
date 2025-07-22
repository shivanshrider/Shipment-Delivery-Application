import React, { useState } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { Box, TextField, Button, Typography, Alert, Paper, Checkbox, FormControlLabel } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext";
import celebalLogo from '../assets/celebal_shipment_logo.svg';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import ScaleIcon from '@mui/icons-material/Scale';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import HomeIcon from '@mui/icons-material/Home';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Papa from 'papaparse';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { LinearProgress } from '@mui/material';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTheme } from '@mui/material/styles';

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
  const [skipPayment, setSkipPayment] = useState(false);
  const [packageSize, setPackageSize] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [addressBook, setAddressBook] = useState([]);
  const [selectedReceiverId, setSelectedReceiverId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;
  const theme = useTheme();

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

  // Fetch address book
  React.useEffect(() => {
    async function fetchAddressBook() {
      if (!currentUser) return;
      const snap = await getDocs(collection(db, "users", currentUser.uid, "addressBook"));
      setAddressBook(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    fetchAddressBook();
  }, [currentUser]);

  // When a receiver is selected, auto-fill receiver email and address
  React.useEffect(() => {
    if (!selectedReceiverId) return;
    const receiver = addressBook.find(r => r.id === selectedReceiverId);
    if (receiver) {
      setReceiver(receiver.email);
      setDeliveryAddress(receiver.address);
    }
  }, [selectedReceiverId, addressBook]);

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

  // Utility to generate a unique tracking number
  function generateTrackingNumber() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'CS' + result;
  }

  const calculateETA = () => {
    const eta = new Date();
    eta.setDate(eta.getDate() + 5); // 5 days from now
    return eta;
  };

  // Upload files to Firebase Storage and return array of URLs
  const uploadDocuments = async (trackingNumber) => {
    if (!files.length) return [];
    setUploading(true);
    setUploadError("");
    try {
      const urls = [];
      for (const file of files) {
        const fileRef = ref(storage, `shipments/${trackingNumber}/${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        urls.push(url);
      }
      setUploading(false);
      return urls;
    } catch (err) {
      setUploading(false);
      setUploadError("Failed to upload documents.");
      return [];
    }
  };

  const handlePaymentAndCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!weight || isNaN(weight) || Number(weight) <= 0) {
      setError("Please enter a valid weight (greater than 0).");
      return;
    }
    if (!packageSize) {
      setError("Please enter the package size.");
      return;
    }
    if (!deliveryAddress) {
      setError("Please enter the delivery address.");
      return;
    }
    setLoading(true);
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError("Failed to load Razorpay SDK. Please try again.");
      setLoading(false);
      return;
    }
    const trackingNumber = generateTrackingNumber();
    const eta = calculateETA();
    const documentUrls = await uploadDocuments(trackingNumber);
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
            packageSize,
            deliveryAddress,
            trackingNumber,
            eta,
            documents: documentUrls,
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
          showNotification(`Shipment created! Tracking #: ${trackingNumber}, ETA: ${eta.toLocaleDateString()}`, "success");
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

  const handleCreateWithoutPayment = async () => {
    setError("");
    if (!weight || isNaN(weight) || Number(weight) <= 0) {
      setError("Please enter a valid weight (greater than 0).");
      return;
    }
    if (!packageSize) {
      setError("Please enter the package size.");
      return;
    }
    if (!deliveryAddress) {
      setError("Please enter the delivery address.");
      return;
    }
    setLoading(true);
    const trackingNumber = generateTrackingNumber();
    const eta = calculateETA();
    const documentUrls = await uploadDocuments(trackingNumber);
    try {
      await addDoc(collection(db, "shipments"), {
        sender: currentUser.email,
        receiver,
        description,
        weight: Number(weight),
        amount,
        packageSize,
        deliveryAddress,
        trackingNumber,
        eta,
        documents: documentUrls,
        status: "Dispatched",
        statusHistory: [
          {
            status: "Dispatched",
            timestamp: new Date(),
            updatedBy: currentUser.email,
          },
        ],
        createdAt: serverTimestamp(),
        paymentId: null,
        orderId: null,
        payerEmail: null,
        paymentDate: null,
      });
      showNotification(`Shipment created! Tracking #: ${trackingNumber}, ETA: ${eta.toLocaleDateString()}`, "success");
      navigate("/dashboard");
    } catch (err) {
      setError("Failed to create shipment.");
      showNotification("Failed to create shipment.", "error");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (skipPayment) {
      await handleCreateWithoutPayment();
    } else {
      await handlePaymentAndCreate(e);
    }
  };

  // Bulk shipment creation from CSV
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkLoading(true);
    setBulkResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let success = 0;
        let failed = 0;
        let errors = [];
        for (const row of results.data) {
          try {
            if (!row.receiver || !row.description || !row.weight || !row.packageSize || !row.deliveryAddress) {
              failed++;
              errors.push(`Missing required fields in row: ${JSON.stringify(row)}`);
              continue;
            }
            const trackingNumber = generateTrackingNumber();
            const eta = calculateETA();
            await addDoc(collection(db, "shipments"), {
              sender: currentUser.email,
              receiver: row.receiver,
              description: row.description,
              weight: Number(row.weight),
              amount: 50, // You can recalculate if needed
              packageSize: row.packageSize,
              deliveryAddress: row.deliveryAddress,
              trackingNumber,
              eta,
              status: "Dispatched",
              statusHistory: [
                {
                  status: "Dispatched",
                  timestamp: new Date(),
                  updatedBy: currentUser.email,
                },
              ],
              createdAt: serverTimestamp(),
              paymentId: null,
              orderId: null,
              payerEmail: null,
              paymentDate: null,
            });
            success++;
          } catch (err) {
            failed++;
            errors.push(`Error in row: ${JSON.stringify(row)} - ${err.message}`);
          }
        }
        setBulkResult({ success, failed, errors });
        setBulkLoading(false);
      },
      error: (err) => {
        setBulkResult({ success: 0, failed: 0, errors: [err.message] });
        setBulkLoading(false);
      }
    });
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="background.default" fontFamily="Poppins, Arial, sans-serif">
      <Box display="flex" width="100%" maxWidth="1200px" boxShadow={2} borderRadius={2} overflow="hidden" sx={{ background: 'background.paper', backdropFilter: 'none' }}>
        {/* Left Illustration */}
        <Box flex={1.2} display={{ xs: 'none', md: 'flex' }} alignItems="center" justifyContent="center" bgcolor={theme => theme.palette.grey[100]} p={6} minHeight="600px">
          <Box textAlign="center">
            <img src={celebalLogo} alt="Celebal Shipment" style={{ height: 90, marginBottom: 18 }} />
            <Typography variant="h4" color="text.primary" fontWeight={600} mb={2} letterSpacing={-1}>
              Fast & Secure
            </Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={400}>
              Ship your packages with confidence and track every step.
            </Typography>
          </Box>
        </Box>
        {/* Right Form */}
        <Box flex={2} p={{ xs: 2, md: 6 }} display="flex" alignItems="center" justifyContent="center" width="100%">
          <Paper elevation={1} sx={{ width: '100%', maxWidth: 520, p: { xs: 2, md: 5 }, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h4" mb={3} align="center" fontWeight={600} color="primary.main" letterSpacing={-1}>
              Create New Shipment
            </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <form onSubmit={handleSubmit}>
              {/* Document Upload */}
              <Box mb={2}>
                <Button
                  variant="outlined"
                  component="label"
                  color="primary"
                  sx={{ fontWeight: 600 }}
                  disabled={uploading}
                >
                  Upload Documents (PDF, Images)
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    hidden
                    onChange={e => setFiles(Array.from(e.target.files))}
                  />
                </Button>
                {files.length > 0 && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {files.length} file(s) selected
                  </Typography>
                )}
                {uploading && <LinearProgress sx={{ mt: 1 }} />}
                {uploadError && <Alert severity="error" sx={{ mt: 1 }}>{uploadError}</Alert>}
              </Box>
              {/* Bulk CSV Upload */}
              <Box mb={2}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  color="primary"
                  sx={{ fontWeight: 600 }}
                  disabled={bulkLoading}
                >
                  Upload CSV for Bulk Shipments
                  <input type="file" accept=".csv" hidden onChange={handleCSVUpload} />
                </Button>
                {bulkLoading && <LinearProgress sx={{ mt: 1 }} />}
                {bulkResult && (
                  <Box mt={2}>
                    <Alert severity={bulkResult.failed === 0 ? 'success' : 'warning'}>
                      {bulkResult.success} shipments created successfully. {bulkResult.failed > 0 && `${bulkResult.failed} failed.`}
                    </Alert>
                    {bulkResult.errors && bulkResult.errors.length > 0 && (
                      <Box mt={1}>
                        <Typography variant="body2" color="error">Errors:</Typography>
                        <ul style={{ color: 'red', fontSize: 13 }}>
                          {bulkResult.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                        </ul>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
              {addressBook.length > 0 && (
                <FormControl fullWidth margin="normal">
                  <InputLabel id="select-receiver-label">Select Saved Receiver</InputLabel>
                  <Select
                    labelId="select-receiver-label"
                    value={selectedReceiverId}
                    label="Select Saved Receiver"
                    onChange={e => setSelectedReceiverId(e.target.value)}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {addressBook.map(r => (
                      <MenuItem value={r.id} key={r.id}>{r.name} ({r.email})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
          <TextField
            label="Receiver Email"
            type="email"
            fullWidth
            margin="normal"
            value={receiver}
            onChange={e => setReceiver(e.target.value)}
            required
                InputProps={{ startAdornment: <PersonIcon sx={{ mr: 1, color: 'primary.main' }} /> }}
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
                InputProps={{ startAdornment: <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} /> }}
          />
          <TextField
            label="Weight (grams)"
            type="number"
            fullWidth
            margin="normal"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            required
                InputProps={{ startAdornment: <ScaleIcon sx={{ mr: 1, color: 'primary.main' }} /> }}
              />
              <TextField
                label="Package Size"
                fullWidth
                margin="normal"
                value={packageSize}
                onChange={e => setPackageSize(e.target.value)}
                required
                InputProps={{ startAdornment: <Inventory2Icon sx={{ mr: 1, color: 'primary.main' }} /> }}
              />
              <TextField
                label="Delivery Address"
                fullWidth
                margin="normal"
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                required
                InputProps={{ startAdornment: <HomeIcon sx={{ mr: 1, color: 'primary.main' }} /> }}
          />
          <TextField
            label="Shipping Amount (INR)"
            fullWidth
            margin="normal"
            value={amount}
                InputProps={{ readOnly: true, startAdornment: <CurrencyRupeeIcon sx={{ mr: 1, color: 'primary.main' }} /> }}
              />
              <FormControlLabel
                control={<Checkbox checked={skipPayment} onChange={e => setSkipPayment(e.target.checked)} color="primary" icon={<SkipNextIcon />} checkedIcon={<SkipNextIcon />} />}
                label={<Typography fontWeight={500} color="text.secondary">Skip Payment for now</Typography>}
                sx={{ mt: 1 }}
          />
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3, fontWeight: 700, fontSize: 20, py: 2, boxShadow: 4 }} disabled={loading}>
                {loading ? "Processing..." : skipPayment ? "Create Shipment" : "Pay & Create Shipment"}
          </Button>
        </form>
      </Paper>
        </Box>
      </Box>
    </Box>
  );
} 