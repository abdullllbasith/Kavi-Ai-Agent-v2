FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/ui ./ui
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
USER node
CMD ["node", "--enable-source-maps", "dist/server.js"]
