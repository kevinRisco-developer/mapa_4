# ---- Build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Descarga de dependencias en su propia capa para aprovechar la cache de Docker
COPY pom.xml .
RUN mvn -q -B dependency:go-offline

COPY src ./src
RUN mvn -q -B -DskipTests package

# ---- Runtime ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Railway inyecta PORT en runtime; server.port=${PORT:8080} en application.properties lo respeta.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
