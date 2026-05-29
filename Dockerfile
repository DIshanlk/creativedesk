# ─── Stage 1: Build Frontend ─────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Install ALL deps (including devDeps like vite, typescript)
RUN npm install
COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Build Backend ──────────────────────────────────
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
ENV DATABASE_URL=file:./prisma/prod.db
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build
RUN npx prisma generate

# ─── Stage 3: Production image ───────────────────────────────
FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Backend runtime deps + Prisma client
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/prisma ./backend/prisma
COPY backend/package.json ./backend/

# Frontend built files (served as static assets by backend)
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create uploads directory + startup script
RUN mkdir -p /app/backend/uploads
COPY backend/start.sh /app/backend/start.sh
RUN chmod +x /app/backend/start.sh

ENV DATABASE_URL=file:./prisma/prod.db
ENV NODE_ENV=production
ENV JWT_SECRET=change-this-in-railway-dashboard

EXPOSE 4002

CMD ["/app/backend/start.sh"]
