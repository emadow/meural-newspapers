#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION="18.19.0"
IMAGEMAGICK_VERSION="6.9.11-60"

log() {
  echo "[$(basename "$0")] $*"
}

have_command() {
  command -v "$1" >/dev/null 2>&1
}

detect_os() {
  case "$(uname -s 2>/dev/null || echo unknown)" in
    Darwin) echo "macos" ;;
    Linux) echo "linux" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *) echo "unknown" ;;
  esac
}

node_version_installed() {
  if ! have_command node; then
    return 1
  fi

  local actual
  actual="$(node -v 2>/dev/null || true)"
  [ "$actual" = "v${NODE_VERSION}" ]
}

install_node_with_nvm() {
  log "Installing Node.js v${NODE_VERSION} via nvm..."

  if [ -z "${NVM_DIR:-}" ]; then
    export NVM_DIR="$HOME/.nvm"
  fi

  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  fi

  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm install "$NODE_VERSION"
  nvm alias default "$NODE_VERSION"
  nvm use "$NODE_VERSION"
}

ensure_node() {
  if node_version_installed && have_command npm; then
    log "Node.js v${NODE_VERSION} already installed."
    return
  fi

  local os
  os="$(detect_os)"

  case "$os" in
    macos|linux)
      install_node_with_nvm
      ;;
    windows)
      log "Please install Node.js v${NODE_VERSION} on Windows (nvm-windows or official installer), then rerun setup."
      exit 1
      ;;
    *)
      log "Unsupported OS for automatic Node.js install. Install Node.js v${NODE_VERSION} manually and rerun setup."
      exit 1
      ;;
  esac

  if ! node_version_installed || ! have_command npm; then
    log "Node.js v${NODE_VERSION} and npm are required after installation."
    exit 1
  fi
}

imagemagick_version_installed() {
  local version_output

  if have_command convert; then
    version_output="$(convert -version 2>/dev/null | head -n1 || true)"
  elif have_command magick; then
    version_output="$(magick -version 2>/dev/null | head -n1 || true)"
  else
    return 1
  fi

  printf '%s' "$version_output" | grep -q "${IMAGEMAGICK_VERSION}"
}

install_imagemagick() {
  local os
  os="$(detect_os)"

  case "$os" in
    macos)
      if have_command brew; then
        log "Installing ImageMagick ${IMAGEMAGICK_VERSION} from source via brew formula URL..."
        brew install --formula "https://raw.githubusercontent.com/Homebrew/homebrew-core/d7d9dc2b1399ec1f111e7f7878e196ee83fed367/Formula/i/imagemagick@6.rb"
      else
        log "brew not found. Install Homebrew or install ImageMagick ${IMAGEMAGICK_VERSION} manually."
        exit 1
      fi
      ;;
    linux)
      if have_command apt-get; then
        log "Installing ImageMagick ${IMAGEMAGICK_VERSION} from source on Debian/Ubuntu..."
        sudo apt-get update
        sudo apt-get install -y build-essential pkg-config curl ca-certificates \
          libjpeg-dev libpng-dev libtiff-dev libwebp-dev libfreetype6-dev
        tmp_dir="$(mktemp -d)"
        curl -fsSL "https://download.imagemagick.org/archive/releases/ImageMagick-${IMAGEMAGICK_VERSION}.tar.xz" -o "$tmp_dir/imagemagick.tar.xz"
        tar -xf "$tmp_dir/imagemagick.tar.xz" -C "$tmp_dir"
        (cd "$tmp_dir/ImageMagick-${IMAGEMAGICK_VERSION}" && ./configure && make -j"$(nproc 2>/dev/null || echo 2)" && sudo make install && sudo ldconfig)
        rm -rf "$tmp_dir"
      elif have_command yum; then
        log "Installing ImageMagick build dependencies and ${IMAGEMAGICK_VERSION} from source on RHEL/CentOS..."
        sudo yum install -y gcc gcc-c++ make pkgconfig curl tar xz \
          libjpeg-turbo-devel libpng-devel libtiff-devel libwebp-devel freetype-devel
        tmp_dir="$(mktemp -d)"
        curl -fsSL "https://download.imagemagick.org/archive/releases/ImageMagick-${IMAGEMAGICK_VERSION}.tar.xz" -o "$tmp_dir/imagemagick.tar.xz"
        tar -xf "$tmp_dir/imagemagick.tar.xz" -C "$tmp_dir"
        (cd "$tmp_dir/ImageMagick-${IMAGEMAGICK_VERSION}" && ./configure && make -j"$(nproc 2>/dev/null || echo 2)" && sudo make install && sudo ldconfig)
        rm -rf "$tmp_dir"
      else
        log "No supported Linux package manager found for automatic ImageMagick installation."
        exit 1
      fi
      ;;
    windows)
      log "Automatic pinned ImageMagick install is not implemented for Windows in this script."
      log "Install ImageMagick ${IMAGEMAGICK_VERSION} manually, then rerun setup."
      exit 1
      ;;
    *)
      log "Unsupported OS for automatic ImageMagick install."
      exit 1
      ;;
  esac
}

ensure_imagemagick() {
  if imagemagick_version_installed; then
    log "ImageMagick ${IMAGEMAGICK_VERSION} already installed."
    return
  fi

  log "ImageMagick ${IMAGEMAGICK_VERSION} not found; attempting installation..."
  install_imagemagick

  if ! imagemagick_version_installed; then
    log "ImageMagick ${IMAGEMAGICK_VERSION} is required but was not detected after install."
    exit 1
  fi
}

log "Setting up meural-newspapers..."

ensure_node
ensure_imagemagick

log "Installing Node dependencies..."
npm install --legacy-peer-deps

if [ ! -f config.json ]; then
  log "Creating config.json from template..."
  cp config.example.json config.json
  log "Please edit config.json with your Meural credentials."
fi

log "Compiling TypeScript..."
npx tsc

log "Setup complete. Run 'npm start' to fetch and upload today's newspapers."
