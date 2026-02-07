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
  const [settlements, setSettlements] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [members, setMembers] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openId, setOpenId] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [editRestaurant, setEditRestaurant] = useState("");
  const [editAmounts, setEditAmounts] = useState({});
  const [editPaidBy, setEditPaidBy] = useState("");
  const [editDateMode, setEditDateMode] = useState("today");
  const [editOrderDate, setEditOrderDate] = useState(getLocalDateInputValue(new Date()));
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showLunchHistory, setShowLunchHistory] = useState(true);
  const [showSettlementHistory, setShowSettlementHistory] = useState(false);
  const [showOutstandingHistory, setShowOutstandingHistory] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const orderSnap = await getDocs(collection(db, "orders"));
    const memberSnap = await getDocs(collection(db, "members"));
    const settlementSnap = await getDocs(collection(db, "settlements"));
    const adjustmentSnap = await getDocs(collection(db, "manual_adjustments"));

    setOrders(orderSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    setSettlements(
      settlementSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
    );
    setAdjustments(
      adjustmentSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
    );
    setMembers(memberSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    setLoading(false);
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
    const orderDate = order.date ? new Date(order.date) : new Date();
    const todayValue = getLocalDateInputValue(new Date());
    const orderValue = getLocalDateInputValue(orderDate);
    setEditOrderDate(orderValue);
    setEditDateMode(orderValue === todayValue ? "today" : "custom");

    const amtMap = getOrderAmountMap(order);
    setEditAmounts(amtMap);
    setOpenId(null);
  };

  const saveEdit = async (orderId) => {
    try {
      setLoading(true);

      const rawParticipants = members
        .map((m) => ({
          userId: m.id,
          name: m.name,
          amount: editAmounts[m.id] || 0,
        }))
        .filter((p) => p.amount > 0);

      if (rawParticipants.length === 0) {
        toast.warning("At least one person must have an amount");
        return;
      }

      const total = rawParticipants.reduce((sum, p) => sum + p.amount, 0);
      const participants = rawParticipants.map((p) => ({
        userId: p.userId,
        name: p.name,
        amount: p.userId === editPaidBy ? 0 : p.amount,
      }));

      await updateDoc(doc(db, "orders", orderId), {
        restaurant: editRestaurant,
        paidBy: editPaidBy,
        participants,
        rawParticipants,
        total,
        date: new Date(`${editOrderDate}T00:00:00`).toISOString(),
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
  const editLiveTotal = members.reduce((sum, m) => {
    const num = parseFloat(editAmounts[m.id]);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.date);
    if (fromDate && orderDate < new Date(fromDate)) return false;
    if (toDate && orderDate > new Date(toDate)) return false;
    return true;
  });
  const filteredSettlements = settlements.filter((s) => {
    const settlementDate = new Date(s.date);
    if (fromDate && settlementDate < new Date(fromDate)) return false;
    if (toDate && settlementDate > new Date(toDate)) return false;
    return true;
  });
  const filteredAdjustments = adjustments.filter((a) => {
    const adjDate = new Date(a.date);
    if (fromDate && adjDate < new Date(fromDate)) return false;
    if (toDate && adjDate > new Date(toDate)) return false;
    return true;
  });
  const sortedOrders = [...filteredOrders].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  const sortedSettlements = [...filteredSettlements].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  const sortedAdjustments = [...filteredAdjustments].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  const totalSettledAmount = sortedSettlements.reduce(
    (sum, s) => sum + Number(s.amount || 0),
    0,
  );
  const totalAdjustmentAmount = sortedAdjustments.reduce(
    (sum, a) => sum + Number(a.amount || 0),
    0,
  );
  const addNewMember = async () => {
    const trimmed = newMemberName.trim();

    if (!trimmed) {
      toast.warning("Enter member name");
      return;
    }

    const exists = members.some(
      (m) => m.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (exists) {
      toast.error("Member already exists");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "members"), { name: trimmed });

      const newMember = { id: docRef.id, name: trimmed };
      setMembers([...members, newMember]);

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
      <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          aria-hidden="true"
          style={{
            width: "20px",
            height: "20px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" role="img" focusable="false">
            <path d="M13 3a9 9 0 1 0 8.5 6h-2.2A7 7 0 1 1 13 5v3l4-4-4-4Zm-1 5h2v6h-6v-2h4Z" />
          </svg>
        </span>
        <span>Lunch History</span>
      </h2>

      <div className="form-row" style={{ marginBottom: "10px" }}>
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
      {loading ? (
        <div className="page-loader">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <button
            className="btn"
            onClick={() => setShowLunchHistory((s) => !s)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#1877f2",
              color: "#fff",
              border: "none",
              textAlign: "left",
              marginBottom: "10px",
            }}
          >
            <span>Lunch History</span>
            <span style={{ fontSize: "18px", lineHeight: 1 }}>
              {showLunchHistory ? "−" : "+"}
            </span>
          </button>

          {showLunchHistory && (
            <>
              {!isAdmin && (
                <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                  Only admin can edit or delete orders
                </p>
              )}
              <div className="table-scroll">
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
              {sortedOrders.map((order) => (
              <React.Fragment key={order.id}>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td>{new Date(order.date).toLocaleDateString()}</td>
                  <td>{order.restaurant || "N/A"}</td>
                  <td>{getName(order.paidBy)}</td>
                  <td>{Number(order.total).toFixed(2)}</td>
                  <td>
                    <div className="history-actions">
                    <button
                      className="history-action-btn history-action-btn-edit"
                      disabled={!isAdmin}
                      style={{
                        opacity: isAdmin ? 1 : 0.5,
                        cursor: isAdmin ? "pointer" : "not-allowed",
                      }}
                      onClick={() => {
                        if (!isAdmin)
                          return toast.error("Only admin can edit orders");
                        startEdit(order);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      className="history-action-btn history-action-btn-delete"
                      disabled={!isAdmin}
                      style={{
                        opacity: isAdmin ? 1 : 0.5,
                        cursor: isAdmin ? "pointer" : "not-allowed",
                      }}
                      onClick={() => {
                        if (!isAdmin)
                          return toast.error("Only admin can delete orders");
                        setConfirmDeleteId(order.id);
                      }}
                    >
                      Delete
                    </button>

                    <button
                      className="history-action-btn history-action-btn-details"
                      onClick={() =>
                        setOpenId(openId === order.id ? null : order.id)
                      }
                    >
                      {openId === order.id ? "Hide" : "Details"}
                    </button>
                    </div>
                  </td>
                </tr>

                {/* DETAILS ROW */}
                {/* DETAILS ROW */}
                {!editOrder && openId === order.id && (
                  <tr className="details-row">
                    <td colSpan="5">
                      <div className="details-box">
                        <h4
                          className="details-title"
                          style={{ textAlign: "left" }}
                        >
                          Order Breakdown
                        </h4>

                        <table className="details-table compact">
                          <thead>
                            <tr>
                              <th>Member</th>
                              <th style={{ textAlign: "right" }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getOrderAmountList(order).map((p, i) => (
                              <tr key={i}>
                                <td>{getName(p.userId)}</td>
                                <td style={{ textAlign: "right" }}>
                                  {Number(p.amount).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}

                {/* EDIT ROW */}
                {editOrder && editOrder.id === order.id && (
                  <tr>
                    <td colSpan="5" style={{ background: "#f9fafb" }}>
                      <div className="edit-sheet">
                        <h4>Edit Order</h4>

                        <div className="section-label">Date</div>
                        <div className="chip-container" style={{ marginBottom: "6px" }}>
                          <button
                            className={`chip ${editDateMode === "today" ? "active" : ""}`}
                            onClick={() => {
                              setEditDateMode("today");
                              setEditOrderDate(getLocalDateInputValue(new Date()));
                            }}
                          >
                            Today
                          </button>

                          <button
                            className={`chip ${editDateMode === "custom" ? "active" : ""}`}
                            onClick={() => setEditDateMode("custom")}
                          >
                            Choose Date
                          </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {editDateMode === "custom" && (
                            <input
                              type="date"
                              className="input date-input edit-input"
                              min={getLocalDateInputValue(getOneMonthAgoDate())}
                              value={editOrderDate}
                              onChange={(e) => setEditOrderDate(e.target.value)}
                            />
                          )}

                          <input
                            className="input edit-input"
                            value={editRestaurant}
                            onChange={(e) => setEditRestaurant(e.target.value)}
                            placeholder="Restaurant"
                          />

                          <select
                            className="input edit-input"
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
                        </div>

                        <h4>Amounts</h4>
                        <div className="edit-amounts-list">
                          {members.map((m) => (
                            <div
                              key={m.id}
                              className="edit-amount-row"
                            >
                              <span className="edit-amount-name">
                                {m.name}
                              </span>
                              <div className="edit-amount-input">
                                <input
                                  type="number"
                                  className="input small"
                                  style={{
                                    width: "min(120px, 100%)",
                                    textAlign: "right",
                                    margin: 0, // Removes default browser margins
                                  }}
                                  value={editAmounts[m.id] || ""}
                                  placeholder="0.00"
                                  onChange={(e) =>
                                    setEditAmounts({
                                      ...editAmounts,
                                      [m.id]: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="edit-amount-row" style={{ marginTop: "6px" }}>
                          <span className="edit-amount-name">Total Amount</span>
                          <span className="edit-amount-input">
                            <strong>AED {editLiveTotal.toFixed(2)}</strong>
                          </span>
                        </div>

                        <button
                          className="btn"
                          disabled={loading}
                          style={{ margin: "0px" }}
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
          </div>
            </>
          )}

          <button
            className="btn"
            onClick={() => setShowSettlementHistory((s) => !s)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#f9fafb",
              color: "#111827",
              border: "1px solid #e5e7eb",
              textAlign: "left",
              marginTop: "14px",
            }}
          >
            <span>Settlement History</span>
            <span style={{ fontSize: "18px", lineHeight: 1 }}>
              {showSettlementHistory ? "−" : "+"}
            </span>
          </button>

          {showSettlementHistory && (
            <div className="card" style={{ background: "#f9fafb", marginTop: "10px" }}>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                Total settled: AED {totalSettledAmount.toFixed(2)} ·{" "}
                {sortedSettlements.length}{" "}
                {sortedSettlements.length === 1 ? "entry" : "entries"}
              </div>

              {sortedSettlements.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No settlements yet</p>
              ) : (
                <div className="table-scroll">
                  <table className="history-table">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #ddd" }}>
                        <th>Date</th>
                        <th>Settled By</th>
                        <th>Settled To</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSettlements.map((s) => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                          <td>{new Date(s.date).toLocaleDateString()}</td>
                          <td>{getName(s.from)}</td>
                          <td>{getName(s.to)}</td>
                          <td>{Number(s.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <button
            className="btn"
            onClick={() => setShowOutstandingHistory((s) => !s)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#f9fafb",
              color: "#111827",
              border: "1px solid #e5e7eb",
              textAlign: "left",
              marginTop: "14px",
            }}
          >
            <span>Outstanding History</span>
            <span style={{ fontSize: "18px", lineHeight: 1 }}>
              {showOutstandingHistory ? "−" : "+"}
            </span>
          </button>

          {showOutstandingHistory && (
            <div className="card" style={{ background: "#f9fafb", marginTop: "10px" }}>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                Total outstanding added: AED {totalAdjustmentAmount.toFixed(2)} ·{" "}
                {sortedAdjustments.length}{" "}
                {sortedAdjustments.length === 1 ? "entry" : "entries"}
              </div>

              {sortedAdjustments.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No outstanding entries yet</p>
              ) : (
                <div className="table-scroll">
                  <table className="history-table">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #ddd" }}>
                        <th>Date</th>
                        <th>Added From</th>
                        <th>Added To</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAdjustments.map((a) => (
                        <tr key={a.id} style={{ borderBottom: "1px solid #eee" }}>
                          <td>{new Date(a.date).toLocaleDateString()}</td>
                          <td>{getName(a.from)}</td>
                          <td>{getName(a.to)}</td>
                          <td>{Number(a.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
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

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button className="btn" onClick={() => setShowAddMember(false)}>
                Cancel
              </button>
              <button className="btn" onClick={addNewMember}>
                Add
              </button>
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

function getOrderAmountMap(order) {
  if (order.rawParticipants && order.rawParticipants.length) {
    return order.rawParticipants.reduce((acc, p) => {
      acc[p.userId] = p.amount;
      return acc;
    }, {});
  }

  const map = {};
  let sumNonPayer = 0;
  order.participants.forEach((p) => {
    map[p.userId] = p.amount;
    if (p.userId !== order.paidBy) {
      sumNonPayer += p.amount;
    }
  });
  const payerAmount = Math.max(
    0,
    Number(order.total || 0) - sumNonPayer,
  );
  if (order.paidBy) {
    map[order.paidBy] = payerAmount;
  }
  return map;
}

function getOrderAmountList(order) {
  const map = getOrderAmountMap(order);
  return Object.entries(map)
    .filter(([, amount]) => Number(amount) > 0)
    .map(([userId, amount]) => ({
      userId,
      amount,
    }));
}

function getLocalDateInputValue(date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 10);
}

function getOneMonthAgoDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d;
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
  width: "min(300px, calc(100vw - 32px))",
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
};

