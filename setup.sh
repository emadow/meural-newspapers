#!/usr/bin/env bash
set -e

echo "Setting up meural-newspapers..."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but not installed. Please install Node.js and try again."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not installed. Please install npm and try again."
  exit 1
fi

if ! command -v convert >/dev/null 2>&1 && ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick is required. Install it with your package manager (e.g., 'brew install imagemagick')."
  exit 1
fi

echo "Installing Node dependencies..."
npm install --legacy-peer-deps

if [ ! -f config.json ]; then
  echo "Creating config.json from template..."
  cp config.example.json config.json
  echo "Please edit config.json with your Meural credentials."
fi

echo "Compiling TypeScript..."
npx tsc

echo "Setup complete. Run 'npm start' to fetch and upload today's newspapers."
