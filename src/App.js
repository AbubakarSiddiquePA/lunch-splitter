import { useState } from "react";
import TeamPage from "./pages/TeamPage";
import NewOrderPage from "./pages/NewOrderPage";
import HistoryPage from "./pages/HistoryPage";
import BalancesPage from "./pages/BalancesPage";
import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  const [page, setPage] = useState("team");

  return (
    <div>
  <h1>🍽 Office Lunch Splitter</h1>

  <div className="nav">
    <button onClick={() => setPage("team")}>Team</button>
    <button onClick={() => setPage("order")}>New Order</button>
    <button onClick={() => setPage("history")}>History</button>
    <button onClick={() => setPage("balances")}>Balances</button>
  </div>

  <div className="container">
    {page === "team" && <TeamPage />}
    {page === "order" && <NewOrderPage />}
    {page === "history" && <HistoryPage />}
    {page === "balances" && <BalancesPage />}
  </div>
    <ToastContainer position="top-right" autoClose={2500} />

</div>

  );
}
