import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Serve static assets from public_html
  app.useStaticAssets(join(process.cwd(), 'public_html'), {
    prefix: '/',
  });

  // Security & Middleware
  app.use(helmet());
  
  // Disable X-Powered-By header
  const expressInstance = app.getHttpAdapter().getInstance();
  if (expressInstance && typeof expressInstance.disable === 'function') {
    expressInstance.disable('x-powered-by');
  }

  // Dynamic CORS configuration
  const allowedOrigins = configService.get<string[]>('app.corsOrigin') || [
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === '*') return true;
        if (allowed === origin) return true;
        if (allowed.includes('*')) {
          const pattern = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
          return pattern.test(origin);
        }
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // Global Pipes, Filters & Interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Documentation Setup (Development / Explicitly Enabled Only)
  const enableSwagger = configService.get<boolean>('app.enableSwagger');
  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('GoldenMeraki API Specification')
      .setDescription('Production-ready NestJS Backend for GoldenMeraki E-Commerce')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : configService.get<number>('app.port') || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application running on port: ${port}`);
  if (enableSwagger) {
    console.log(`📚 Swagger documentation available at: /api/docs`);
  }
}

bootstrap();