FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app /app
RUN addgroup -S brmoto && adduser -S brmoto -G brmoto && chown -R brmoto:brmoto /app
USER brmoto
EXPOSE 3000
CMD ["npm", "start"]
