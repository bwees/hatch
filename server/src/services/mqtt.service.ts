import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import mqtt, { MqttClient } from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client!: MqttClient;
  private readonly logger = new Logger(MqttService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    const printerIp = this.configService.getOrThrow<string>('PRINTER_IP');
    const accessCode = this.configService.getOrThrow<string>(
      'PRINTER_ACCESS_CODE',
    );
    const serial = this.configService.getOrThrow<string>('PRINTER_SERIAL');

    const reportTopic = `device/${serial}/report`;

    this.client = mqtt.connect({
      host: printerIp,
      username: 'bblp',
      password: accessCode,
      reconnectPeriod: 5000,
      protocol: 'mqtts',
      port: 8883,

      keepalive: 60,
      rejectUnauthorized: false, // Accept self-signed certificates
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT broker at ${printerIp}`);
      this.client.subscribe(reportTopic, (err) => {
        if (err) {
          this.logger.error(
            `Failed to subscribe to "${reportTopic}": ${err.message}`,
          );
        } else {
          this.logger.log(`Subscribed to topic "${reportTopic}" successfully`);
        }
      });
    });

    this.client.on('message', (_, payload) => {
      const message = payload.toString();
      this.eventEmitter.emit('mqtt.report', message);
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT error: ${err.message}`);
    });

    this.client.on('reconnect', () => {
      this.logger.warn('Reconnecting to MQTT broker...');
    });

    this.client.on('offline', () => {
      this.logger.warn('MQTT client offline');
    });
  }

  onModuleDestroy() {
    this.client?.end();
  }
}
