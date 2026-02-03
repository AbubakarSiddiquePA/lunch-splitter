import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { HiOutlineCalculator } from "react-icons/hi";
import { evaluate } from "mathjs";
import { auth } from "../auth";

export default function NewOrderPage() {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [members, setMembers] = useState([]);
  const [paidBy, setPaidBy] = useState("");
  const [amounts, setAmounts] = useState({});
  const [restaurant, setRestaurant] = useState("");

  const membersRef = collection(db, "members");
  const ordersRef = collection(db, "orders");
  const [showCalc, setShowCalc] = useState(false);
  const [calcValue, setCalcValue] = useState("");

  // Load members from Firebase
  useEffect(() => {
    const fetchMembers = async () => {
      const data = await getDocs(membersRef);
      setMembers(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    };

    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const participants = members
      .map((m) => ({
        userId: m.id,
        name: m.name,
        amount: parseFloat(amounts[m.id]) || 0,
      }))
      .filter((p) => p.amount > 0);

    if (participants.length === 0) {
      toast.warning("Enter at least one amount");
      return;
    }

    const total = participants.reduce((sum, p) => sum + p.amount, 0);

    try {
      await addDoc(ordersRef, {
        date: new Date().toISOString(),
        restaurant,
        paidBy,
        total,
        participants,
      });

      toast.success("Order saved successfully");

      setRestaurant("");
      setPaidBy("");
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
  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === "greeshma@housekeepingco.com";

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>📝 New Lunch Order</h2>

        <button
          className="icon-btn"
          onClick={() => setShowCalc(true)}
          title="Open Calculator"
        >
          <HiOutlineCalculator size={20} />
        </button>
      </div>
      <input
        className="input full-width"
        placeholder="Restaurant"
        value={restaurant}
        onChange={(e) => setRestaurant(e.target.value)}
      />

      <select
        className="input full-width"
        value={paidBy}
        onChange={(e) => {
          if (e.target.value === "add_new") {
            setShowAddMember(true);
            return;
          }
          setPaidBy(e.target.value);
        }}
      >
        <option value="">Who Paid?</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
        <option value="add_new">➕ Add New Member</option>
      </select>

      <h3>Enter Amount Per Person</h3>

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
      {showCalc && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h4>Quick Calculator</h4>

            <input
              type="text"
              value={calcValue}
              onChange={(e) => setCalcValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  try {
                    const result = evaluate(calcValue);
                    setCalcValue(result.toString());
                  } catch {
                    toast.error("Invalid calculation");
                  }
                }
              }}
              className="input"
              placeholder="Type math like 120/5"
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              <button
                className="btn small"
                onClick={() => {
                  try {
                    const result = evaluate(calcValue);
                    setCalcValue(result.toString());
                  } catch {
                    toast.error("Invalid calculation");
                  }
                }}
              >
                =
              </button>

              <button
                className="btn small"
                onClick={() => setCalcValue("")}
                style={{ background: "#f3f4f6", color: "#111" }}
              >
                Clear
              </button>

              <button className="btn small" onClick={() => setShowCalc(false)}>
                Close
              </button>
            </div>

            {/* <div style={{ marginTop: 10, textAlign: "right" }}>
              <button className="btn small" onClick={() => setShowCalc(false)}>
                Close
              </button>
            </div> */}
          </div>
        </div>
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
