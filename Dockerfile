FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Hugging Face Spaces & Cloud Containers support
ENV PORT=7860
EXPOSE 7860

CMD ["node", "server.js"]
