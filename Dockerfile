FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# ⬇️ Run the PostHog wizard (non-interactive)
RUN npx -y @posthog/wizard@latest --eu

COPY . .

ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
