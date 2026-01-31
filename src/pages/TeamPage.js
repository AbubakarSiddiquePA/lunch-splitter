import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "firebase/firestore";

export default function TeamPage() {
  const [name, setName] = useState("");
  const [members, setMembers] = useState([]);

  const membersRef = collection(db, "members");

  const loadMembers = async () => {
    const data = await getDocs(membersRef);
    setMembers(data.docs.map(doc => ({ ...doc.data(), id: doc.id })));
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const addMember = async () => {
    if (!name.trim()) return;
    await addDoc(membersRef, { name });
    setName("");
    loadMembers();
  };

  const removeMember = async (id) => {
    if (!window.confirm("Remove this member?")) return;
    await deleteDoc(doc(db, "members", id));
    loadMembers();
  };

  return (
    <div className="card">
      <h2>👥 Team Members</h2>

      <div className="row" style={{ gap: "10px" }}>
        <input
          type="text"
          className="input"
          placeholder="Enter team member name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn" onClick={addMember} style={{ width: "120px" }}>
          Add
        </button>
      </div>

      <div style={{ marginTop: "15px" }}>
        {members.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No members added yet.</p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="row card" style={{ padding: "10px" }}>
              <span>{m.name}</span>
              <button
                className="btn danger small"
                onClick={() => removeMember(m.id)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
