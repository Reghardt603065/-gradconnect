export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/jobs/:path*",
    "/applications/:path*",
    "/certifications/:path*",
    "/hackathons/:path*",
    "/projects/:path*",
    "/portfolio/:path*",
    "/peers/:path*",
    "/messages/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};
