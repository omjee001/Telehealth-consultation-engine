# Phase 17 — Client Dockerfile (Multi-stage build)

# Stage 1: Build the React application
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the app (outputs to dist/)
RUN npm run build

# Stage 2: Serve the built application with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration to handle SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built assets from Stage 1 to the Nginx html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Nginx starts automatically by default
