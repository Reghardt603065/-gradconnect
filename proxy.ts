export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/jobs/:path*",
    "/applications/:path*",
    "/certifications/:path*",
    "/hackathons/:path*",
    "/teams/:path*",
    "/growth/:path*",
    "/projects/:path*",
    "/portfolio/:path*",
    "/friends/:path*",
    "/peers/:path*",
    "/messages/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};
