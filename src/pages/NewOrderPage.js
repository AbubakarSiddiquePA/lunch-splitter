import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { HiOutlineCalculator } from "react-icons/hi";
import { evaluate } from "mathjs";
import { auth } from "../auth";
import { createPortal } from "react-dom";

export default function NewOrderPage() {
  const [showAddMember, setShowAddMember] = useState(false);
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [members, setMembers] = useState([]);
  const [paidBy, setPaidBy] = useState("");
  const [amounts, setAmounts] = useState({});
  const [restaurant, setRestaurant] = useState("");
  const [dateMode, setDateMode] = useState("today");
  const [orderDate, setOrderDate] = useState(getLocalDateInputValue(new Date()));

  const ordersRef = collection(db, "orders");
  const [showCalc, setShowCalc] = useState(false);
  const [calcValue, setCalcValue] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(true);
  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === "greeshma@housekeepingco.com";

  // Load members from Firebase
  useEffect(() => {
    const fetchMembers = async () => {
      const membersRef = collection(db, "members");
      setLoadingMembers(true);
      const data = await getDocs(membersRef);
      setMembers(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      setLoadingMembers(false);
    };

    fetchMembers();
  }, []);

  useEffect(() => {
    if (showCalc || showAddMember || showPaidByPicker) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }

    document.body.style.overflow = "";
    return undefined;
  }, [showCalc, showAddMember, showPaidByPicker]);

  const handleAmountChange = (id, value) => {
    setAmounts({ ...amounts, [id]: value });
  };

  const saveOrder = async () => {
    if (!isAdmin) {
      toast.error("Only admin can save orders");
      return;
    }

    if (!paidBy) {
      toast.warning("Please select who paid");
      return;
    }

    // Step 1: Collect entered amounts
    const rawParticipants = members
      .map((m) => ({
        userId: m.id,
        name: m.name,
        amount: parseFloat(amounts[m.id]) || 0,
      }))
      .filter((p) => p.amount > 0);

    if (rawParticipants.length === 0) {
      toast.warning("Enter at least one amount");
      return;
    }

    // Step 2: Calculate full bill total
    const total = rawParticipants.reduce((sum, p) => sum + p.amount, 0);

    // Step 3: Fix logic -> payer should owe 0
    const participants = rawParticipants.map((p) => ({
      userId: p.userId,
      name: p.name,
      amount: p.userId === paidBy ? 0 : p.amount,
    }));

    try {
      await addDoc(ordersRef, {
        date: new Date(`${orderDate}T00:00:00`).toISOString(),
        restaurant,
        paidBy,
        total,
        participants,
        rawParticipants,
      });

      toast.success("Order saved successfully");

      // Reset form
      setRestaurant("");
      setPaidBy("");
      setDateMode("today");
      setOrderDate(getLocalDateInputValue(new Date()));
      const reset = {};
      members.forEach((m) => (reset[m.id] = ""));
      setAmounts(reset);
    } catch (err) {
      toast.error("Failed to save order");
      console.error(err);
    }
  };

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
      const membersRef = collection(db, "members");
      const docRef = await addDoc(membersRef, { name: trimmed });

      toast.success("Member added");

      setMembers([...members, { id: docRef.id, name: trimmed }]);
      setPaidBy(docRef.id); // auto select new member
      setNewMemberName("");
      setShowAddMember(false);
    } catch (err) {
      toast.error("Failed to add member");
    }
  };
  const liveTotal = Object.values(amounts).reduce((sum, val) => {
    const num = parseFloat(val);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
  const selectedPayer = members.find((m) => m.id === paidBy);

  const runCalculation = () => {
    try {
      const result = evaluate(calcValue);
      setCalcValue(result.toString());
    } catch {
      toast.error("Invalid calculation");
    }
  };

  return (
    <div className="card new-order-card">
      <div className="page-head">
        <h2 className="new-order-title">
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
              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Zm0 2.4L18.6 10H14ZM8 13h8v2H8Zm0 4h8v2H8Zm0-8h4v2H8Z" />
            </svg>
          </span>
          <span>New Lunch Order</span>
        </h2>

        <button
          className="icon-btn"
          onClick={() => setShowCalc(true)}
          title="Open Calculator"
        >
          <HiOutlineCalculator size={20} />
        </button>
      </div>
      {/* Date Select */}
      <div className="section-label">Date</div>
      <div className="chip-container compact-gap">
        <button
          className={`chip ${dateMode === "today" ? "active" : ""}`}
          onClick={() => {
            setDateMode("today");
            setOrderDate(getLocalDateInputValue(new Date()));
          }}
        >
          Today
        </button>

        <button
          className={`chip ${dateMode === "custom" ? "active" : ""}`}
          onClick={() => setDateMode("custom")}
        >
          Choose Date
        </button>
      </div>

      {dateMode === "custom" && (
        <input
          type="date"
          className="input full-width date-input"
          min={getLocalDateInputValue(getOneMonthAgoDate())}
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
        />
      )}
      {/* Quick Picks */}
      <div className="section-label">Restaurant</div>
      <div className="chip-container">
        <button
          className={`chip ${restaurant === "Five Crown" ? "active" : ""}`}
          onClick={() => setRestaurant("Five Crown")}
        >
          Five Crown
        </button>

        <button
          className={`chip ${restaurant === "King Chef" ? "active" : ""}`}
          onClick={() => setRestaurant("King Chef")}
        >
          King Chef
        </button>
      </div>

      <input
        className="input full-width restaurant-input"
        placeholder="Or type restaurant name..."
        value={restaurant}
        onChange={(e) => setRestaurant(e.target.value)}
      />

      <button
        type="button"
        className={`input full-width paidby-trigger ${paidBy ? "has-value" : ""}`}
        onClick={() => setShowPaidByPicker(true)}
      >
        {selectedPayer ? `Who Paid: ${selectedPayer.name}` : "Who Paid?"}
      </button>

      <h3>Enter Amount Per Person</h3>

      {loadingMembers ? (
        <div className="page-loader">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="amount-list">
          {members.map((m) => (
            <div key={m.id} className="member-row">
              <span className="member-name">{m.name}</span>
              <input
                type="number"
                className="amount-input"
                value={amounts[m.id] || ""}
                onChange={(e) => handleAmountChange(m.id, e.target.value)}
                placeholder="0.00"
              />
            </div>
          ))}
        </div>
      )}

      {showCalc &&
        createPortal(
          <div className="modal-overlay page-modal-overlay">
            <div className="modal-card calc-modal">
              <h4 className="calc-title">Quick Calculator</h4>

              <input
                type="text"
                value={calcValue}
                onChange={(e) => setCalcValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    runCalculation();
                  }
                }}
                className="input calc-input"
                placeholder="Type math like 120/5"
              />

              <button
                className="btn calc-equal-btn"
                onClick={runCalculation}
              >
                Calculate
              </button>

              <div className="calc-secondary-actions">
                <button
                  className="btn-secondary calc-clear-btn"
                  onClick={() => setCalcValue("")}
                >
                  Clear
                </button>

                <button
                  className="btn-secondary calc-close-btn"
                  onClick={() => setShowCalc(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {showPaidByPicker &&
        createPortal(
          <div className="modal-overlay page-modal-overlay">
            <div className="modal-card paidby-modal">
              <h4 className="paidby-title">Select Who Paid</h4>
              <div className="paidby-list">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`paidby-option ${paidBy === m.id ? "active" : ""}`}
                    onClick={() => {
                      setPaidBy(m.id);
                      setShowPaidByPicker(false);
                    }}
                  >
                    {m.name}
                  </button>
                ))}
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowPaidByPicker(false);
                  }}
                >
                  Close
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setShowPaidByPicker(false);
                    setShowAddMember(true);
                  }}
                >
                  Add New Member
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {showAddMember &&
        createPortal(
          <div className="modal-overlay page-modal-overlay">
            <div className="modal-card add-member-modal">
              <h4>Add New Member</h4>

              <input
                className="input"
                placeholder="Member name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowAddMember(false)}
                >
                  Cancel
                </button>
                <button className="btn" onClick={addNewMember}>
                  Add
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      <div className="live-total-box">
        <span className="live-total-label">Total Amount</span>
        <span className="live-total-value">AED {liveTotal.toFixed(2)}</span>
      </div>

      <button
        className="btn-save-order"
        onClick={saveOrder}
        disabled={!isAdmin}
        style={{
          opacity: isAdmin ? 1 : 0.5,
          cursor: isAdmin ? "pointer" : "not-allowed",
        }}
      >
        Save Order
      </button>
      {!isAdmin && (
        <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "5px" }}>
          Only admin can add orders
        </p>
      )}
    </div>
  );
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




