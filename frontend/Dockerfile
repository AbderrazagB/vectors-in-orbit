# Stage 1: Build

# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Accept Vite environment variables as build args
ARG VITE_MONGO_BACKEND_URL
ARG VITE_API_GATEWAY_URL
ARG VITE_SEARCH_API_URL

# Set them as environment variables for Vite
ENV VITE_MONGO_BACKEND_URL=$VITE_MONGO_BACKEND_URL
ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL
ENV VITE_SEARCH_API_URL=$VITE_SEARCH_API_URL

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]