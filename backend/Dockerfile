# --- Etapa 1: compilar ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# --- Etapa 2: imagen final, solo lo necesario para ejecutar ---
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Migraciones SQL: el backend las aplica solo al arrancar
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
CMD ["node", "dist/main.js"]
