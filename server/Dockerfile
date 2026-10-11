# Phase 17 — Server Dockerfile
# Use the official Node.js 20 Alpine image for a small footprint
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) first
# This leverages Docker's layer caching to avoid reinstalling dependencies
# if only source code has changed.
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Expose port 5000 which is what the Node app expects
EXPOSE 5000

# Start the server
CMD ["node", "src/server.js"]
