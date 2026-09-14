import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { englishValidationMessages } from './common/utils/validation-messages';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 安全头
  app.use(helmet());

  // 静态资源（上传的头像等）
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // 全局管道
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new BadRequestException(errors.flatMap(englishValidationMessages)),
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger 文档
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle("Doctor Services API")
      .setDescription("Smart Healthcare and Elderly Care Platform - Doctor Services API documentation")
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const PORT = process.env.PORT || 3001;
  await app.listen(PORT);
  console.log(`Doctor Services backend running at: http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`API documentation: http://localhost:${PORT}/api/docs`);
  }
}

bootstrap();
