// Import Clerk's middleware helper for protecting routes
import { clerkMiddleware } from '@clerk/nextjs/server'

// Export the middleware so Next.js runs it on matched routes.
// This automatically checks authentication for protected pages.
export default clerkMiddleware()

// Configuration object that tells Next.js which routes the middleware applies to.
export const config = {
  matcher: [
     // -------------------------------------------
    // 1️----This pattern matches ALL routes EXCEPT:
    //    - Next.js internal routes (/_next/*)
    //    - Static files (html, css, js, images, fonts, documents, etc.)
    // 
    // Reason:
    // Clerk middleware should NOT run for static assets, 
    // otherwise it slows down your site unnecessarily.
    // -------------------------------------------
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',

     // -------------------------------------------
    // 2️----Always run Clerk middleware for:
    //     /api/* routes  
    //     /trpc/* routes
    //
    // This ensures ALL backend API requests go through Clerk 
    // authentication, so only logged-in users can access them.
    // -------------------------------------------
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}