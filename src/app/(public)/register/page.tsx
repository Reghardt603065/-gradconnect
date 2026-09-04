import Link from "next/link";
import { RegisterForm } from "@/components/register-form";
export default function RegisterPage() {
  return <section className="auth-card">
    <h2>Create your account</h2>
    <p>Join GradConnect and start building practical proof of readiness.</p>
    <RegisterForm />
    <p style={{ textAlign: 'center', marginTop: 20 }}>Already registered? <Link className="link" href="/login">Log in</Link></p>
  </section>;
}
