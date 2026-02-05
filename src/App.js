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
            <span className="side-btn-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM8 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM16 13c-2.7 0-8 1.4-8 4v2h16v-2c0-2.6-5.3-4-8-4Zm-8 0c-.6 0-1.6.1-2.6.4A5.7 5.7 0 0 0 2 16.9V19h6v-2c0-1.4.6-2.6 1.6-3.6A8.7 8.7 0 0 0 8 13Z" />
              </svg>
            </span>
            <span>Team</span>
          </button>
          <button
            onClick={() => setPage("order")}
            className={page === "order" ? "side-btn active" : "side-btn"}
          >
            <span className="side-btn-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Zm0 2.4L18.6 10H14ZM8 13h8v2H8Zm0 4h8v2H8Zm0-8h4v2H8Z" />
              </svg>
            </span>
            <span>New Order</span>
          </button>
          <button
            onClick={() => setPage("history")}
            className={page === "history" ? "side-btn active" : "side-btn"}
          >
            <span className="side-btn-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path d="M13 3a9 9 0 1 0 8.5 6h-2.2A7 7 0 1 1 13 5v3l4-4-4-4Zm-1 5h2v6h-6v-2h4Z" />
              </svg>
            </span>
            <span>History</span>
          </button>
          <button
            onClick={() => setPage("balances")}
            className={page === "balances" ? "side-btn active" : "side-btn"}
          >
            <span className="side-btn-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path d="M20 6H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm0 10H4V8h16ZM6 12h6v2H6Z" />
              </svg>
            </span>
            <span>Financial Summary</span>
          </button>

          <hr />

          <button className="side-btn" onClick={() => setShowMenuModal(true)}>
            <span className="side-btn-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path d="M7 2h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V4a2 2 0 0 1 2-2Zm1 6h8v2H8Zm0 4h8v2H8Zm0-8h8v2H8Z" />
              </svg>
            </span>
            <span>View Menu</span>
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
