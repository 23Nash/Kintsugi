#!/usr/bin/env bash
# Setup script for Claude Code cloud sessions (Ubuntu 24.04, runs as root).
# Paste into the cloud environment's setup script, or have it run this file.
# Installs what the done gate needs beyond the preinstalled Rust and Node.
set -euo pipefail

# Tauri system packages: same list as .github/workflows/ci.yml.
apt-get update
apt-get install -y libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Node 24: package.json "engines" requires >=24; the image ships 20 to 22.
if [ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

# pnpm at the version pinned in package.json "packageManager".
corepack enable pnpm
