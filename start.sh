#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p logs

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the application
echo "Building the application..."
npm run build

# Start with PM2
echo "Starting YT-DLP Web Interface on port 3044..."
pm2 start ecosystem.config.js --env production

echo "Application started! Access it at http://localhost:3044"
echo "To view logs: pm2 logs yt-dlp-web"
echo "To stop: pm2 stop yt-dlp-web"
echo "To restart: pm2 restart yt-dlp-web" 