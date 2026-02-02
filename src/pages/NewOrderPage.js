import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { toast } from "react-toastify";

export default function NewOrderPage() {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [members, setMembers] = useState([]);
  const [paidBy, setPaidBy] = useState("");
  const [amounts, setAmounts] = useState({});
  const [restaurant, setRestaurant] = useState("");

  const membersRef = collection(db, "members");
  const ordersRef = collection(db, "orders");

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

  return (
    <div className="card">
      <h2>📝 New Lunch Order</h2>

      <input
        className="input"
        placeholder="Restaurant"
        value={restaurant}
        onChange={(e) => setRestaurant(e.target.value)}
      />

      <select
        className="input"
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
        <div key={m.id} className="row">
          <span>{m.name}</span>
          <input
            type="number"
            className="input small"
            value={amounts[m.id] || ""}
            onChange={(e) => handleAmountChange(m.id, e.target.value)}
          />
        </div>
      ))}
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

      <button className="btn" onClick={saveOrder}>
        Save Order
      </button>
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
