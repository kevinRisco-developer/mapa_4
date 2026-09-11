# Build desde la raiz del repo: docker build -f docker/frontend/minsa/Dockerfile .
FROM node:20-alpine AS build-stage

WORKDIR /app

# manifests:
COPY frontend_mapa/package*.json ./
COPY frontend_mapa/angular.json ./
COPY frontend_mapa/tsconfig*.json ./

RUN npm ci

# Codigo fuente:
COPY frontend_mapa/src/ src/

RUN npx ng build --configuration production

# Nginx:
FROM nginx:1.25-alpine

COPY --from=build-stage /app/dist/frontend/browser/ /usr/share/nginx/html/

COPY docker/frontend/minsa/nginx-custom.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
