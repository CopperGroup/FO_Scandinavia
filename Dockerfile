FROM node:20-alpine

WORKDIR /app

# .npmrc carries the peer-dependency setting the lockfile was resolved with.
COPY package*.json .npmrc ./
RUN npm ci

COPY . .

ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
