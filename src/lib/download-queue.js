import fs from "fs"
import path from "path"
import { spawn } from "child_process"
import { randomUUID } from "crypto"

const JOBS_DIR = path.join(process.cwd(), "data", "jobs")
const DOWNLOADS_DIR = path.join(process.cwd(), "public", "downloads")
const THUMBNAILS_DIR = path.join(process.cwd(), "public", "thumbnails")
const MAX_LOGS = 100

const activeProcesses = new Map()

function ensureDirs() {
  for (const dir of [JOBS_DIR, DOWNLOADS_DIR, THUMBNAILS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

function jobPath(id) {
  return path.join(JOBS_DIR, `${id}.json`)
}

function readJob(id) {
  const file = jobPath(id)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

function writeJob(job) {
  job.updatedAt = new Date().toISOString()
  fs.writeFileSync(jobPath(job.id), JSON.stringify(job, null, 2))
}

function appendLog(job, message) {
  job.logs = [...(job.logs || []), message].slice(-MAX_LOGS)
}

function parseProgress(line) {
  if (line.startsWith("PROGRESS:")) {
    const match = line.match(/PROGRESS:(\d+)\/(\d+)/)
    if (match) {
      const total = parseInt(match[2])
      return total > 0 ? Math.round((parseInt(match[1]) / total) * 100) : 0
    }
  }
  if (/^\d+\/\d+$/.test(line.trim())) {
    const [downloaded, total] = line.trim().split("/").map(Number)
    return total > 0 ? Math.round((downloaded / total) * 100) : 0
  }
  if (line.includes("%")) {
    const match = line.match(/(\d+\.?\d*)%/)
    if (match) return Math.round(parseFloat(match[1]))
  }
  return null
}

function listFilesInDir(dir) {
  if (!fs.existsSync(dir)) return new Set()
  return new Set(
    fs.readdirSync(dir).filter((f) => {
      const fp = path.join(dir, f)
      return fs.statSync(fp).isFile()
    })
  )
}

function findNewVideoFile(before, after, dir) {
  for (const file of after) {
    if (!before.has(file) && /\.(mp4|webm|mkv|avi|mov|flv|mp3|wav|m4a)$/i.test(file)) {
      return file
    }
  }

  // Fallback: most recently modified video file in dir
  const candidates = [...after]
    .filter((f) => /\.(mp4|webm|mkv|avi|mov|flv|mp3|wav|m4a)$/i.test(f))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)

  return candidates[0]?.name || null
}

function generateThumbnail(videoFile, outputDir) {
  return new Promise((resolve) => {
    const videoPath = path.join(outputDir, videoFile)
    const thumbnailPath = path.join(
      THUMBNAILS_DIR,
      `${path.parse(videoFile).name}_thumb.jpg`
    )

    const ffmpeg = spawn("ffmpeg", [
      "-i", videoPath,
      "-ss", "00:00:05",
      "-vframes", "1",
      "-q:v", "2",
      thumbnailPath,
      "-y",
    ])

    activeProcesses.set(`thumb-${videoFile}`, ffmpeg)

    ffmpeg.on("close", () => {
      activeProcesses.delete(`thumb-${videoFile}`)
      resolve(true)
    })

    ffmpeg.on("error", () => {
      activeProcesses.delete(`thumb-${videoFile}`)
      resolve(false)
    })
  })
}

async function runJob(job) {
  const customPath = job.downloadPath
    ? path.join(DOWNLOADS_DIR, job.downloadPath)
    : DOWNLOADS_DIR

  if (!fs.existsSync(customPath)) {
    fs.mkdirSync(customPath, { recursive: true })
  }

  const formatSelection = job.format?.trim() || "bestvideo*+bestaudio/best"
  const filesBefore = listFilesInDir(customPath)

  job.status = "downloading"
  job.progress = 0
  job.statusMessage = "Starting download..."
  job.startedAt = new Date().toISOString()
  appendLog(job, "Starting download process...")
  writeJob(job)

  const args = [
    job.url,
    "--no-playlist",
    "-o", path.join(customPath, "%(title)s.%(ext)s"),
    "--merge-output-format", "mp4",
    "-f", formatSelection,
  ]

  return new Promise((resolve) => {
    let lastProgress = -1
    const ytdlp = spawn("yt-dlp", args, { stdio: ["pipe", "pipe", "pipe"] })

    activeProcesses.set(job.id, ytdlp)
    job.pid = ytdlp.pid
    writeJob(job)

    const handleOutput = (data) => {
      const current = readJob(job.id)
      if (!current || current.status === "cancelled") return

      for (const line of data.toString().split("\n")) {
        if (!line.trim()) continue

        const progress = parseProgress(line)
        if (progress !== null && progress >= 0 && progress <= 100 && progress !== lastProgress) {
          current.progress = progress
          current.statusMessage = `Downloading... ${progress}%`
          lastProgress = progress
        }

        if (line.includes("[download]") || (!line.includes("WARNING") && !line.includes("ERROR"))) {
          appendLog(current, line)
        }

        writeJob(current)
      }
    }

    ytdlp.stdout.on("data", handleOutput)
    ytdlp.stderr.on("data", handleOutput)

    ytdlp.on("close", async (code) => {
      activeProcesses.delete(job.id)

      const current = readJob(job.id)
      if (!current || current.status === "cancelled") {
        resolve()
        return
      }

      if (code !== 0) {
        current.status = "failed"
        current.error = `Download failed with exit code ${code}`
        current.statusMessage = current.error
        current.completedAt = new Date().toISOString()
        appendLog(current, current.error)
        writeJob(current)
        resolve()
        return
      }

      const filesAfter = listFilesInDir(customPath)
      const outputFile = findNewVideoFile(filesBefore, filesAfter, customPath)

      current.status = "processing"
      current.progress = 100
      current.statusMessage = "Generating thumbnail..."
      current.outputFile = outputFile
      appendLog(current, "Download completed successfully!")
      writeJob(current)

      if (outputFile && /\.(mp4|webm|mkv|avi|mov|flv)$/i.test(outputFile)) {
        await generateThumbnail(outputFile, customPath)
      }

      const final = readJob(job.id)
      if (!final || final.status === "cancelled") {
        resolve()
        return
      }

      final.status = "completed"
      final.progress = 100
      final.statusMessage = "Completed"
      final.completedAt = new Date().toISOString()
      appendLog(final, "Job completed")
      writeJob(final)
      resolve()
    })

    ytdlp.on("error", (error) => {
      activeProcesses.delete(job.id)
      const current = readJob(job.id)
      if (!current || current.status === "cancelled") {
        resolve()
        return
      }
      current.status = "failed"
      current.error = error.message
      current.statusMessage = `Process error: ${error.message}`
      current.completedAt = new Date().toISOString()
      appendLog(current, current.error)
      writeJob(current)
      resolve()
    })
  })
}

let processorRunning = false
let processing = false

async function processLoop() {
  if (processing) return
  processing = true

  try {
    const jobs = listJobs()
    const next = jobs.find((j) => j.status === "queued")
    if (next) {
      await runJob(next)
    }
  } finally {
    processing = false
  }
}

function recoverInterruptedJobs() {
  for (const job of listJobs()) {
    if (job.status === "downloading" || job.status === "processing") {
      job.status = "queued"
      job.progress = 0
      job.statusMessage = "Re-queued after server restart"
      job.pid = null
      appendLog(job, "Re-queued after server restart")
      writeJob(job)
    }
  }
}

export function startDownloadQueue() {
  if (processorRunning) return
  processorRunning = true

  ensureDirs()
  recoverInterruptedJobs()

  setInterval(processLoop, 1500)
  processLoop()
}

export function enqueueJob({ url, format, downloadPath }) {
  ensureDirs()

  const job = {
    id: randomUUID(),
    url,
    format: format || null,
    downloadPath: downloadPath || null,
    status: "queued",
    progress: 0,
    statusMessage: "Queued",
    logs: [],
    outputFile: null,
    error: null,
    pid: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
  }

  writeJob(job)
  startDownloadQueue()
  processLoop()

  return job
}

export function listJobs() {
  ensureDirs()

  return fs.readdirSync(JOBS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(JOBS_DIR, f), "utf8")))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function getJob(id) {
  return readJob(id)
}

export function cancelJob(id) {
  const job = readJob(id)
  if (!job) return null

  if (job.status === "queued") {
    job.status = "cancelled"
    job.statusMessage = "Cancelled"
    job.completedAt = new Date().toISOString()
    appendLog(job, "Cancelled while queued")
    writeJob(job)
    return job
  }

  if (job.status === "downloading" || job.status === "processing") {
    const proc = activeProcesses.get(id)
    if (proc) {
      proc.kill("SIGTERM")
      activeProcesses.delete(id)
    }
    job.status = "cancelled"
    job.statusMessage = "Cancelled"
    job.completedAt = new Date().toISOString()
    job.pid = null
    appendLog(job, "Cancelled by user")
    writeJob(job)
    return job
  }

  return job
}

export function deleteJob(id) {
  const job = readJob(id)
  if (!job) return false

  if (job.status === "downloading" || job.status === "processing") {
    cancelJob(id)
  }

  if (fs.existsSync(jobPath(id))) {
    fs.unlinkSync(jobPath(id))
  }

  return true
}
