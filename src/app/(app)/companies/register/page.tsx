import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCompanyForUser } from "@/services/project-service";
import { PageHeader } from "@/components/page-header";
import { CompanyForm } from "@/components/company-form";

export default async function CompanyRegisterPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "COMPANY") redirect("/projects");
  const company = await getCompanyForUser(session.user.id);
  return <>
    <PageHeader
      title="Company profile"
      description="Register the company identity students will see when browsing your project opportunities." />
    <CompanyForm initial={company} />
  </>;
}
