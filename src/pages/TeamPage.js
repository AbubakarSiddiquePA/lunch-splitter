import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { toast } from "react-toastify";

export default function TeamPage() {
  const [name, setName] = useState("");
  const [members, setMembers] = useState([]);
  const [confirmId, setConfirmId] = useState(null);

  const membersRef = collection(db, "members");
  const [nameError, setNameError] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMembers = async () => {
    setLoading(true);
    const data = await getDocs(membersRef);
    setMembers(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      setLoading(false);

  };

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMember = async () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setNameError(true);
      toast.warning("Please enter a name");
      return;
    }
    setNameError(false); // remove red if valid
    const exists = members.some(
      (m) => m.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (exists) {
      toast.error("Member already exists");
      return;
    }

    try {
      await addDoc(membersRef, { name: trimmed });
      toast.success("Member added");
      setName("");
      loadMembers();
    } catch (err) {
      toast.error("Failed to add member");
      console.error(err);
    }
  };

  const confirmRemove = async () => {
    try {
      await deleteDoc(doc(db, "members", confirmId));
      toast.success("Member removed");
      setConfirmId(null);
      loadMembers();
    } catch (err) {
      toast.error("Failed to remove member");
      console.error(err);
    }
  };

  const canRemoveMember = async (memberId) => {
    const ordersSnap = await getDocs(collection(db, "orders"));
    const settlementsSnap = await getDocs(collection(db, "settlements"));

    let give = 0;
    let receive = 0;

    // Check orders
    ordersSnap.forEach((doc) => {
      const order = doc.data();
      const payer = order.paidBy;

      order.participants.forEach((p) => {
        if (p.userId === memberId && memberId !== payer) {
          give += p.amount;
        }
        if (payer === memberId && p.userId !== memberId) {
          receive += p.amount;
        }
      });
    });

    // Subtract settlements
    settlementsSnap.forEach((doc) => {
      const s = doc.data();
      if (s.from === memberId) give -= s.amount;
      if (s.to === memberId) receive -= s.amount;
    });

    return give <= 0.01 && receive <= 0.01;
  };

  return (
    <div className="card">
      <h2>👥 Team Members</h2>

      <div className="row" style={{ gap: "10px" }}>
        <input
          type="text"
          className={`input ${nameError ? "input-error" : ""}`}
          placeholder="Enter team member name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setNameError(false); // remove red while typing
          }}
        />
        <button className="btn" onClick={addMember} style={{ width: "120px" }}>
          Add
        </button>
      </div>
     
     {loading ? (
  <div className="page-loader">
    <div className="spinner"></div>
  </div>
) : (
  <div style={{ marginTop: "15px" }}>
    {members.length === 0 ? (
      <p style={{ color: "#6b7280" }}>No members added yet.</p>
    ) : (
      members.map((m) => (
        <div key={m.id} className="row card" style={{ padding: "10px" }}>
          <span>{m.name}</span>
          <button
            className="btn danger small"
            onClick={async () => {
              const allowed = await canRemoveMember(m.id);
              if (!allowed) {
                toast.error("Settle all balances before removing this member");
                return;
              }
              setConfirmId(m.id);
            }}
          >
            Remove
          </button>
        </div>
      ))
    )}
  </div>
)}


      {confirmId && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h4>Remove Member?</h4>
            <p>This action cannot be undone.</p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button className="btn" onClick={() => setConfirmId(null)}>
                Cancel
              </button>
              <button className="btn danger" onClick={confirmRemove}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 👇 Styles MUST be outside the component

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
