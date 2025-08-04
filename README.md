# YT-DLP Web Interface

A modern web interface for downloading videos using yt-dlp, built with Next.js and shadcn/ui.

## Features

- 🎥 Download videos from YouTube and other supported platforms
- 📱 Modern, responsive UI built with shadcn/ui
- ⚡ Real-time download progress tracking
- 🎛️ Multiple format options (best, worst, MP4, WebM, etc.)
- 📁 Custom download path support
- 📊 Live download logs and status updates

## Prerequisites

- Node.js 18+ 
- yt-dlp installed on your system

### Installing yt-dlp

**Windows:**
```bash
# Using chocolatey
choco install yt-dlp

# Or download from https://github.com/yt-dlp/yt-dlp/releases
```

**macOS:**
```bash
# Using Homebrew
brew install yt-dlp

# Using pip
pip install yt-dlp
```

**Linux:**
```bash
# Using pip
pip install yt-dlp

# Or using your package manager
sudo apt install yt-dlp  # Ubuntu/Debian
sudo dnf install yt-dlp  # Fedora
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd yt-dlp-web
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter a video URL (YouTube, Vimeo, Dailymotion, etc.)
2. Select your preferred format
3. Optionally specify a custom download path
4. Click "Start Download" to begin
5. Monitor progress and logs in real-time

## Supported Platforms

- YouTube
- Vimeo
- Dailymotion
- Facebook
- Twitter
- Instagram
- TikTok
- Twitch
- And many more (see [yt-dlp extractors](https://github.com/yt-dlp/yt-dlp#supported-sites))

## Format Options

- **Best Quality**: Downloads the best available quality
- **Worst Quality**: Downloads the lowest quality (smallest file size)
- **Best Video + Audio**: Downloads best video and audio separately and merges
- **MP4 Format**: Forces MP4 format
- **WebM Format**: Forces WebM format

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Project Structure

```
src/
├── app/
│   ├── api/download/route.js    # Download API endpoint
│   ├── globals.css              # Global styles
│   ├── layout.js                # Root layout
│   └── page.js                  # Main page component
├── components/
│   └── ui/                      # shadcn/ui components
└── lib/
    └── utils.js                 # Utility functions
```

## API Endpoints

### POST /api/download

Downloads a video using yt-dlp.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "format": "best",
  "downloadPath": "/optional/custom/path"
}
```

**Response:**
Streams JSON messages with progress updates:
```json
{"type": "progress", "progress": 50, "status": "Downloaded 50%"}
{"type": "log", "message": "Download started"}
{"type": "complete", "message": "Download completed successfully"}
```

## License

MIT
