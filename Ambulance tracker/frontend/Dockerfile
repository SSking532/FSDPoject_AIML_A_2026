FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_USE_MOCK_DATA=false
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_WS_BASE_URL=ws://localhost:8000
ENV VITE_USE_MOCK_DATA=$VITE_USE_MOCK_DATA VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_WS_BASE_URL=$VITE_WS_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
