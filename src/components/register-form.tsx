"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type AccountType = "GRADUATE" | "COMPANY";

export function RegisterForm() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("GRADUATE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);

    if (form.get("password") !== form.get("confirm")) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const payload = {
      accountType,
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      skills: accountType === "GRADUATE"
        ? String(form.get("skills") || "").split(",").map((v) => v.trim()).filter(Boolean)
        : [],
      companyName: accountType === "COMPANY" ? form.get("companyName") : "",
      companyEmail: accountType === "COMPANY" ? form.get("companyEmail") : "",
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "Registration failed.");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });
      setLoading(false);
      if (result?.error) {
        router.push("/login");
        return;
      }
      router.push(accountType === "COMPANY" ? "/dashboard/company" : "/dashboard");
      router.refresh();
    } catch {
      setError("Registration failed.");
      setLoading(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      {error && <div className="form-message error">{error}</div>}
      <div className="field">
        <label>Account type</label>
        <div className="grid grid-2" style={{ gap: 10 }}>
          <button
            type="button"
            className={`card ${accountType === "GRADUATE" ? "account-choice active" : "account-choice"}`}
            onClick={() => setAccountType("GRADUATE")}
            aria-pressed={accountType === "GRADUATE"}>
            <strong>Graduate account</strong>
            <span className="helper">Track learning, applications, projects and career progress.</span>
          </button>
          <button
            type="button"
            className={`card ${accountType === "COMPANY" ? "account-choice active" : "account-choice"}`}
            onClick={() => setAccountType("COMPANY")}
            aria-pressed={accountType === "COMPANY"}>
            <strong>Company account</strong>
            <span className="helper">Create a company profile and post real-world project opportunities.</span>
          </button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="name">{accountType === "COMPANY" ? "Contact person" : "Full name"}</label>
        <input className="input" id="name" name="name" required minLength={2} />
      </div>
      <div className="field">
        <label htmlFor="email">Login email address</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      {accountType === "COMPANY" && (
        <div className="form-row">
          <div className="field">
            <label htmlFor="companyName">Company name</label>
            <input className="input" id="companyName" name="companyName" required />
          </div>
          <div className="field">
            <label htmlFor="companyEmail">Company contact email</label>
            <input className="input" id="companyEmail" name="companyEmail" type="email" required />
          </div>
        </div>
      )}
      <div className="form-row">
        <div className="field">
          <label htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" minLength={8} required />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input className="input" id="confirm" name="confirm" type="password" minLength={8} required />
        </div>
      </div>
      {accountType === "GRADUATE" && <div className="field">
        <label htmlFor="skills">Primary skills</label>
        <input className="input" id="skills" name="skills" placeholder="JavaScript, SQL, React" />
        <span className="helper">Separate skills with commas.</span>
      </div>}
      <button className="btn btn-primary" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
