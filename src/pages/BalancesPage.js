import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { toast } from "react-toastify";

export default function BalancesPage() {
  const [members, setMembers] = useState([]);
  const [debts, setDebts] = useState([]);
  const [totals, setTotals] = useState({});
  const [filter, setFilter] = useState("all");

  const [settleInfo, setSettleInfo] = useState(null); // { from, to, maxAmount }
  const [settleAmount, setSettleAmount] = useState("");

useEffect(() => {
  loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [filter]);



  const loadData = async () => {
    const ordersSnap = await getDocs(collection(db, "orders"));
    const membersSnap = await getDocs(collection(db, "members"));
    const settlementsSnap = await getDocs(collection(db, "settlements"));

    const membersList = membersSnap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    setMembers(membersList);

    const debtMap = {};
    const totalMap = {};

    membersList.forEach(m => {
      totalMap[m.id] = { give: 0, receive: 0 };
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // ORDERS
    ordersSnap.docs.forEach(doc => {
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

      order.participants.forEach(p => {
        if (p.userId !== payer) {
          const key = `${p.userId}-${payer}`;
          debtMap[key] = (debtMap[key] || 0) + p.amount;

          totalMap[p.userId].give += p.amount;
          totalMap[payer].receive += p.amount;
        }
      });
    });

    // SETTLEMENTS
    settlementsSnap.docs.forEach(doc => {
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
      debtMap[key] = (debtMap[key] || 0) - s.amount;

      totalMap[s.from].give -= s.amount;
      totalMap[s.to].receive -= s.amount;
    });

    const debtList = Object.entries(debtMap)
      .filter(([_, amt]) => amt > 0.01)
      .map(([key, amount]) => {
        const [from, to] = key.split("-");
        return { from, to, amount };
      });

    setDebts(debtList);
    setTotals(totalMap);
  };

  const getName = id => {
    const user = members.find(m => m.id === id);
    return user ? user.name : "Unknown";
  };

  const confirmSettlement = async () => {
    const num = parseFloat(settleAmount);

    if (isNaN(num) || num <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    try {
      await addDoc(collection(db, "settlements"), {
        from: settleInfo.from,
        to: settleInfo.to,
        amount: num,
        date: new Date().toISOString()
      });

      toast.success("Settlement recorded");
      setSettleInfo(null);
      setSettleAmount("");
      loadData();
    } catch (err) {
      toast.error("Failed to record settlement");
      console.error(err);
    }
  };

  return (
    <div className="card">
      <h2>💰 Financial Summary</h2>

      <div style={{ marginBottom: "10px" }}>
        <select
          className="input"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      <div className="card" style={{ background: "#f9fafb" }}>
        <h3>📊 Total To Give / Receive</h3>
        {Object.keys(totals).map(id => (
          <div key={id} className="row">
            <span>{getName(id)}</span>
            <span>
              Give: <b>{totals[id].give.toFixed(2)}</b> | Receive:{" "}
              <b>{totals[id].receive.toFixed(2)}</b>
            </span>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: "15px" }}>💸 Who Owes Whom</h3>

      {debts.length === 0 ? (
        <p style={{ color: "#6b7280" }}>All settled 🎉</p>
      ) : (
        debts.map((d, i) => (
          <div key={i} className="row" style={{ padding: "6px 0" }}>
            <span>
              <b>{getName(d.from)}</b> owes <b>{getName(d.to)}</b>
            </span>
            <span>
              <b>{d.amount.toFixed(2)}</b>
              <button
                className="btn small"
                onClick={() => {
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
