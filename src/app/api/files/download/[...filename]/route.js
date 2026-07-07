import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { Readable } from "stream"

const MIME_TYPES = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".flv": "video/x-flv",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || "application/octet-stream"
}

export async function GET(request, { params }) {
  try {
    const authCookie = request.cookies.get("yt-dlp-auth")
    if (authCookie?.value !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { filename: filenameParts } = await params
    const filename = Array.isArray(filenameParts)
      ? filenameParts.map(decodeURIComponent).join("/")
      : decodeURIComponent(filenameParts || "")

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    const downloadsDir = path.join(process.cwd(), "public", "downloads")
    const filePath = path.join(downloadsDir, filename)

    const resolvedFilePath = path.resolve(filePath)
    const resolvedDownloadsDir = path.resolve(downloadsDir)

    if (!resolvedFilePath.startsWith(resolvedDownloadsDir + path.sep) &&
        resolvedFilePath !== resolvedDownloadsDir) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const fileStats = fs.statSync(filePath)
    const basename = path.basename(filePath)
    const contentType = getContentType(filePath)

    const nodeStream = fs.createReadStream(filePath)
    const webStream = Readable.toWeb(nodeStream)

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStats.size.toString(),
        "Content-Disposition": `attachment; filename="${basename.replace(/"/g, '\\"')}"; filename*=UTF-8''${encodeURIComponent(basename)}`,
        "Cache-Control": "private, no-cache",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to serve file: ${error.message}` },
      { status: 500 }
    )
  }
}
