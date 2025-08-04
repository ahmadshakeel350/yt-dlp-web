import { NextResponse } from "next/server"
import { spawn } from "child_process"

export async function POST(request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    return new Promise((resolve) => {
      // Use yt-dlp to get available formats
      const ytdlpProcess = spawn("yt-dlp", [
        url,
        "--list-formats",
        "--no-playlist"
      ], {
        stdio: ["pipe", "pipe", "pipe"]
      })

      let output = ""
      let errorOutput = ""

      ytdlpProcess.stdout.on("data", (data) => {
        output += data.toString()
      })

      ytdlpProcess.stderr.on("data", (data) => {
        errorOutput += data.toString()
      })

      ytdlpProcess.on("close", (code) => {
        if (code === 0) {
          // Parse the output to extract format information
          const formats = parseFormats(output)
          resolve(NextResponse.json({ formats }))
        } else {
          resolve(NextResponse.json(
            { error: `Failed to get formats: ${errorOutput}` },
            { status: 500 }
          ))
        }
      })

      ytdlpProcess.on("error", (error) => {
        resolve(NextResponse.json(
          { error: `Process error: ${error.message}` },
          { status: 500 }
        ))
      })
    })
  } catch (error) {
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}

function parseFormats(output) {
  const lines = output.split("\n")
  const formats = []
  
  for (const line of lines) {
    // Skip header lines and empty lines
    if (line.includes("ID") || line.includes("--") || !line.trim()) {
      continue
    }
    
    // Parse format line (format: ID EXT RESOLUTION FPS FILESIZE TBR PROTO VCODEC VBR ACODEC ABR ASR MORE)
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 4) {
      const format = {
        id: parts[0],
        ext: parts[1],
        resolution: parts[2],
        fps: parts[3] || "N/A",
        filesize: parts[4] || "N/A",
        tbr: parts[5] || "N/A",
        protocol: parts[6] || "N/A",
        vcodec: parts[7] || "N/A",
        vbr: parts[8] || "N/A",
        acodec: parts[9] || "N/A",
        abr: parts[10] || "N/A",
        asr: parts[11] || "N/A",
        raw: line.trim()
      }
      
      // Only include video formats or audio-only formats
      if (format.vcodec !== "N/A" || format.acodec !== "N/A") {
        formats.push(format)
      }
    }
  }
  
  return formats
} 