import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { PreferencesForm } from "@/components/preferences-form";
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const row = await prisma.notificationPreference.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id }, update: {} });
  const prefs = {
    newJobs: row.newJobs,
    applicationReminders: row.applicationReminders,
    certificationReminders: row.certificationReminders,
    peerUpdates: row.peerUpdates,
    hackathonReminders: row.hackathonReminders
  };
  return <>
    <PageHeader title="Settings" description="Manage your notification preferences." />
    <section className="grid"><PreferencesForm initial={prefs} /></section>
  </>;
}
