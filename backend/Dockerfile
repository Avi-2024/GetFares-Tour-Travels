# Use lightweight Node image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy full project
COPY . .

ENV NODE_ENV=production

EXPOSE 3000

# Start app (update if different entry point)
CMD ["node", "src/server.js"]