# vibe-dev - Development container for vibe-coded apps
# Based on Debian bookworm with Playwright support
FROM node:22-bookworm-slim

# Install Playwright dependencies + Claude Code deps
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc-s1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Claude CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Install Playwright browsers
RUN npx playwright install chromium

# Set up working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN corepack enable && npm install

# Copy source
COPY . .

# Build the CLI
RUN npm run build || true

# Create live directory for code files
RUN mkdir -p /app/live

# Set environment defaults
ENV NODE_ENV=production
ENV TESTING_SPIKE_LAND_URL=https://testing.spike.land

# Volume for local code files
VOLUME ["/app/live"]

# Entry point
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["--help"]
