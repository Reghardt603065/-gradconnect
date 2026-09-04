import Link from "next/link";
import { Brand } from "@/components/brand";

export default function PublicAuthLayout({ children }: { children: React.ReactNode; }) {
  return <div className="auth-shell">
    <aside className="auth-aside">
      <Brand />
      <div>
        <p className="eyebrow" style={{ color: '#dfc77d' }}>Graduate career platform</p>
        <h1>Your IT career does not stop at graduation.</h1>
        <p>Keep your skills active, discover opportunities, build evidence and collaborate with graduates who are on the same journey.</p>
      </div>
      <p>Back to <Link className="link" style={{ color: '#fff' }} href="/">GradConnect home</Link></p>
    </aside>
    <main className="auth-main">{children}</main>
  </div>;
}
