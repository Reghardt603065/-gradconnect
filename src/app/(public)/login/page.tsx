import Link from "next/link";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <section className="auth-card">
      <h2>Welcome back</h2>
      <p>Log in to continue building your career momentum.</p>

      <LoginForm />

      <p style={{ textAlign: "center", marginTop: 20 }}>
        New here?{" "}
        <Link className="link" href="/register">
          Create an account
        </Link>
      </p>
    </section>
  );
}
