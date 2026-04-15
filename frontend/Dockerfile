# Stage 1 — build the React app
FROM node:20-alpine AS builder

WORKDIR /app

# VITE_API_URL=/api means browser calls go to /api/...
# nginx then proxies those to the backend service internally
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2 — serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
