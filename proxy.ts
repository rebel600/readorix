import { clerkMiddleware } from "@clerk/nextjs/server";

// Auth checks live in each protected page/route (resource-based), not here.
// clerkMiddleware() is still required for auth() to work downstream.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
