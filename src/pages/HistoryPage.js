import { toast } from "react-toastify";
import React from "react";
import { auth } from "../auth";

import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";

export default function HistoryPage() {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");

  const [orders, setOrders] = useState([]);
  const [members, setMembers] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openId, setOpenId] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [editRestaurant, setEditRestaurant] = useState("");
  const [editAmounts, setEditAmounts] = useState({});
  const [editPaidBy, setEditPaidBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const loadData = async () => {
    const orderSnap = await getDocs(collection(db, "orders"));
    const memberSnap = await getDocs(collection(db, "members"));

    setOrders(orderSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    setMembers(memberSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
  };

  useEffect(() => {
    loadData();
  }, []);

  const getName = (id) => {
    const user = members.find((m) => m.id === id);
    return user ? user.name : "Unknown";
  };

  const deleteOrder = async (id) => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, "orders", id));
      toast.success("Order deleted successfully");
      loadData();
    } catch (err) {
      toast.error("Failed to delete order");
      console.error(err);
    } finally {
      setLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const startEdit = (order) => {
    setEditOrder(order);
    setEditRestaurant(order.restaurant || "");
    setEditPaidBy(order.paidBy);

    const amtMap = {};
    order.participants.forEach((p) => {
      amtMap[p.userId] = p.amount;
    });
    setEditAmounts(amtMap);
    setOpenId(null);
  };

  const saveEdit = async (orderId) => {
    try {
      setLoading(true);

      const participants = members
        .map((m) => ({
          userId: m.id,
          name: m.name,
          amount: editAmounts[m.id] || 0,
        }))
        .filter((p) => p.amount > 0);

      if (participants.length === 0) {
        toast.warning("At least one person must have an amount");
        return;
      }

      const total = participants.reduce((sum, p) => sum + p.amount, 0);

      await updateDoc(doc(db, "orders", orderId), {
        restaurant: editRestaurant,
        paidBy: editPaidBy,
        participants,
        total,
      });

      toast.success("Order updated successfully");
      setEditOrder(null);
      loadData();
    } catch (err) {
      toast.error("Failed to update order");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.date);
    if (fromDate && orderDate < new Date(fromDate)) return false;
    if (toDate && orderDate > new Date(toDate)) return false;
    return true;
  });
const addNewMember = async () => {
  const trimmed = newMemberName.trim();

  if (!trimmed) {
    toast.warning("Enter member name");
    return;
  }

  const exists = members.some(
    m => m.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (exists) {
    toast.error("Member already exists");
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "members"), { name: trimmed });

    const newMember = { id: docRef.id, name: trimmed };
    setMembers([...members, newMember]);
    setEditPaidBy(docRef.id);

    toast.success("Member added");
    setNewMemberName("");
    setShowAddMember(false);

  } catch (err) {
    toast.error("Failed to add member");
  }
};
const currentUser = auth.currentUser;
const isAdmin = currentUser?.email === "greeshma@housekeepingco.com";

  return (
    <div className="card">
      <h2>📜 Lunch History</h2>

      <div className="row" style={{ gap: "10px", marginBottom: "10px" }}>
        <input
          type="date"
          className="input"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <input
          type="date"
          className="input"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>

     <table className="history-table">

        <thead>
          <tr style={{ borderBottom: "1px solid #ddd" }}>
            <th>Date</th>
            <th>Restaurant</th>
            <th>Paid By</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredOrders.map((order) => (
            <React.Fragment key={order.id}>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td>{new Date(order.date).toLocaleDateString()}</td>
                <td>{order.restaurant || "N/A"}</td>
                <td>{getName(order.paidBy)}</td>
                <td>{order.total}</td>
                <td>
<button
  className="btn small"
  disabled={!isAdmin}
  style={{
    opacity: isAdmin ? 1 : 0.5,
    cursor: isAdmin ? "pointer" : "not-allowed"
  }}
  onClick={() => {
    if (!isAdmin) return toast.error("Only admin can edit orders");
    startEdit(order);
  }}
>
  Edit
</button>

                  <button
  className="btn danger small"
  disabled={!isAdmin}
  style={{
    opacity: isAdmin ? 1 : 0.5,
    cursor: isAdmin ? "pointer" : "not-allowed"
  }}
  onClick={() => {
    if (!isAdmin) return toast.error("Only admin can delete orders");
    setConfirmDeleteId(order.id);
  }}
>
  Delete
</button>

                  <button
                    className="btn small"
                    onClick={() =>
                      setOpenId(openId === order.id ? null : order.id)
                    }
                  >
                    {openId === order.id ? "Hide" : "Details"}
                  </button>
                </td>
              </tr>

              {/* DETAILS ROW */}
              {!editOrder && openId === order.id && (
                <tr>
                  <td colSpan="5" style={{ background: "#f9fafb" }}>
                    <div style={{ padding: "10px" }}>
                      <b>Breakdown:</b>
                      <ul>
                        {order.participants.map((p, i) => (
                          <li key={i}>
                            {p.name} — {p.amount}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </td>
                </tr>
              )}

              {/* EDIT ROW */}
              {editOrder && editOrder.id === order.id && (
                <tr>
                  <td colSpan="5" style={{ background: "#f9fafb" }}>
                    <div style={{ padding: "10px" }}>
                      <h4>Edit Order</h4>

                      <input
                        className="input"
                        value={editRestaurant}
                        onChange={(e) => setEditRestaurant(e.target.value)}
                        placeholder="Restaurant"
                      />

                      <select
                        className="input"
                        value={editPaidBy}
                        onChange={(e) => {
                          if (e.target.value === "add_new") {
                            setShowAddMember(true);
                            return;
                          }
                          setEditPaidBy(e.target.value);
                        }}
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                        <option value="add_new">➕ Add New Member</option>
                      </select>

                      <h4>Amounts</h4>
                      {members.map((m) => (
                        <div key={m.id} className="row">
                          <span>{m.name}</span>
                          <input
                            type="number"
                            className="input small"
                            value={editAmounts[m.id] || ""}
                            onChange={(e) =>
                              setEditAmounts({
                                ...editAmounts,
                                [m.id]: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      ))}

                      <button
                        className="btn"
                        disabled={loading}
                        onClick={() => saveEdit(order.id)}
                      >
                        Save Changes
                      </button>

                      <button
                        className="btn danger"
                        disabled={loading}
                        style={{ marginLeft: "10px" }}
                        onClick={() => setEditOrder(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {showAddMember && (
  <div style={overlayStyle}>
    <div style={modalStyle}>
      <h4>Add New Member</h4>

      <input
        className="input"
        placeholder="Member name"
        value={newMemberName}
        onChange={(e) => setNewMemberName(e.target.value)}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button className="btn" onClick={() => setShowAddMember(false)}>Cancel</button>
        <button className="btn" onClick={addNewMember}>Add</button>
      </div>
    </div>
  </div>
)}

      {confirmDeleteId && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h4>Delete Order?</h4>
            <p>This action cannot be undone.</p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button className="btn" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </button>

              <button
                className="btn danger"
                onClick={() => deleteOrder(confirmDeleteId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "8px",
  width: "300px",
};
