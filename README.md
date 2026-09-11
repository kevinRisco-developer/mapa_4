# Interoperabilidad en Salud — Plataforma de Demo

Mapa del Perú con visualización en tiempo real de hospitales, MINSA y el flujo de
transacciones de historias clínicas (envío/consulta), backend Spring Boot + MongoDB
+ RabbitMQ, frontend Angular + MapLibre GL JS.

## Arquitectura

```
Sistema externo (REPISE) --POST JSON--> Backend (Spring Boot)
                                             │
                                    RabbitMQ (cola FIFO)
                                             │
                                Worker → MongoDB (insert)
                                             │
                                   STOMP/WebSocket
                                             │
                                Frontend (Angular + MapLibre)
```

- **MongoDB**: base de datos remota ya provisionada (colecciones `hospitales`, `minsa`, `transacciones`). No se gestiona desde este repo.
- **RabbitMQ**: cola de ingesta de transacciones, FIFO con un solo consumidor.
- **Backend**: expone `/api/hospitales`, `/api/minsa`, `POST /api/transacciones`, y notifica al frontend por STOMP (`/topic/transacciones`) en cuanto inserta una transacción.
- **Frontend**: mapa con los hospitales, el ícono de MINSA, y una animación ("estrella fugaz") que viaja entre el hospital y MINSA según la acción (`ENVIO_HC` verde hospital→MINSA, `CONSULTA_HC` naranja MINSA→hospital).

## Estructura del repositorio

```
msc_backend_mapa/     Backend (Spring Boot 4.1.1, Java 21, Maven)
frontend_mapa/        Frontend (Angular 17, MapLibre GL JS)
docker/
├── docker-compose.yml           RabbitMQ para desarrollo local
├── backend/
│   ├── Dockerfile                Imagen del backend (servidor de red)
│   ├── docker-compose.yml        Despliegue del backend en el servidor de red
│   └── backend.properties.example  Plantilla de configuracion externa (sin secretos)
└── frontend/
    └── minsa/
        ├── Dockerfile             Imagen del frontend (Nginx)
        ├── docker-compose.yml     Despliegue del frontend en el servidor de red
        └── nginx-custom.conf      Config de Nginx (fallback SPA)
```

## Requisitos

- Java 21 y el wrapper de Maven (`./mvnw`, ya incluido).
- Node.js 20+ y Angular CLI (`npx ng ...`, no hace falta instalarlo global).
- Docker + Docker Desktop (para RabbitMQ local y para construir las imágenes de despliegue).

---

## Desarrollo local

### 1. Levantar RabbitMQ

```bash
docker compose -f docker/docker-compose.yml up -d
```

UI de administración: `http://localhost:15672` (usuario/clave: `admin`/`admin`).

> En Windows, el puerto AMQP se mapea a **5900** (no 5672) porque Windows/Hyper-V
> suele tener el 5672 en un rango de puertos excluido. Este detalle es solo para
> tu máquina local — en el servidor de red se usa el puerto estándar 5672.

### 2. Configurar el secreto de Mongo (solo la primera vez)

Crea `msc_backend_mapa/src/main/resources/application-local.properties` (este archivo
está en `.gitignore`, nunca se sube):

```properties
spring.mongodb.uri=mongodb://usuario:password@host-real:puerto/miApp?authSource=admin
```

### 3. Levantar el backend

```bash
cd msc_backend_mapa
./mvnw spring-boot:run
```

Arranca en `http://localhost:8080`. El perfil `local` se activa solo
(`spring.profiles.default=local` en `application.properties`), así que toma la URI
de Mongo del archivo del paso 2 automáticamente.

Verificación rápida:
```bash
curl http://localhost:8080/api/hospitales
curl http://localhost:8080/actuator/health
```

### 4. Levantar el frontend

```bash
cd frontend_mapa
npm install
npx ng serve --port 4201
```

Abre `http://localhost:4201`. Usa `environment.ts` (apunta a `http://localhost:8080`).

---

## Configuración del backend — cómo funciona

El backend **no usa variables de entorno** para su configuración (ya no se despliega
en Railway). Usa tres capas, en este orden de prioridad:

| Capa | Archivo | Contiene secretos? | Dónde vive |
|---|---|---|---|
| Defaults de desarrollo | `application.properties` | No | Commiteado en git |
| Override local | `application-local.properties` | Sí (URI de Mongo real) | Gitignored, solo tu máquina |
| Override de producción | `backend.properties` (mismo formato que `backend.properties.example`) | Sí (Mongo, RabbitMQ, CORS reales) | **Fuera del repo**, montado como volumen en el servidor de red en `/opt/data/interoperabilidad-backend/properties/backend.properties` |

Esto se logra con esta línea en `application.properties`:
```properties
spring.config.import=optional:file:/opt/data/interoperabilidad-backend/properties/backend.properties
```
`optional:` evita que falle si el archivo no existe (por ejemplo, en tu máquina local).

**En el servidor real**, quien administre la infraestructura debe:
1. Copiar `docker/backend/backend.properties.example` a `/opt/data/interoperabilidad-backend/properties/backend.properties` en el host.
2. Completar los valores reales (Mongo, RabbitMQ, y el dominio del frontend para CORS).
3. El contenedor lo lee automáticamente al montarse el volumen (no hace falta reconstruir la imagen para cambiar estos valores — solo reiniciar el contenedor).

## Configuración del frontend — cómo funciona

Angular incrusta la configuración **en el momento del build**, no en runtime (a
diferencia del backend). Dos archivos:

- `frontend_mapa/src/environments/environment.ts` — desarrollo local (`http://localhost:8080`).
- `frontend_mapa/src/environments/environment.prod.ts` — producción. **Tiene placeholders** (`REEMPLAZAR_HOST_BACKEND`, `REEMPLAZAR_PUERTO`) que hay que reemplazar por la URL real del backend desplegado, y luego **reconstruir la imagen** (no basta con reiniciar el contenedor, a diferencia del backend).

El build de producción usa este archivo automáticamente vía `fileReplacements` en
`angular.json` cuando se corre con `--configuration production` (que es lo que
hace el `Dockerfile` de `docker/frontend/minsa/`).

---

## Despliegue en el servidor de red (backend + frontend en contenedores)

Todos los `docker build` se corren **desde la raíz del repo** (el contexto de build
es la raíz, no la carpeta del backend/frontend, porque los Dockerfiles necesitan
copiar archivos de configuración que viven en `docker/`).

### Backend

1. Construir la imagen:
   ```bash
   docker build -f docker/backend/Dockerfile -t interoperabilidad-backend:1.0.0 .
   ```
2. En el servidor, crear el archivo de configuración real (ver sección anterior):
   `/opt/data/interoperabilidad-backend/properties/backend.properties`.
3. Completar en `docker/backend/docker-compose.yml`:
   - `REEMPLAZAR-registry` → nombre/registry real de la imagen (o quitar `image:` y dejar solo `build:` si se construye directo en el servidor).
   - `REEMPLAZAR_PUERTO` → puerto de host asignado.
4. Levantar:
   ```bash
   docker compose -f docker/backend/docker-compose.yml up -d
   ```
5. Verificar salud del contenedor:
   ```bash
   docker ps   # deberia decir "healthy" despues de ~60s
   curl http://localhost:<puerto>/actuator/health
   ```

El `Dockerfile` corre como usuario no-root (`interop`), y usa flags de JVM
conscientes del límite de memoria del contenedor (`-XX:MaxRAMPercentage=75.0`).

### Frontend

1. Actualizar `frontend_mapa/src/environments/environment.prod.ts` con la URL real
   del backend ya desplegado (paso anterior).
2. Construir la imagen:
   ```bash
   docker build -f docker/frontend/minsa/Dockerfile -t interoperabilidad-frontend:1.0.0 .
   ```
3. Completar en `docker/frontend/minsa/docker-compose.yml`:
   - `REEMPLAZAR-registry`, `REEMPLAZAR_PUERTO`, `REEMPLAZAR_IP`, `REEMPLAZAR_SUBNET`, `REEMPLAZAR_GATEWAY` → valores asignados por infraestructura.
4. Levantar:
   ```bash
   docker compose -f docker/frontend/minsa/docker-compose.yml up -d
   ```
5. Abrir `http://<host>:<puerto>/` — debería verse el mapa con los hospitales y MINSA.

### Orden recomendado

RabbitMQ (accesible por el backend) → Backend (con su `backend.properties` ya en su lugar) → confirmar `/actuator/health` → Frontend (con la URL del backend ya embebida) → probar el flujo completo con un `POST /api/transacciones`.

---

## Referencia rápida de endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/hospitales` | Lista de hospitales con coordenadas |
| GET | `/api/minsa` | Coordenadas de MINSA |
| POST | `/api/transacciones` | Ingesta de transacciones (`{"id_hospital": "...", "accion": "ENVIO_HC" \| "CONSULTA_HC"}`) |
| GET | `/actuator/health` | Estado de salud (Mongo + RabbitMQ) |
| WS | `/ws` (STOMP sobre SockJS) | Topic `/topic/transacciones` — eventos en tiempo real para el frontend |

## Notas de seguridad

- Ningún secreto real vive en el repositorio: la URI de Mongo de desarrollo va en
  `application-local.properties` (gitignored), y la de producción en un archivo
  externo montado, fuera del control de versiones.
- El contenedor del backend corre como usuario no-root.
- `docker/backend/backend.properties.example` y `docker/frontend/*/docker-compose.yml`
  se suben a git con placeholders, nunca con valores reales.
