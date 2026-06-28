FROM node:20-alpine

WORKDIR /app

# Install production deps first — separate layer for better caching
COPY apps/api/package.json ./
RUN npm install --omit=dev

# Copy application source
COPY apps/api/src ./src
COPY apps/api/db ./db

EXPOSE 3001

CMD ["node", "src/index.js"]