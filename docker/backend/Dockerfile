# Build desde la raiz del repo: docker build -f docker/backend/Dockerfile .
# ---- Build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Descarga de dependencias en su propia capa para aprovechar la cache de Docker
COPY msc_backend_mapa/pom.xml .
RUN mvn -q -B dependency:go-offline

COPY msc_backend_mapa/src ./src
RUN mvn -q -B -DskipTests package

# ---- Runtime ----
FROM eclipse-temurin:21-jre-alpine

LABEL maintainer="Kevin Fabrizio Risco Romero"
LABEL project="interoperabilidad-en-salud"
LABEL service="interoperabilidad-backend"

RUN addgroup -S interop && adduser -S interop -G interop

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

RUN chown interop:interop app.jar

USER interop

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
