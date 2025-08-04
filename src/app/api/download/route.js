import { NextResponse } from "next/server"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"

export async function POST(request) {
  try {
    const { url, format, downloadPath } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Create downloads directory if it doesn't exist
    const downloadsDir = path.join(process.cwd(), "public", "downloads")
    const customPath = downloadPath ? path.join(downloadsDir, downloadPath) : downloadsDir
    
    if (!fs.existsSync(customPath)) {
      fs.mkdirSync(customPath, { recursive: true })
    }

    return new Promise((resolve) => {
      const encoder = new TextEncoder()

      const stream = new ReadableStream({
        start(controller) {
          // Handle request abort
          request.signal.addEventListener('abort', () => {
            if (ytdlpProcess) {
              ytdlpProcess.kill('SIGTERM')
            }
          })

          let ytdlpProcess
          let lastProgressLine = ""
          let lastProgress = 0
          let heartbeatInterval

          try {
            // Build yt-dlp arguments
            const args = [
              url,
              "--no-playlist",
              "-o", path.join(customPath, "%(title)s.%(ext)s"),
              "--merge-output-format", "mp4"
            ]

            // Add format selection if specified
            if (format && format !== "bestvideo+bestaudio") {
              args.push("-f", format)
            } else if (format === "bestvideo+bestaudio") {
              args.push("-f", "bestvideo+bestaudio")
            }

            ytdlpProcess = spawn("yt-dlp", args, {
              stdio: ["pipe", "pipe", "pipe"]
            })

            // Start heartbeat to ensure stream is working
            heartbeatInterval = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: "log",
                  message: "Heartbeat: Stream is alive"
                }) + "\n"))
              } catch (e) {
                // Stream might be closed
              }
            }, 5000) // Send heartbeat every 5 seconds

            // Send initial message
            try {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: "log",
                message: "Starting download process..."
              }) + "\n"))
            } catch (e) {
              // Stream might be closed
            }

            ytdlpProcess.stdout.on("data", (data) => {
              const output = data.toString()
              const lines = output.split("\n")

              for (const line of lines) {
                if (line.trim()) {
                  // Parse progress from various yt-dlp output formats
                  let progress = null
                  
                  // Format 1: "PROGRESS:123456/789012"
                  if (line.startsWith("PROGRESS:")) {
                    const match = line.match(/PROGRESS:(\d+)\/(\d+)/)
                    if (match) {
                      const downloaded = parseInt(match[1])
                      const total = parseInt(match[2])
                      progress = total > 0 ? Math.round((downloaded / total) * 100) : 0
                    }
                  }
                  // Format 2: "123456/789012"
                  else if (line.match(/^\d+\/\d+$/)) {
                    const [downloaded, total] = line.split('/').map(Number)
                    progress = total > 0 ? Math.round((downloaded / total) * 100) : 0
                  }
                  // Format 3: "[download] 45.2% of ~123.45MiB" (current yt-dlp format)
                  else if (line.includes("[download]") && line.includes("%")) {
                    const match = line.match(/(\d+\.?\d*)%/)
                    if (match) {
                      progress = Math.round(parseFloat(match[1]))
                    }
                  }
                  // Format 4: "Downloading 45% of ~123.45MiB"
                  else if (line.includes("Downloading") && line.includes("%")) {
                    const match = line.match(/(\d+)%/)
                    if (match) {
                      progress = parseInt(match[1])
                    }
                  }
                  // Format 5: "45.2% of ~123.45MiB" (without [download] prefix)
                  else if (line.includes("%") && line.includes("of") && !line.includes("[download]")) {
                    const match = line.match(/(\d+\.?\d*)%/)
                    if (match) {
                      progress = Math.round(parseFloat(match[1]))
                    }
                  }

                  if (progress !== null && progress >= 0 && progress <= 100 && progress !== lastProgress) {
                    try {
                      controller.enqueue(encoder.encode(JSON.stringify({
                        type: "progress",
                        progress,
                        status: `Downloading... ${progress}%`
                      }) + "\n"))
                    } catch (e) {
                      // Stream might be closed
                    }
                    lastProgress = progress
                  }
                  
                  // Always send download progress lines as logs
                  if (line.includes("[download]")) {
                    try {
                      controller.enqueue(encoder.encode(JSON.stringify({
                        type: "log",
                        message: line
                      }) + "\n"))
                    } catch (e) {
                      // Stream might be closed
                    }
                  } else if (line.trim() && !line.includes("WARNING") && !line.includes("ERROR")) {
                    // Send other output as log messages (excluding warnings/errors)
                    try {
                      controller.enqueue(encoder.encode(JSON.stringify({
                        type: "log",
                        message: line
                      }) + "\n"))
                    } catch (e) {
                      // Stream might be closed
                    }
                  }
                }
              }
            })

            ytdlpProcess.stderr.on("data", (data) => {
              const errorOutput = data.toString()
              const lines = errorOutput.split("\n")

              for (const line of lines) {
                if (line.trim()) {
                  // Parse progress from stderr as well
                  let progress = null
                  
                  // Format 1: "PROGRESS:123456/789012"
                  if (line.startsWith("PROGRESS:")) {
                    const match = line.match(/PROGRESS:(\d+)\/(\d+)/)
                    if (match) {
                      const downloaded = parseInt(match[1])
                      const total = parseInt(match[2])
                      progress = total > 0 ? Math.round((downloaded / total) * 100) : 0
                    }
                  }
                  // Format 2: "123456/789012"
                  else if (line.match(/^\d+\/\d+$/)) {
                    const [downloaded, total] = line.split('/').map(Number)
                    progress = total > 0 ? Math.round((downloaded / total) * 100) : 0
                  }
                  // Format 3: "[download] 45.2% of ~123.45MiB" (current yt-dlp format)
                  else if (line.includes("[download]") && line.includes("%")) {
                    const match = line.match(/(\d+\.?\d*)%/)
                    if (match) {
                      progress = Math.round(parseFloat(match[1]))
                    }
                  }
                  // Format 4: "Downloading 45% of ~123.45MiB"
                  else if (line.includes("Downloading") && line.includes("%")) {
                    const match = line.match(/(\d+)%/)
                    if (match) {
                      progress = parseInt(match[1])
                    }
                  }
                  // Format 5: "45.2% of ~123.45MiB" (without [download] prefix)
                  else if (line.includes("%") && line.includes("of") && !line.includes("[download]")) {
                    const match = line.match(/(\d+\.?\d*)%/)
                    if (match) {
                      progress = Math.round(parseFloat(match[1]))
                    }
                  }

                  if (progress !== null && progress >= 0 && progress <= 100 && progress !== lastProgress) {
                    try {
                      controller.enqueue(encoder.encode(JSON.stringify({
                        type: "progress",
                        progress,
                        status: `Downloading... ${progress}%`
                      }) + "\n"))
                    } catch (e) {
                      // Stream might be closed
                    }
                    lastProgress = progress
                  }
                  
                  // Always send download progress lines as logs
                  if (line.includes("[download]")) {
                    try {
                      controller.enqueue(encoder.encode(JSON.stringify({
                        type: "log",
                        message: line
                      }) + "\n"))
                    } catch (e) {
                      // Stream might be closed
                    }
                  } else if (line.trim() && !line.includes("WARNING") && !line.includes("ERROR")) {
                    // Send other output as log messages (excluding warnings/errors)
                    try {
                      controller.enqueue(encoder.encode(JSON.stringify({
                        type: "log",
                        message: line
                      }) + "\n"))
                    } catch (e) {
                      // Stream might be closed
                    }
                  }
                }
              }
            })

            ytdlpProcess.on("close", async (code) => {
              // Clear heartbeat interval
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval)
              }
              
              if (code === 0) {
                try {
                  controller.enqueue(encoder.encode(JSON.stringify({
                    type: "log",
                    message: "Download completed successfully!"
                  }) + "\n"))

                  // Generate thumbnail using ffmpeg
                  const files = fs.readdirSync(customPath)
                  const videoFiles = files.filter(file => 
                    file.match(/\.(mp4|webm|mkv|avi|mov|flv)$/i)
                  )

                  if (videoFiles.length > 0) {
                    const videoFile = videoFiles[0] // Use the first video file
                    const videoPath = path.join(customPath, videoFile)
                    
                    // Create thumbnails directory if it doesn't exist
                    const thumbnailsDir = path.join(process.cwd(), "public", "thumbnails")
                    if (!fs.existsSync(thumbnailsDir)) {
                      fs.mkdirSync(thumbnailsDir, { recursive: true })
                    }
                    
                    const thumbnailPath = path.join(thumbnailsDir, `${path.parse(videoFile).name}_thumb.jpg`)

                    // Generate thumbnail at 5 seconds into the video
                    const ffmpegProcess = spawn("ffmpeg", [
                      "-i", videoPath,
                      "-ss", "00:00:05",
                      "-vframes", "1",
                      "-q:v", "2",
                      thumbnailPath,
                      "-y" // Overwrite if exists
                    ])

                    ffmpegProcess.on("close", (ffmpegCode) => {
                      try {
                        controller.enqueue(encoder.encode(JSON.stringify({
                          type: "complete",
                          message: "Download and thumbnail generation completed!"
                        }) + "\n"))
                        controller.close()
                      } catch (e) {
                        // Stream might be closed
                      }
                    })

                    ffmpegProcess.on("error", (error) => {
                      try {
                        controller.enqueue(encoder.encode(JSON.stringify({
                          type: "log",
                          message: `Thumbnail generation failed: ${error.message}`
                        }) + "\n"))
                        controller.enqueue(encoder.encode(JSON.stringify({
                          type: "complete",
                          message: "Download completed (thumbnail generation failed)"
                        }) + "\n"))
                        controller.close()
                      } catch (e) {
                        // Stream might be closed
                      }
                    })
                  } else {
                    try {
                      controller.enqueue(encoder.encode(JSON.stringify({
                        type: "complete",
                        message: "Download completed!"
                      }) + "\n"))
                      controller.close()
                    } catch (e) {
                      // Stream might be closed
                    }
                  }
                } catch (e) {
                  try {
                    controller.enqueue(encoder.encode(JSON.stringify({
                      type: "complete",
                      message: "Download completed!"
                    }) + "\n"))
                    controller.close()
                  } catch (e) {
                    // Stream might be closed
                  }
                }
              } else {
                try {
                  controller.enqueue(encoder.encode(JSON.stringify({
                    type: "error",
                    message: `Download failed with code ${code}`
                  }) + "\n"))
                  controller.close()
                } catch (e) {
                  // Stream might be closed
                }
              }
            })

            ytdlpProcess.on("error", (error) => {
              // Clear heartbeat interval
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval)
              }
              
              try {
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: "error",
                  message: `Process error: ${error.message}`
                }) + "\n"))
                controller.close()
              } catch (e) {
                // Stream might be closed
              }
            })
          } catch (error) {
            try {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: "error",
                message: `Failed to start download: ${error.message}`
              }) + "\n"))
              controller.close()
            } catch (e) {
              // Stream might be closed
            }
          }
        }
      })

      resolve(new Response(stream, {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
          "Transfer-Encoding": "chunked",
        },
      }))
    })
  } catch (error) {
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
} 