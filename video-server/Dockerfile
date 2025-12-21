FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server code
COPY server.js ./

# Create directories for GCS FUSE mount points
RUN mkdir -p /mnt/videos /mnt/public

# Set default environment variables
ENV PORT=8080
ENV HOST=0.0.0.0
ENV VIDEOS_PATH=/mnt/videos
ENV PUBLIC_PATH=/mnt/public

EXPOSE 8080

CMD ["node", "server.js"]
