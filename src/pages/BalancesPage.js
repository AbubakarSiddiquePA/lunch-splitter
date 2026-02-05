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
  const [showOutstanding, setShowOutstanding] = useState(false);
  const [settleAnchor, setSettleAnchor] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // * NEW STATES (only addition)
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
    const adjustmentsSnap = await getDocs(collection(db, "manual_adjustments")); // * NEW

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

    // ===== * MANUAL ADJUSTMENTS (NEW FEATURE ONLY) =====
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

  const formatName = (name) => {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const getName = (id) => {
    const user = members.find((m) => m.id === id);
    return user ? formatName(user.name) : "Unknown";
  };

  const confirmSettlement = async () => {
    const num = parseFloat(settleAmount);
    if (isNaN(num) || num <= 0) return toast.error("Enter a valid amount");
    if (settleInfo?.maxAmount != null && num > settleInfo.maxAmount) {
      return toast.error(
        `Cannot settle more than AED ${settleInfo.maxAmount.toFixed(2)}`,
      );
    }

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

  // * NEW FUNCTION
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
  const sortedDebts = [...filteredDebts].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(sortedDebts.length / itemsPerPage));
  const pageStartIndex = (currentPage - 1) * itemsPerPage;
  const pageEndIndex = pageStartIndex + itemsPerPage;
  const pagedDebts = sortedDebts.slice(pageStartIndex, pageEndIndex);
  const selectedMemberTotalOwe =
    selectedMember === "all"
      ? 0
      : debts
          .filter((d) => d.from === selectedMember)
          .reduce((sum, d) => sum + d.amount, 0);
  const selectedMemberTotalReceive =
    selectedMember === "all"
      ? 0
      : debts
          .filter((d) => d.to === selectedMember)
          .reduce((sum, d) => sum + d.amount, 0);
  const allOutstandingTotal = debts.reduce((sum, d) => sum + d.amount, 0);
  const allOutstandingCount = debts.length;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMember, filter]);

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
          <path d="M20 6H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm0 10H4V8h16ZM6 12h6v2H6Z" />
        </svg>
      </span>
      <span>Financial Summary</span>
    </h2>

    {loading ? (
      <div className="page-loader">
        <div className="spinner"></div>
        <p style={{ marginTop: "10px", color: "#6b7280" }}>
          Calculating balances...
        </p>
      </div>
    ) : (
      <>
        {/* * ADMIN - ADD OUTSTANDING */}
        {isAdmin && (
          <div style={{ marginBottom: "15px" }}>
            <button
              className="btn"
              onClick={() => setShowOutstanding(!showOutstanding)}
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
                margin: 0,
              }}
            >
              <span>Click Here Add Outstanding Balance</span>
              <span style={{ fontSize: "18px", lineHeight: 1 }}>
                {showOutstanding ? "−" : "+"}
              </span>
            </button>

            {showOutstanding && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  background: "#f9fafb",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <select
                  className="input"
                  style={{ flex: "1 1 160px", minWidth: "160px" }}
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
                  style={{ flex: "1 1 160px", minWidth: "160px" }}
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
                  style={{ flex: "1 1 140px", minWidth: "140px" }}
                  placeholder="Amount"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />

                <button
                  className="btn"
                  onClick={addOutstanding}
                  style={{ flex: "0 0 auto" }}
                >
                  Add Balance
                </button>
              </div>
            )}
          </div>
        )}

        {/* FILTER */}
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
            Filter balances by time period
          </div>
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
            <h3>Total To Give / Receive</h3>
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
        <h3 style={{ marginTop: "20px" }}>Who Owes Whom</h3>

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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            marginBottom: "8px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            {selectedMember === "all" ? (
              <>
                Showing all members. Total outstanding: AED{" "}
                {allOutstandingTotal.toFixed(2)} across {allOutstandingCount}{" "}
                {allOutstandingCount === 1 ? "entry" : "entries"}.
              </>
            ) : (
              <>
                <span style={{ color: "#b91c1c" }}>
                  {getName(selectedMember)} owes: AED{" "}
                  {selectedMemberTotalOwe.toFixed(2)}
                </span>
                {" · "}
                <span style={{ color: "#15803d" }}>
                  {getName(selectedMember)} receives: AED{" "}
                  {selectedMemberTotalReceive.toFixed(2)}
                </span>
              </>
            )}
          </div>
          {!isAdmin && (
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginLeft: "auto",
                marginRight: "6px",
              }}
            >
              Only admin can settle payments
            </div>
          )}
        </div>

        {filteredDebts.length === 0 ? (
          <p style={{ color: "#6b7280" }}>All settled</p>
        ) : (
          <table className="summary-table" style={{ marginTop: "6px" }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Amount (AED)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedDebts.map((d, i) => (
                <tr key={`${d.from}-${d.to}-${d.date}-${i}`}>
                  <td>{new Date(d.date).toLocaleDateString()}</td>
                  <td>{getName(d.from)}</td>
                  <td>{getName(d.to)}</td>
                  <td>
                    <b>{d.amount.toFixed(2)}</b>
                  </td>
                  <td>
                    <button
                      className="btn small"
                      disabled={!isAdmin}
                      style={{
                        opacity: isAdmin ? 1 : 0.5,
                        cursor: isAdmin ? "pointer" : "not-allowed",
                      }}
                      onClick={(e) => {
                        if (!isAdmin)
                          return toast.error("Only admin can settle payments");
                        setSettleInfo({
                          from: d.from,
                          to: d.to,
                          maxAmount: d.amount,
                        });
                        setSettleAmount(d.amount.toFixed(2));
                        const rect = e.currentTarget.getBoundingClientRect();
                        const panelWidth = 280;
                        const left = Math.min(
                          rect.left,
                          window.innerWidth - panelWidth - 12,
                        );
                        setSettleAnchor({
                          top: rect.bottom + 8,
                          left: Math.max(12, left),
                        });
                      }}
                    >
                      Settle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filteredDebts.length > itemsPerPage && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "10px",
            }}
          >
            <button
              className="btn small"
              disabled={currentPage === 1}
              style={{
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>

            <div style={{ fontSize: "12px", color: "#6b7280" }}>
              Page {currentPage} of {totalPages}
            </div>

            <button
              className="btn small"
              disabled={currentPage === totalPages}
              style={{
                opacity: currentPage === totalPages ? 0.5 : 1,
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
            >
              Next
            </button>
          </div>
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
            max={settleInfo?.maxAmount ?? undefined}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            <button
              className="btn"
              onClick={() => {
                setSettleInfo(null);
                setSettleAnchor(null);
              }}
            >
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


