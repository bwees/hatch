import { NestFactory } from '@nestjs/core';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';
import { AppModule } from './app.module';
import { Go2RTCProxy } from './proxies/go2rtc.proxy';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const server = app.getHttpServer();
  const wsProxy = app.get(Go2RTCProxy);

  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (req.url?.startsWith('/api/go2rtc')) {
      wsProxy.handleUpgrade(req, socket, head);
    }
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
