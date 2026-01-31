import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

export default function NewOrderPage() {
  const [members, setMembers] = useState([]);
  const [paidBy, setPaidBy] = useState("");
  const [amounts, setAmounts] = useState({});
  const [restaurant, setRestaurant] = useState("");

  const membersRef = collection(db, "members");
  const ordersRef = collection(db, "orders");

  // Load members from Firebase
  useEffect(() => {
    const loadMembers = async () => {
      const data = await getDocs(membersRef);
      const list = data.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setMembers(list);

      const initial = {};
      list.forEach(m => (initial[m.id] = ""));
      setAmounts(initial);
    };

    loadMembers();
  }, []);

  const handleAmountChange = (id, value) => {
    setAmounts({ ...amounts, [id]: value });
  };

  const saveOrder = async () => {
    if (!paidBy) return alert("Select who paid");

    const participants = members
      .map(m => ({
        userId: m.id,
        name: m.name,
        amount: parseFloat(amounts[m.id]) || 0
      }))
      .filter(p => p.amount > 0);

    if (participants.length === 0) {
      return alert("Enter at least one amount");
    }

    const total = participants.reduce((sum, p) => sum + p.amount, 0);

    await addDoc(ordersRef, {
      date: new Date().toISOString(),
      restaurant,
      paidBy,
      total,
      participants
    });

    alert("Order Saved!");

    setRestaurant("");
    setPaidBy("");
    const reset = {};
    members.forEach(m => (reset[m.id] = ""));
    setAmounts(reset);
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
        onChange={(e) => setPaidBy(e.target.value)}
      >
        <option value="">Who Paid?</option>
        {members.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      <h3>Enter Amount Per Person</h3>

      {members.map(m => (
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

      <button className="btn" onClick={saveOrder}>Save Order</button>
    </div>
  );
}
