import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(request) {
  try {
    // Check authentication
    const authCookie = request.cookies.get("yt-dlp-auth")
    const isAuthenticated = authCookie?.value === "authenticated"
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { filename } = await request.json()

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    const downloadsDir = path.join(process.cwd(), "public", "downloads")
    const thumbnailsDir = path.join(process.cwd(), "public", "thumbnails")
    const filePath = path.join(downloadsDir, filename)

    // Security check: ensure the file is within the downloads directory
    const normalizedFilePath = path.normalize(filePath)
    const normalizedDownloadsDir = path.normalize(downloadsDir)
    
    if (!normalizedFilePath.startsWith(normalizedDownloadsDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Delete the main file
    fs.unlinkSync(filePath)

    // Also try to delete the thumbnail if it exists in thumbnails directory
    const fileInfo = path.parse(filename)
    const thumbnailPath = path.join(thumbnailsDir, `${fileInfo.name}_thumb.jpg`)
    
    if (fs.existsSync(thumbnailPath)) {
      try {
        fs.unlinkSync(thumbnailPath)
      } catch (error) {
        // Ignore thumbnail deletion errors
        console.log("Failed to delete thumbnail:", error.message)
      }
    }

    return NextResponse.json({ success: true, message: "File deleted successfully" })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to delete file: ${error.message}` },
      { status: 500 }
    )
  }
} 