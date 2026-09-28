"use client";

import { FormEvent, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

type AccountType = "GRADUATE" | "COMPANY" | "ADMIN";

const accountLabels: Record<AccountType, string> = {
  GRADUATE: "Graduate account",
  COMPANY: "Company account",
  ADMIN: "Admin account",
};

export function LoginForm() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("GRADUATE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Incorrect email or password.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/users/me");
    const body = await response.json();
    const role = body?.data?.role as AccountType | undefined;

    setLoading(false);

    if (!role) {
      await signOut({ redirect: false });
      setError("The account role could not be loaded. Please try again.");
      return;
    }

    if (role !== accountType) {
      await signOut({ redirect: false });
      setError(
        `This email is registered as ${accountLabels[role].toLowerCase()}. Choose ${accountLabels[role]}.`,
      );
      return;
    }

    if (role === "ADMIN") {
      router.push("/admin/hackathon-crawler");
    } else if (role === "COMPANY") {
      router.push("/dashboard/company");
    } else {
      router.push("/dashboard");
    }

    router.refresh();
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      {error && <div className="form-message error">{error}</div>}

      <div className="field">
        <label>Account type</label>

        <div
          className="grid"
          style={{
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <button
            type="button"
            className={`card account-choice ${
              accountType === "GRADUATE" ? "active" : ""
            }`}
            onClick={() => setAccountType("GRADUATE")}
            aria-pressed={accountType === "GRADUATE"}
          >
            <GraduationCap size={20} />
            <strong>Graduate account</strong>
            <span className="helper">
              Access your learning and career workspace.
            </span>
          </button>

          <button
            type="button"
            className={`card account-choice ${
              accountType === "COMPANY" ? "active" : ""
            }`}
            onClick={() => setAccountType("COMPANY")}
            aria-pressed={accountType === "COMPANY"}
          >
            <BriefcaseBusiness size={20} />
            <strong>Company account</strong>
            <span className="helper">
              Manage your company and project opportunities.
            </span>
          </button>

          <button
            type="button"
            className={`card account-choice ${
              accountType === "ADMIN" ? "active" : ""
            }`}
            onClick={() => setAccountType("ADMIN")}
            aria-pressed={accountType === "ADMIN"}
          >
            <ShieldCheck size={20} />
            <strong>Admin account</strong>
            <span className="helper">
              Review crawler targets and discovered hackathons.
            </span>
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email address"
          required
          autoComplete="email"
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          required
          autoComplete="current-password"
        />
      </div>

      <button
        className="btn btn-primary"
        type="submit"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Log in"}
      </button>
    </form>
  );
}
