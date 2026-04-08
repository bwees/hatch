import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true, path: '/mqtt' })
export class MqttGateway implements OnGatewayInit {
  private readonly logger = new Logger(MqttGateway.name);

  @WebSocketServer()
  server!: Server;

  @OnEvent('mqtt.report')
  handleMqttMessage(payload: string) {
    this.server.emit('mqtt.report', JSON.parse(payload));
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket server initialized');
    this.server = server;
  }
}
