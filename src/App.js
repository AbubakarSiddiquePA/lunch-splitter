import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./auth";
import { toast, ToastContainer } from "react-toastify";

import TeamPage from "./pages/TeamPage";
import NewOrderPage from "./pages/NewOrderPage";
import HistoryPage from "./pages/HistoryPage";
import BalancesPage from "./pages/BalancesPage";
import LoginPage from "./LoginPage";

import "./App.css";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  const [page, setPage] = useState("team");
  const [user, setUser] = useState(null);
const [authLoading, setAuthLoading] = useState(true);
const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

useEffect(() => {
  const unsub = onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthLoading(false); // auth check finished
  });
  return () => unsub();
}, []);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
    } catch (err) {
      toast.error("Logout failed");
    }
  };
if (authLoading) {
  return (
    <div className="loader-screen">
      <div className="spinner"></div>
      <p>Loading your workspace...</p>
    </div>
  );
}

  // 🔒 Not logged in → show login page only
  if (!user) {
    return (
      <>
        <LoginPage />
        <ToastContainer position="top-right" autoClose={2500} />
      </>
    );
  }

  // ✅ Logged in → show app
  return (
    <div>
<div className="topbar">
  <h1>🍽 Office Lunch Splitter</h1>
<button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>
  Logout
</button>

</div>


      <div className="nav">
        <button
          className={page === "team" ? "nav-btn active" : "nav-btn"}
          onClick={() => setPage("team")}
        >
          Team
        </button>

        <button
          className={page === "order" ? "nav-btn active" : "nav-btn"}
          onClick={() => setPage("order")}
        >
          New Order
        </button>

        <button
          className={page === "history" ? "nav-btn active" : "nav-btn"}
          onClick={() => setPage("history")}
        >
          History
        </button>

        <button
          className={page === "balances" ? "nav-btn active" : "nav-btn"}
          onClick={() => setPage("balances")}
        >
          Balances
        </button>
      </div>

      <div className="container">
        {page === "team" && <TeamPage />}
        {page === "order" && <NewOrderPage />}
        {page === "history" && <HistoryPage />}
        {page === "balances" && <BalancesPage />}
      </div>
{showLogoutConfirm && (
  <div style={overlayStyle}>
    <div style={modalStyle}>
      <h4>Logout?</h4>
      <p>Are you sure you want to logout?</p>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button className="btn" onClick={() => setShowLogoutConfirm(false)}>
          Cancel
        </button>

        <button
          className="btn danger"
          onClick={async () => {
            await handleLogout();
            setShowLogoutConfirm(false);
          }}
        >
          Logout
        </button>
      </div>
    </div>
  </div>
)}

      <ToastContainer position="top-right" autoClose={2500} />
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
