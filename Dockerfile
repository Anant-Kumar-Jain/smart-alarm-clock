# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy the pom.xml and source code
COPY pom.xml .
COPY src ./src

# Build the application (skipping tests for faster deployment)
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copy the compiled jar from the build stage
COPY --from=build /app/target/*.jar app.jar

# Render assigns a dynamic port using the PORT environment variable.
# We start the Java app forcing it to use this PORT, falling back to 8080.
CMD ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
