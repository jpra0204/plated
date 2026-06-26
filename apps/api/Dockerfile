FROM node:20-alpine

WORKDIR /app

# Install production deps first — separate layer for better caching
COPY apps/api/package.json ./
RUN npm install --omit=dev

# Copy application source
COPY apps/api/src ./src
COPY apps/api/db ./db

# Run as non-root user
RUN addgroup -S plated && adduser -S plated -G plated
USER plated

EXPOSE 3001

CMD ["node", "src/index.js"]
