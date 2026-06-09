FROM node:20-slim

WORKDIR /app

# Copy source (node_modules excluded via .gitignore / .dockerignore)
COPY . .

# Install backend dependencies
RUN npm install --prefix backend

# Install frontend dependencies including devDeps (tsc, vite)
RUN npm install --include=dev --prefix frontend

# Build the React frontend
RUN npm run build --prefix frontend

# Copy built frontend into backend/public so server.js can serve it
RUN mkdir -p backend/public && cp -r frontend/dist/. backend/public/

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "backend/server.js"]