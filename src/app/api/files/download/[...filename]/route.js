import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request, { params }) {
  try {
    // Check authentication
    const authCookie = request.cookies.get("yt-dlp-auth")
    const isAuthenticated = authCookie?.value === "authenticated"
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { filename } = params
    const filePath = path.join(process.cwd(), "public", "downloads", ...filename)
    
    // Security check: ensure the file is within the downloads directory
    const downloadsDir = path.join(process.cwd(), "public", "downloads")
    const resolvedFilePath = path.resolve(filePath)
    const resolvedDownloadsDir = path.resolve(downloadsDir)
    
    if (!resolvedFilePath.startsWith(resolvedDownloadsDir)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    
    const fileBuffer = fs.readFileSync(filePath)
    const fileStats = fs.statSync(filePath)
    
    // Determine content type based on file extension
    const ext = path.extname(filePath).toLowerCase()
    let contentType = "application/octet-stream"
    
    if (ext === ".mp4" || ext === ".webm" || ext === ".avi" || ext === ".mkv") {
      contentType = `video/${ext.slice(1)}`
    } else if (ext === ".mp3" || ext === ".wav" || ext === ".flac") {
      contentType = `audio/${ext.slice(1)}`
    }
    
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStats.size.toString(),
        "Content-Disposition": `inline; filename="${encodeURIComponent(path.basename(filePath))}"`,
      },
    })
    
    return response
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to serve file: ${error.message}` },
      { status: 500 }
    )
  }
} 