FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY bot/ ./bot/
COPY server/ ./server/
COPY web/ ./web/
EXPOSE 3107
CMD ["node", "bot/index.js"]
