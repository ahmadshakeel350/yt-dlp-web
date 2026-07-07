export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDownloadQueue } = await import("./lib/download-queue.js")
    startDownloadQueue()
  }
}
