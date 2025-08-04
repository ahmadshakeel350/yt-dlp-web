import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      )
    }

    // Read credentials from JSON file
    const authPath = path.join(process.cwd(), "src", "app", "auth.json")
    const authData = JSON.parse(fs.readFileSync(authPath, "utf8"))

    // Check credentials
    if (username === authData.username && password === authData.password) {
      // Set a simple session cookie (in production, use proper JWT tokens)
      const response = NextResponse.json({ success: true })
      response.cookies.set("yt-dlp-auth", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      return response
    } else {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Authentication error: ${error.message}` },
      { status: 500 }
    )
  }
} 