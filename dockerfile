# Use official Node.js 18 Alpine image (smaller size)
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Copy package files first (for better Docker cache)
COPY package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy entire application code
COPY . .

# Expose port 3000
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Health check to ensure container is running properly
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]