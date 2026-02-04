import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { auth } from "../auth";

export default function BalancesPage() {
  const [members, setMembers] = useState([]);
  const [debts, setDebts] = useState([]);
  const [totals, setTotals] = useState({});
  const [filter, setFilter] = useState("all");

  const [settleInfo, setSettleInfo] = useState(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [showSummary, setShowSummary] = useState(true);
  const [selectedMember, setSelectedMember] = useState("all");

  // ⭐ NEW STATES (only addition)
  const [adjustFrom, setAdjustFrom] = useState("");
  const [adjustTo, setAdjustTo] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadData = async () => {
      setLoading(true);

    const ordersSnap = await getDocs(collection(db, "orders"));
    const membersSnap = await getDocs(collection(db, "members"));
    const settlementsSnap = await getDocs(collection(db, "settlements"));
    const adjustmentsSnap = await getDocs(collection(db, "manual_adjustments")); // ⭐ NEW

    const membersList = membersSnap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
    setMembers(membersList);

    const debtMap = {};
    const totalMap = {};

    membersList.forEach((m) => {
      totalMap[m.id] = { give: 0, receive: 0 };
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // ===== ORDERS (UNCHANGED) =====
    ordersSnap.docs.forEach((doc) => {
      const order = doc.data();
      const orderDate = new Date(order.date);

      if (filter === "today" && orderDate < startOfToday) return;
      if (filter === "week" && orderDate < startOfWeek) return;
      if (
        filter === "month" &&
        (orderDate.getMonth() !== currentMonth ||
          orderDate.getFullYear() !== currentYear)
      ) return;

      const payer = order.paidBy;

      order.participants.forEach((p) => {
        if (p.userId !== payer) {
          const key = `${p.userId}-${payer}`;
          if (!debtMap[key]) debtMap[key] = [];

          debtMap[key].push({ amount: p.amount, date: order.date });

          totalMap[p.userId].give += p.amount;
          totalMap[payer].receive += p.amount;
        }
      });
    });

    // ===== SETTLEMENTS (UNCHANGED) =====
    settlementsSnap.docs.forEach((doc) => {
      const s = doc.data();
      const settlementDate = new Date(s.date);

      if (filter === "today" && settlementDate < startOfToday) return;
      if (filter === "week" && settlementDate < startOfWeek) return;
      if (
        filter === "month" &&
        (settlementDate.getMonth() !== currentMonth ||
          settlementDate.getFullYear() !== currentYear)
      ) return;

      const key = `${s.from}-${s.to}`;
      if (!debtMap[key]) return;

      let remaining = s.amount;

      debtMap[key] = debtMap[key]
        .map((entry) => {
          if (remaining <= 0) return entry;
          const deduction = Math.min(entry.amount, remaining);
          remaining -= deduction;
          return { ...entry, amount: entry.amount - deduction };
        })
        .filter((entry) => entry.amount > 0.01);

      if (totalMap[s.from]) totalMap[s.from].give -= s.amount;
      if (totalMap[s.to]) totalMap[s.to].receive -= s.amount;
    });

    // ===== ⭐ MANUAL ADJUSTMENTS (NEW FEATURE ONLY) =====
    adjustmentsSnap.docs.forEach((doc) => {
      const adj = doc.data();
      if (!adj.from || !adj.to) return; // safety

      const key = `${adj.from}-${adj.to}`;
      if (!debtMap[key]) debtMap[key] = [];

      debtMap[key].push({ amount: adj.amount, date: adj.date });

      if (totalMap[adj.from]) totalMap[adj.from].give += adj.amount;
      if (totalMap[adj.to]) totalMap[adj.to].receive += adj.amount;
    });

    const debtList = [];
    Object.entries(debtMap).forEach(([key, entries]) => {
      const [from, to] = key.split("-");
      entries.forEach((entry) => {
        if (entry.amount > 0.01) {
          debtList.push({ from, to, amount: entry.amount, date: entry.date });
        }
      });
    });

    setDebts(debtList);
    setTotals(totalMap);
      setLoading(false);

  };

  const getName = (id) => {
    const user = members.find((m) => m.id === id);
    return user ? user.name : "Unknown";
  };

  const confirmSettlement = async () => {
    const num = parseFloat(settleAmount);
    if (isNaN(num) || num <= 0) return toast.error("Enter a valid amount");

    await addDoc(collection(db, "settlements"), {
      from: settleInfo.from,
      to: settleInfo.to,
      amount: num,
      date: new Date().toISOString(),
    });

    toast.success("Settlement recorded");
    setSettleInfo(null);
    setSettleAmount("");
    loadData();
  };

  // ⭐ NEW FUNCTION
  const addOutstanding = async () => {
    const amt = parseFloat(adjustAmount);

    if (!adjustFrom || !adjustTo) return toast.error("Select both members");
    if (adjustFrom === adjustTo) return toast.error("Cannot owe to same person");
    if (isNaN(amt) || amt <= 0) return toast.error("Enter valid amount");

    await addDoc(collection(db, "manual_adjustments"), {
      from: adjustFrom,
      to: adjustTo,
      amount: amt,
      date: new Date().toISOString(),
      note: "Manual outstanding balance",
    });

    toast.success("Outstanding balance added");
    setAdjustFrom("");
    setAdjustTo("");
    setAdjustAmount("");
    loadData();
  };

  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === "greeshma@housekeepingco.com";

  const filteredDebts =
    selectedMember === "all"
      ? debts
      : debts.filter((d) => d.from === selectedMember || d.to === selectedMember);

  return (
  <div className="card">
    <h2>💰 Financial Summary</h2>

    {loading ? (
      <div className="page-loader">
        <div className="spinner"></div>
        <p style={{ marginTop: "10px", color: "#6b7280" }}>
          Calculating balances...
        </p>
      </div>
    ) : (
      <>
        {/* ⭐ ADMIN — ADD OUTSTANDING */}
        {isAdmin && (
          <div style={{ marginBottom: "15px" }}>
            <h4>Add Outstanding Balance</h4>

            <select
              className="input"
              value={adjustFrom}
              onChange={(e) => setAdjustFrom(e.target.value)}
            >
              <option value="">Who Owes?</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <select
              className="input"
              value={adjustTo}
              onChange={(e) => setAdjustTo(e.target.value)}
            >
              <option value="">Who Receives?</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              className="input"
              placeholder="Amount"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
            />

            <button className="btn" onClick={addOutstanding}>
              Add Balance
            </button>
          </div>
        )}

        {/* FILTER */}
        <div style={{ marginBottom: "10px" }}>
          <select
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        {/* SUMMARY */}
        <div className="card" style={{ background: "#f9fafb" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3>📊 Total To Give / Receive</h3>
            <button
              className="btn small"
              onClick={() => setShowSummary(!showSummary)}
            >
              {showSummary ? "Hide" : "Show"}
            </button>
          </div>

          {showSummary && (
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Give (AED)</th>
                  <th>Receive (AED)</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(totals).map((id) => {
                  const give = totals[id]?.give || 0;
                  const receive = totals[id]?.receive || 0;
                  const net = receive - give;

                  return (
                    <tr key={id}>
                      <td>{getName(id)}</td>
                      <td className="give">{give.toFixed(2)}</td>
                      <td className="receive">{receive.toFixed(2)}</td>
                      <td className={net >= 0 ? "positive" : "negative"}>
                        {net.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* DEBTS */}
        <h3 style={{ marginTop: "20px" }}>💸 Who Owes Whom</h3>

        <select
          className="input"
          style={{ maxWidth: "220px", marginBottom: "10px" }}
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
        >
          <option value="all">All Members</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {filteredDebts.length === 0 ? (
          <p style={{ color: "#6b7280" }}>All settled 🎉</p>
        ) : (
          filteredDebts.map((d, i) => (
            <div key={i} className="row" style={{ padding: "6px 0" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  {new Date(d.date).toLocaleDateString()}
                </div>
                <span>
                  <b>{getName(d.from)}</b> owes <b>{getName(d.to)}</b>
                </span>
              </div>

              <span>
                <b>{d.amount.toFixed(2)}</b>
                <button
                  className="btn small"
                  disabled={!isAdmin}
                  style={{
                    opacity: isAdmin ? 1 : 0.5,
                    cursor: isAdmin ? "pointer" : "not-allowed",
                  }}
                  onClick={() => {
                    if (!isAdmin)
                      return toast.error("Only admin can settle payments");
                    setSettleInfo({ from: d.from, to: d.to });
                    setSettleAmount(d.amount.toFixed(2));
                  }}
                >
                  Settle
                </button>
              </span>
            </div>
          ))
        )}
      </>
    )}

    {/* SETTLEMENT MODAL */}
    {settleInfo && (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h4>Record Settlement</h4>
          <p>
            {getName(settleInfo.from)} paying {getName(settleInfo.to)}
          </p>

          <input
            type="number"
            className="input"
            value={settleAmount}
            onChange={(e) => setSettleAmount(e.target.value)}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button className="btn" onClick={() => setSettleInfo(null)}>
              Cancel
            </button>
            <button className="btn" onClick={confirmSettlement}>
              Confirm
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
