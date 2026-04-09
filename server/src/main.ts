import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';
import { AppModule } from './app.module';
import { Go2RTCProxy } from './proxies/go2rtc.proxy';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const server = app.getHttpServer();
  const wsProxy = app.get(Go2RTCProxy);

  logger.log('Running database migrations...');

  migrate(app.get('db'), {
    migrationsFolder: './src/db/migrations',
  });

  logger.log('Database migrations completed.');

  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (req.url?.startsWith('/api/go2rtc')) {
      wsProxy.handleUpgrade(req, socket, head);
    }
  });

  logger.log('WebSocket proxy for Go2RTC initialized');

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
