# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration production

# ---- Runtime ----
FROM node:22-alpine
WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /app/dist/frontend/browser ./browser

# Railway inyecta PORT en runtime.
CMD ["sh", "-c", "serve -s browser -l ${PORT:-4201}"]
