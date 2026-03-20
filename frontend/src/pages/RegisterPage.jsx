import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import COUNTRIES from "../data/countries";

export function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", country: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register(form.name, form.email, form.password, form.country);
      navigate("/");
    } catch (err) {
      if (!err.response) {
        setError("Cannot reach server. Check backend URL/CORS and that the API is running.");
      } else {
        setError(err.response?.data?.message || "Registration failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <h1>Call.io</h1>
          <p>Anonymous calling & chat</p>
        </div>

        <h2>Create Account</h2>

        <input
          id="register-name"
          type="text"
          placeholder="Display name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <select
          id="register-country"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          required
        >
          <option value="">Select your country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.name}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>

        <input
          id="register-email"
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />

        <input
          id="register-password"
          type="password"
          placeholder="Password (min 6 characters)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={6}
          required
        />

        {error && <p className="error">{error}</p>}

        <button id="register-submit" className="btn btn-primary" disabled={submitting} type="submit">
          {submitting ? "Creating..." : "Create Account"}
        </button>

        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
