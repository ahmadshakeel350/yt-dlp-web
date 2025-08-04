import { NextResponse } from "next/server"

export function middleware(request) {
  // Check if user is authenticated
  const authCookie = request.cookies.get("yt-dlp-auth")
  const isAuthenticated = authCookie?.value === "authenticated"
  
  // Get the pathname
  const { pathname } = request.nextUrl
  
  // Public paths that don't require authentication
  const publicPaths = ["/login", "/api/auth/login"]
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  
  // Protected file paths that require authentication
  const protectedFilePaths = ["/downloads/", "/thumbnails/"]
  const isProtectedFile = protectedFilePaths.some(path => pathname.startsWith(path))
  
  // If user is not authenticated and trying to access protected route or files
  if (!isAuthenticated && (!isPublicPath || isProtectedFile)) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  
  // If user is authenticated and trying to access login page
  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
} 