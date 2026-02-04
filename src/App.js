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
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, []);

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
  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <h1>🍽 Office Lunch Splitter</h1>
          <p>Making team lunches simple & fair</p>
        </div>
      </div>
    );
  }

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
    <div className="app-layout">
      {/* TOP BAR */}
<div className="topbar">
  <h1>🍽 Office Lunch Splitter</h1>

  <div className="topbar-right">
    <div className="profile-box">
      <div className="avatar">
        {user?.email?.charAt(0).toUpperCase()}
      </div>
      <span className="profile-email">{user?.email}</span>
    </div>

    <button
      className="logout-btn"
      onClick={() => setShowLogoutConfirm(true)}
    >
      Logout
    </button>
  </div>
</div>


      {/* BODY AREA */}
      <div className="body-area">
        {/* LEFT SIDEBAR */}
        <div className="sidebar">
          <h3 className="menu-title">MENU</h3>

          <button
            onClick={() => setPage("team")}
            className={page === "team" ? "side-btn active" : "side-btn"}
          >
            👥 Team
          </button>
          <button
            onClick={() => setPage("order")}
            className={page === "order" ? "side-btn active" : "side-btn"}
          >
            📝 New Order
          </button>
          <button
            onClick={() => setPage("history")}
            className={page === "history" ? "side-btn active" : "side-btn"}
          >
            📜 History
          </button>
          <button
            onClick={() => setPage("balances")}
            className={page === "balances" ? "side-btn active" : "side-btn"}
          >
            💰 Balances
          </button>

          <hr />

          <button className="side-btn" onClick={() => setShowMenuModal(true)}>
            📋 View Menu
          </button>
          {/* <button className="side-btn">⬇ Download Menu</button> */}
        </div>

        {/* PAGE CONTENT */}
        <div className="main-content">
          {page === "team" && <TeamPage />}
          {page === "order" && <NewOrderPage />}
          {page === "history" && <HistoryPage />}
          {page === "balances" && <BalancesPage />}
        </div>
      </div>
      {showMenuModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginBottom: "10px" }}>📖 Restaurant Menus</h3>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <button
                className="btn"
                onClick={() =>
                  window.open(
                    "https://www.zomato.com/dubai/five-crowns-restaurant-al-barsha/menu",
                    "_blank",
                  )
                }
              >
                🍗 Five Crown Menu
              </button>

              <button
                className="btn"
                onClick={() => window.open("/menus/kingcheff.pdf", "_blank")}
              >
                👑 King Chef Menu
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "18px",
                borderTop: "1px solid #eee",
                paddingTop: "12px",
              }}
            >
              <button
                className="btn small"
                style={{ background: "#e5e7eb", color: "#111827" }}
                onClick={() => setShowMenuModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Logout?</h3>
            <p className="modal-text">Are you sure you want to logout?</p>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>

              <button
                className="btn-danger"
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
  borderRadius: "12px",
  width: "320px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};
