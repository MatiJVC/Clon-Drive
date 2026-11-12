import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = (
    process.env.CORS_ORIGIN ??
    'http://localhost:5173,http://localhost:8080'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  // Admite únicamente los orígenes configurados para Vite y Nginx.
  app.enableCors({
    origin: allowedOrigins,
    exposedHeaders: ['Content-Disposition'],
  });
  // Valida los DTOs y descarta campos que no estén declarados.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
