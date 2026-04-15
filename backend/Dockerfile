FROM node:20-alpine

WORKDIR /app

# Install all deps (including devDeps so prisma CLI is available for migrations)
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Swap in the PostgreSQL schema before generating the Prisma client
COPY prisma/schema.postgresql.prisma prisma/schema.prisma

# Generate Prisma client for PostgreSQL
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "server.js"]
