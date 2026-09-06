import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ProfileEditor } from "@/components/profile-editor";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      headline: true,
      bio: true,
      location: true,
      skills: true,
      githubUsername: true,
      linkedinUrl: true,
      image: true,
      profileImage: {
        select: {
          id: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const uploadedImageUrl = user.profileImage
    ? `/api/profile-images/${user.id}?v=${user.profileImage.updatedAt.getTime()}`
    : null;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Manage your professional profile."
      />

      <ProfileEditor
        initial={{
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          headline: user.headline,
          bio: user.bio,
          location: user.location,
          skills: user.skills,
          githubUsername: user.githubUsername,
          linkedinUrl: user.linkedinUrl,
          image: user.image,
        }}
        uploadedImageUrl={uploadedImageUrl}
      />
    </>
  );
}
