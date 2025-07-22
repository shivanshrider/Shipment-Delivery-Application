import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs, or, collection as fsCollection, addDoc as fsAddDoc, getDocs as fsGetDocs, serverTimestamp as fsServerTimestamp, query as fsQuery, orderBy as fsOrderBy } from "firebase/firestore";
import {
  Box, Typography, Container, Paper, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Stack, FormControl, InputLabel, Select, MenuItem, TextField, Rating, Alert
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
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
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import QRCode from 'react-qr-code';
import Barcode from 'react-barcode';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import QrBarcodeScanner from 'react-qr-barcode-scanner';

export default function YourShipments() {
  const { currentUser } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { showNotification } = useNotification();
  const STATUS_OPTIONS = ["Dispatched", "In Transit", "Delivered", "Returned", "Cancelled"];
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [feedback, setFeedback] = useState({ rating: null, comment: "" });
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [scannedShipment, setScannedShipment] = useState(null);
  const [scannerError, setScannerError] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    const fetchShipments = async () => {
      setLoading(true);
      try {
        const shipmentsRef = collection(db, "shipments");
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

  // Fetch comments when modal opens
  useEffect(() => {
    if (!modalOpen || !selectedShipment) return;
    const fetchComments = async () => {
      const q = fsQuery(fsCollection(db, "shipments", selectedShipment.id, "comments"), fsOrderBy("createdAt", "asc"));
      const snap = await fsGetDocs(q);
      setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchComments();
  }, [modalOpen, selectedShipment]);

  // Load feedback if present
  useEffect(() => {
    if (!selectedShipment) return;
    if (selectedShipment.feedback) {
      setFeedback({ rating: selectedShipment.feedback.rating, comment: selectedShipment.feedback.comment });
    } else {
      setFeedback({ rating: null, comment: "" });
    }
  }, [selectedShipment]);

  const handleView = (shipment) => {
    setSelectedShipment(shipment);
    setModalOpen(true);
    setNewStatus("");
  };
  const handleClose = () => {
    setModalOpen(false);
    setSelectedShipment(null);
    setNewStatus("");
  };
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

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await fsAddDoc(fsCollection(db, "shipments", selectedShipment.id, "comments"), {
        text: commentText,
        user: currentUser.displayName || currentUser.email,
        createdAt: fsServerTimestamp(),
      });
      setCommentText("");
      // Refresh comments
      const q = fsQuery(fsCollection(db, "shipments", selectedShipment.id, "comments"), fsOrderBy("createdAt", "asc"));
      const snap = await fsGetDocs(q);
      setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {}
    setCommentLoading(false);
  };

  const canGiveFeedback = selectedShipment && selectedShipment.status === 'Delivered' && currentUser && currentUser.email === selectedShipment.receiver && !selectedShipment.feedback;
  const handleFeedbackSubmit = async () => {
    if (!feedback.rating) return;
    setFeedbackLoading(true);
    try {
      await updateDoc(doc(db, "shipments", selectedShipment.id), {
        feedback: {
          rating: feedback.rating,
          comment: feedback.comment,
          by: currentUser.email,
          date: new Date(),
        }
      });
      setFeedbackLoading(false);
      // Optionally, refresh shipment data here
    } catch (err) {
      setFeedbackLoading(false);
    }
  };

  // Handle code scan
  const handleScan = async (result) => {
    if (!result) return;
    setScannedCode(result.text || result);
    setScannerError("");
    // Lookup shipment by tracking number
    const q = query(collection(db, "shipments"), where("trackingNumber", "==", result.text || result));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setScannedShipment({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } else {
      setScannedShipment(null);
      setScannerError("No shipment found for this code.");
    }
  };
  const handleScannerClose = () => {
    setScannerOpen(false);
    setScannedCode("");
    setScannedShipment(null);
    setScannerError("");
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Box mb={2} display="flex" justifyContent="flex-end">
        <Button variant="contained" color="primary" startIcon={<QrCodeScannerIcon />} onClick={() => setScannerOpen(true)}>
          Scan QR/Barcode
        </Button>
      </Box>
      <Dialog open={scannerOpen} onClose={handleScannerClose} maxWidth="xs" fullWidth>
        <DialogTitle>Scan QR/Barcode</DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', height: 300 }}>
            <QrBarcodeScanner
              onUpdate={(err, result) => {
                if (result) handleScan(result);
              }}
              constraints={{ facingMode: 'environment' }}
              style={{ width: '100%', height: 300 }}
            />
          </Box>
          {scannedCode && (
            <Typography variant="body2" mt={2}>Scanned: {scannedCode}</Typography>
          )}
          {scannerError && <Alert severity="error" sx={{ mt: 1 }}>{scannerError}</Alert>}
          {scannedShipment && (
            <Box mt={2}>
              <Typography variant="subtitle2">Shipment Found:</Typography>
              <Typography variant="body2">Receiver: {scannedShipment.receiver}</Typography>
              <Typography variant="body2">Status: {scannedShipment.status}</Typography>
              {/* Status update controls for scanned shipment */}
              <Box mt={2}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="scanned-status-select-label">Update Status</InputLabel>
                  <Select
                    labelId="scanned-status-select-label"
                    value={newStatus}
                    label="Update Status"
                    onChange={e => setNewStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.filter(status => status !== scannedShipment.status).map(status => (
                      <MenuItem value={status} key={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<UpdateIcon />}
                  disabled={!newStatus || updating}
                  onClick={async () => {
                    setUpdating(true);
                    try {
                      const shipmentRef = doc(db, "shipments", scannedShipment.id);
                      await updateDoc(shipmentRef, {
                        status: newStatus,
                        statusHistory: arrayUnion({
                          status: newStatus,
                          timestamp: serverTimestamp(),
                          updatedBy: currentUser.email,
                        }),
                      });
                      setScannerOpen(false);
                    } catch (err) {}
                    setUpdating(false);
                  }}
                  sx={{ ml: 2 }}
                >
                  Update
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleScannerClose}>Close</Button>
        </DialogActions>
      </Dialog>
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, bgcolor: 'background.paper' }}>
        <Typography variant="h4" mb={1} align="center">Your Shipments</Typography>
        <Typography variant="body2" mb={2} align="center" color="text.secondary">
          Now showing package size, delivery address, and advanced status updates (Returned, Cancelled).
        </Typography>
        {loading ? (
          <Typography align="center">Loading...</Typography>
        ) : shipments.length === 0 ? (
          <Typography align="center">No shipments found.</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tracking Number</TableCell>
                  <TableCell>Receiver</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Weight (g)</TableCell>
                  <TableCell>Package Size</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>ETA</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shipments.map((shipment) => (
                  <TableRow key={shipment.id} hover>
                    <TableCell>{shipment.trackingNumber}</TableCell>
                    <TableCell>{shipment.receiver}</TableCell>
                    <TableCell>{shipment.description}</TableCell>
                    <TableCell>{shipment.weight}</TableCell>
                    <TableCell>{shipment.packageSize}</TableCell>
                    <TableCell>{shipment.deliveryAddress}</TableCell>
                    <TableCell>
                      <Chip label={shipment.status} color={shipment.status === 'Delivered' ? 'success' : 'primary'} />
                    </TableCell>
                    <TableCell>{shipment.eta ? (shipment.eta.toDate ? shipment.eta.toDate().toLocaleDateString() : new Date(shipment.eta).toLocaleDateString()) : ''}</TableCell>
                    <TableCell>{shipment.createdAt && shipment.createdAt.toDate ? shipment.createdAt.toDate().toLocaleString() : ''}</TableCell>
                    <TableCell align="center">
                      <IconButton color="primary" onClick={() => handleView(shipment)}>
                        <VisibilityIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {/* Modal for viewing shipment details */}
        <Dialog open={modalOpen} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>Shipment Details</DialogTitle>
          <DialogContent dividers>
            {selectedShipment && (
              <Stack spacing={2}>
                <Typography><PersonIcon sx={{ mr: 1, color: 'primary.main' }} /><b>Sender:</b> {selectedShipment.sender}</Typography>
                <Typography><PersonIcon sx={{ mr: 1, color: 'secondary.main' }} /><b>Receiver:</b> {selectedShipment.receiver}</Typography>
                <Typography><DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} /><b>Description:</b> {selectedShipment.description}</Typography>
                <Typography><ScaleIcon sx={{ mr: 1, color: 'primary.main' }} /><b>Weight:</b> {selectedShipment.weight}g</Typography>
                <Typography><Inventory2Icon sx={{ mr: 1, color: 'primary.main' }} /><b>Package Size:</b> {selectedShipment.packageSize}</Typography>
                <Typography><HomeIcon sx={{ mr: 1, color: 'primary.main' }} /><b>Delivery Address:</b> {selectedShipment.deliveryAddress}</Typography>
                <Typography><CurrencyRupeeIcon sx={{ mr: 1, color: 'primary.main' }} /><b>Amount:</b> ₹{selectedShipment.amount}</Typography>
                <Typography><b>Tracking Number:</b> {selectedShipment.trackingNumber}</Typography>
                <Box mt={1} mb={2} display="flex" alignItems="center" gap={4}>
                  <Box>
                    <QRCode value={selectedShipment.trackingNumber || ''} size={80} />
                    <Typography variant="caption" display="block" align="center">QR: {selectedShipment.trackingNumber}</Typography>
                  </Box>
                  <Box>
                    <Barcode value={selectedShipment.trackingNumber || ''} width={1.6} height={60} fontSize={14} displayValue={true} />
                    <Typography variant="caption" display="block" align="center">Barcode</Typography>
                  </Box>
                </Box>
                <Typography><b>ETA:</b> {selectedShipment.eta ? (selectedShipment.eta.toDate ? selectedShipment.eta.toDate().toLocaleDateString() : new Date(selectedShipment.eta).toLocaleDateString()) : ''}</Typography>
                <Typography><Chip label={selectedShipment.status} color={selectedShipment.status === 'Delivered' ? 'success' : 'primary'} sx={{ mr: 1 }} /><b>Status:</b> {selectedShipment.status}</Typography>
                <Typography><EventIcon sx={{ mr: 1, color: 'primary.main' }} /><b>Date:</b> {selectedShipment.createdAt && selectedShipment.createdAt.toDate ? selectedShipment.createdAt.toDate().toLocaleString() : ''}</Typography>
                {/* Document Links */}
                {selectedShipment.documents && selectedShipment.documents.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" mb={1}>Documents:</Typography>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {selectedShipment.documents.map((url, idx) => {
                        const isImage = url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
                        return (
                          <li key={idx} style={{ marginBottom: 4 }}>
                            {isImage ? <ImageIcon sx={{ mr: 1, color: 'primary.main', verticalAlign: 'middle' }} /> : <InsertDriveFileIcon sx={{ mr: 1, color: 'primary.main', verticalAlign: 'middle' }} />}
                            <a href={url} target="_blank" rel="noopener noreferrer">Document {idx + 1}</a>
                          </li>
                        );
                      })}
                    </ul>
                  </Box>
                )}
                {/* Status Update Controls */}
                {canUpdate && (
                  <Box display="flex" alignItems="center" gap={2} mt={2}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel id="modal-status-select-label">Update Status</InputLabel>
                      <Select
                        labelId="modal-status-select-label"
                        value={newStatus}
                        label="Update Status"
                        onChange={e => setNewStatus(e.target.value)}
                      >
                        {STATUS_OPTIONS.filter(status => status !== selectedShipment.status).map(status => (
                          <MenuItem value={status} key={status}>{status}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<UpdateIcon />}
                      disabled={!newStatus || updating}
                      onClick={handleStatusUpdate}
                    >
                      Update
                    </Button>
                  </Box>
                )}
                {/* Status History */}
                {selectedShipment.statusHistory && selectedShipment.statusHistory.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" mb={1}><HistoryIcon sx={{ mr: 1, color: 'primary.main' }} />Status History:</Typography>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {selectedShipment.statusHistory.map((entry, idx) => (
                        <li key={idx}>
                          <b>{entry.status}</b> by {entry.updatedBy} <br />
                          <span style={{ color: '#888' }}>{entry.timestamp && entry.timestamp.toDate ? entry.timestamp.toDate().toLocaleString() : entry.timestamp?.toString() || ''}</span>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
                {/* Comments Section */}
                <Box mt={3}>
                  <Typography variant="subtitle2" mb={1}>Comments:</Typography>
                  <Box mb={1}>
                    {comments.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No comments yet.</Typography>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {comments.map((c, idx) => (
                          <li key={c.id || idx} style={{ marginBottom: 4 }}>
                            <b>{c.user}</b> <span style={{ color: '#888', fontSize: 12 }}>{c.createdAt && c.createdAt.toDate ? c.createdAt.toDate().toLocaleString() : ''}</span><br />
                            {c.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Box>
                  <Box display="flex" gap={1} alignItems="center">
                    <TextField
                      size="small"
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      fullWidth
                      disabled={commentLoading}
                    />
                    <Button variant="contained" color="primary" onClick={handleAddComment} disabled={commentLoading || !commentText.trim()}>
                      Add
                    </Button>
                  </Box>
                </Box>
                {/* Feedback Section */}
                <Box mt={3}>
                  <Typography variant="subtitle2" mb={1}>Delivery Feedback:</Typography>
                  {selectedShipment.feedback ? (
                    <Box mb={2}>
                      <Rating value={selectedShipment.feedback.rating} readOnly />
                      <Typography variant="body2" color="text.secondary">{selectedShipment.feedback.comment}</Typography>
                      <Typography variant="caption" color="text.secondary">By: {selectedShipment.feedback.by} on {selectedShipment.feedback.date ? new Date(selectedShipment.feedback.date).toLocaleDateString() : ''}</Typography>
                    </Box>
                  ) : canGiveFeedback ? (
                    <Box mb={2}>
                      <Rating
                        value={feedback.rating}
                        onChange={(_, v) => setFeedback(f => ({ ...f, rating: v }))}
                        size="large"
                      />
                      <TextField
                        label="Leave a comment (optional)"
                        value={feedback.comment}
                        onChange={e => setFeedback(f => ({ ...f, comment: e.target.value }))}
                        fullWidth
                        multiline
                        minRows={2}
                        sx={{ mt: 1, mb: 1 }}
                      />
                      <Button variant="contained" color="primary" onClick={handleFeedbackSubmit} disabled={feedbackLoading || !feedback.rating}>
                        Submit Feedback
                      </Button>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No feedback yet.</Typography>
                  )}
                </Box>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="secondary" variant="outlined">Close</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
} 