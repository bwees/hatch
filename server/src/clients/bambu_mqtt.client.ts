import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import mqtt, { MqttClient } from 'mqtt';

type PrinterConnectionConfig = {
  hostIp: string;
  accessCode: string;
  serial: string;
};

export class BambuMQTTClient {
  private connectionConfig: PrinterConnectionConfig;
  private client: MqttClient;
  private readonly eventEmitter: EventEmitter2;
  private readonly logger: Logger;

  // MQTT topic for receiving printer reports
  get reportTopic() {
    return `device/${this.connectionConfig.serial}/report`;
  }

  constructor(
    connection: PrinterConnectionConfig,
    eventEmitter: EventEmitter2,
    logger: Logger = new Logger(`${BambuMQTTClient.name}-${connection.serial}`),
  ) {
    this.eventEmitter = eventEmitter;
    this.logger = logger;
    this.connectionConfig = connection;

    this.client = mqtt.connect({
      host: connection.hostIp,
      username: 'bblp',
      password: connection.accessCode,
      reconnectPeriod: 5000,
      protocol: 'mqtts',
      port: 8883,
      keepalive: 60,
      rejectUnauthorized: false,
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to Bambu Printer at ${connection.hostIp}`);
      this.client.subscribe(this.reportTopic, (err) => {
        if (err) {
          this.logger.error(
            `Failed to subscribe to "${this.reportTopic}": ${err.message}`,
          );
        } else {
          this.logger.log(
            `Subscribed to topic "${this.reportTopic}" successfully`,
          );
        }
      });
    });

    this.client.on('message', (_, payload) => {
      const message = payload.toString();
      this.eventEmitter.emit('mqtt.report', {
        message,
        serial: this.connectionConfig.serial,
      });
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT client error: ${err.message}`);
    });
  }

  disconnect() {
    this.client.end(() => {
      this.logger.debug('MQTT client disconnected');
    });
  }
}
