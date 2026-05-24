import { withAuth } from "next-auth/middleware";

export const proxy = withAuth();

export const config = {
  matcher: [
    "/((?!api/auth|login|register|_next/static|_next/image|favicon.ico).*)",
  ],
};
