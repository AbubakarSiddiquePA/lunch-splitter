import { useState } from "react";
import { login, signup, resetPassword } from "./auth";
import { toast } from "react-toastify";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    let newErrors = {};

    if (!email) newErrors.email = true;
    if (!password) newErrors.password = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.warning("Please fill all required fields");
      return;
    }

    try {
      if (isSignup) {
        await signup(email, password);
        toast.success("Account created!");
      } else {
        await login(email, password);
        toast.success("Logged in!");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReset = async () => {
    if (!email) {
      toast.warning("Enter your email first");
      return;
    }
    await resetPassword(email);
    toast.success("Password reset email sent");
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={{ marginBottom: 10 }}>🍽 Office Lunch Splitter</h2>
        <p style={{ color: "#6b7280", marginBottom: 20 }}>
          {isSignup ? "Create your account" : "Login to continue"}
        </p>

        <input
          style={{
            ...inputStyle,
            border: errors.email ? "1px solid #ef4444" : "1px solid #d1d5db",
          }}
          placeholder="Email address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors({ ...errors, email: false });
          }}
        />

        <input
          type="password"
          style={{
            ...inputStyle,
            border: errors.password ? "1px solid #ef4444" : "1px solid #d1d5db",
          }}
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors({ ...errors, password: false });
          }}
        />

        <button style={primaryBtn} onClick={handleSubmit}>
          {isSignup ? "Create Account" : "Login"}
        </button>

        <div style={{ marginTop: 15, textAlign: "center" }}>
          <button style={linkBtn} onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? "Already have an account? Login" : "Create new account"}
          </button>
        </div>

        {!isSignup && (
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button style={linkBtn} onClick={handleReset}>
              Forgot Password?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "16px",
  background: "linear-gradient(135deg, #f3f4f6, #e5e7eb)",
};

const cardStyle = {
  background: "white",
  padding: "clamp(20px, 4vw, 35px)",
  borderRadius: "12px",
  width: "100%",
  maxWidth: "380px",
  boxSizing: "border-box",
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  textAlign: "center",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  outline: "none",
};

const primaryBtn = {
  width: "100%",
  padding: "12px",
  background: "#f97316",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
};

const linkBtn = {
  background: "none",
  border: "none",
  color: "#f97316",
  cursor: "pointer",
  fontSize: "14px",
};
