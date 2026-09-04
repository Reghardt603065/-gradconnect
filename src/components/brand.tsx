import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function Brand({ href = "/" }: { href?: string; }) {
  return <Link className="brand" href={href}>
    <span className="brand-mark"><GraduationCap size={23} /></span>
    <span>Grad<strong>Connect</strong></span>
  </Link>;
}
