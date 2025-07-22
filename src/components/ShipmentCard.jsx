import React, { useState } from "react";
import { Card, CardContent, Typography, Chip, Box, Button, MenuItem, Select, FormControl, InputLabel, List, ListItem, ListItemText, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack } from "@mui/material";
import { doc, updateDoc, arrayUnion, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

const STATUS_OPTIONS = ["Dispatched", "In Transit", "Delivered", "Returned", "Cancelled"];

export default function ShipmentCard({ shipment }) {
  const { currentUser } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editDesc, setEditDesc] = useState(shipment.description);
  const [editLoading, setEditLoading] = useState(false);
  const canUpdate = currentUser && (currentUser.email === shipment.sender || currentUser.email === shipment.receiver);
  const isSender = currentUser && currentUser.email === shipment.sender;
  const notDelivered = shipment.status !== "Delivered";
  const currentStatusIndex = STATUS_OPTIONS.indexOf(shipment.status);
  const nextStatuses = STATUS_OPTIONS.slice(currentStatusIndex + 1);
  const { showNotification } = useNotification();

  const handleStatusChange = async () => {
    if (!newStatus) return;
    setUpdating(true);
    try {
      const shipmentRef = doc(db, "shipments", shipment.id);
      await updateDoc(shipmentRef, {
        status: newStatus,
        statusHistory: arrayUnion({
          status: newStatus,
          timestamp: serverTimestamp(),
          updatedBy: currentUser.email,
        }),
      });
      setNewStatus("");
      showNotification("Status updated!", "success");
    } catch (err) {
      showNotification("Failed to update status.", "error");
    }
    setUpdating(false);
  };

  const handleEdit = async () => {
    setEditLoading(true);
    try {
      const shipmentRef = doc(db, "shipments", shipment.id);
      await updateDoc(shipmentRef, { description: editDesc });
      setEditOpen(false);
      showNotification("Description updated!", "success");
    } catch (err) {
      showNotification("Failed to update description.", "error");
    }
    setEditLoading(false);
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel (delete) this shipment?")) return;
    try {
      const shipmentRef = doc(db, "shipments", shipment.id);
      await deleteDoc(shipmentRef);
      showNotification("Shipment cancelled!", "success");
    } catch (err) {
      showNotification("Failed to cancel shipment.", "error");
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 2px 16px 0 rgba(60,72,100,0.07)', p: 2 }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Stack spacing={1.2}>
          <Typography variant="subtitle2" color="text.secondary">Sender: {shipment.sender}</Typography>
          <Typography variant="subtitle2" color="text.secondary">Receiver: {shipment.receiver}</Typography>
          <Typography variant="body1" fontWeight={500} mt={1}>{shipment.description}</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>Amount: ₹{shipment.amount || 0}</Typography>
          {shipment.weight !== undefined && (
            <Typography variant="body2" color="text.secondary" mt={1}>Weight: {shipment.weight}g</Typography>
          )}
          {shipment.packageSize && (
            <Typography variant="body2" color="text.secondary" mt={1}>Package Size: {shipment.packageSize}</Typography>
          )}
          {shipment.deliveryAddress && (
            <Typography variant="body2" color="text.secondary" mt={1}>Delivery Address: {shipment.deliveryAddress}</Typography>
          )}
          <Box mt={1} display="flex" alignItems="center" gap={2}>
            <Chip label={shipment.status} color={shipment.status === "Delivered" ? "success" : "primary"} sx={{ fontWeight: 600, fontSize: 15, px: 1.5 }} />
            {shipment.createdAt && (
              <Typography variant="caption" color="text.secondary">
                {shipment.createdAt.toDate ? shipment.createdAt.toDate().toLocaleString() : ""}
              </Typography>
            )}
          </Box>
          {shipment.paymentId && (
            <Typography variant="body2" color="success.main" mt={1}>Paid (Payment ID: {shipment.paymentId})</Typography>
          )}
          {shipment.orderId && (
            <Typography variant="body2" color="text.secondary" mt={1}>Order ID: {shipment.orderId}</Typography>
          )}
          {shipment.payerEmail && (
            <Typography variant="body2" color="text.secondary" mt={1}>Payer Email: {shipment.payerEmail}</Typography>
          )}
          {shipment.paymentDate && (
            <Typography variant="body2" color="text.secondary" mt={1}>Payment Date: {new Date(shipment.paymentDate).toLocaleString()}</Typography>
          )}
        </Stack>
        {/* Status Update Controls */}
        {canUpdate && nextStatuses.length > 0 && (
          <Box mt={2} display="flex" alignItems="center" gap={2}>
            <FormControl size="small">
              <InputLabel id={`status-select-label-${shipment.id}`}>Update Status</InputLabel>
              <Select
                labelId={`status-select-label-${shipment.id}`}
                value={newStatus}
                label="Update Status"
                onChange={e => setNewStatus(e.target.value)}
                sx={{ minWidth: 140 }}
              >
                {STATUS_OPTIONS.filter(status => status !== shipment.status).map(status => (
                  <MenuItem value={status} key={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="primary"
              disabled={!newStatus || updating}
              onClick={handleStatusChange}
            >
              Update
            </Button>
          </Box>
        )}
        {/* Edit/Cancel Buttons for Sender */}
        {isSender && notDelivered && (
          <Box mt={2} display="flex" gap={2}>
            <Button variant="outlined" color="primary" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button variant="outlined" color="error" onClick={handleCancel}>
              Cancel
            </Button>
          </Box>
        )}
        {/* Status History */}
        {shipment.statusHistory && shipment.statusHistory.length > 0 && (
          <Box mt={3}>
            <Typography variant="subtitle2" mb={1}>Status History:</Typography>
            <List dense>
              {shipment.statusHistory.map((entry, idx) => (
                <React.Fragment key={idx}>
                  <ListItem>
                    <ListItemText
                      primary={`${entry.status} by ${entry.updatedBy}`}
                      secondary={entry.timestamp && entry.timestamp.toDate ? entry.timestamp.toDate().toLocaleString() : entry.timestamp?.toString() || ""}
                    />
                  </ListItem>
                  {idx < shipment.statusHistory.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}
        {/* Edit Dialog */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
          <DialogTitle>Edit Description</DialogTitle>
          <DialogContent>
            <TextField
              label="Description"
              fullWidth
              margin="normal"
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)} disabled={editLoading}>Cancel</Button>
            <Button onClick={handleEdit} variant="contained" color="primary" disabled={editLoading}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
} 