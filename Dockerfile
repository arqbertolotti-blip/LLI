FROM node:22-alpine
WORKDIR /app
COPY . .
ENV DATA_FILE=/data/data.json PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
