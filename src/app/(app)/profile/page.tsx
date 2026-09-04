import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ProfileEditor } from "@/components/profile-editor";
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      username: true,
      headline: true,
      bio: true,
      location: true,
      skills: true,
      githubUsername: true,
      linkedinUrl: true,
      image: true
    }
  });
  if (!user) redirect('/login');
  return <><PageHeader title="Profile" description="Manage your professional profile." /><ProfileEditor initial={user} /></>;
}
