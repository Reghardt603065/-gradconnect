"use client";

import { FormEvent, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  GraduationCap,
} from "lucide-react";

type AccountType = "GRADUATE" | "COMPANY";

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
    const role = body?.data?.role;

    setLoading(false);

    if (role !== accountType) {
      await signOut({
        redirect: false,
      });

      setError(
        accountType === "COMPANY"
          ? "This email is registered as a graduate account. Choose Graduate account."
          : "This email is registered as a company account. Choose Company account.",
      );
      return;
    }

    router.push(
      role === "COMPANY"
        ? "/dashboard/company"
        : "/dashboard",
    );
    router.refresh();
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      {error && <div className="form-message error">{error}</div>}

      <div className="field">
        <label>Account type</label>

        <div className="grid grid-2" style={{ gap: 10 }}>
          <button
            type="button"
            className={`card account-choice ${
              accountType === "GRADUATE"
                ? "active"
                : ""
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
              accountType === "COMPANY"
                ? "active"
                : ""
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
