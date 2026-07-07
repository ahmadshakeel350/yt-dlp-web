import "./globals.css"

export const metadata = {
  title: "Video Downloader",
  description: "Download videos with yt-dlp through a web interface",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
} 