import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

const providers: any[] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: {
        label: "Email",
        type: "email",
      },
      password: {
        label: "Password",
        type: "password",
      },
    },
    async authorize(rawCredentials) {
      const parsed = loginSchema.safeParse(rawCredentials);

      if (!parsed.success) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: {
          email: parsed.data.email,
        },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const valid = await compare(
        parsed.data.password,
        user.passwordHash,
      );

      if (!valid) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      };
    },
  }),
];

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  );
}

async function findAvailableUsername(
  profile: unknown,
  name: string | null | undefined,
  email: string,
) {
  const githubProfile = profile as { login?: string } | undefined;
  const baseUsername = slugify(
    githubProfile?.login || name || email.split("@")[0],
  );

  const base = baseUsername || `graduate-${Date.now()}`;
  let username = base;
  let suffix = 1;

  while (
    await prisma.user.findFirst({
      where: {
        username,
        email: {
          not: email,
        },
      },
      select: {
        id: true,
      },
    })
  ) {
    username = `${base}-${suffix}`;
    suffix += 1;
  }

  return username;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 15 * 60,
    updateAge: 5 * 60,
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "github") {
        return true;
      }

      if (!user.email) {
        return false;
      }

      const username = await findAvailableUsername(
        profile,
        user.name,
        user.email,
      );
      const githubProfile = profile as { login?: string } | undefined;

      const saved = await prisma.user.upsert({
        where: {
          email: user.email,
        },
        update: {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          githubUsername: githubProfile?.login,
        },
        create: {
          email: user.email,
          name: user.name || username,
          username,
          image: user.image,
          githubUsername: githubProfile?.login,
          role: "GRADUATE",
          consentAcceptedAt: new Date(),
          notificationPreference: {
            create: {},
          },
        },
      });

      user.id = saved.id;
      (user as {
        role?: "GRADUATE" | "COMPANY" | "ADMIN";
      }).role = saved.role;

      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = (
          user as {
            role?: "GRADUATE" | "COMPANY" | "ADMIN";
          }
        ).role ?? "GRADUATE";
      }

      if ((!token.id || !token.role) && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: {
            email: token.email,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role ?? "GRADUATE";
      }

      return session;
    },
  },
});
