FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

FROM node:20-alpine
WORKDIR /app
RUN mkdir -p /tmp/uploads
COPY --from=builder /app .
EXPOSE 3021
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3021/health || exit 1
CMD ["node", "src/index.js"]
