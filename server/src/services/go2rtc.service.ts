import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { streamURLForPrinter } from 'src/utils/utils';
import { BaseService } from './base.service';

@Injectable()
export class Go2RTCService extends BaseService implements OnModuleInit {
  private readonly logger = new Logger(Go2RTCService.name);

  async syncConfig() {
    const printers = await this.printerRepository.getPrinters();

    const desiredStreams = new Map<string, string>(
      printers.map((printer) => [printer.serial, streamURLForPrinter(printer)]),
    );

    // Add or update needed streams
    const existingStreams = await this.go2rtcRepository.getStreams();
    for (const [serial, url] of desiredStreams) {
      if (!existingStreams[serial]) {
        // Stream doesn't exist, create it
        await this.go2rtcRepository.createStream(serial, url);
      } else if (existingStreams[serial]?.producers[0].url !== url) {
        // Stream exists but URL is different, update it
        await this.go2rtcRepository.updateStream(serial, url);
      }

      this.logger.debug(`Installed stream for printer ${serial}`);
    }

    // Remove streams that are no longer needed
    for (const serial of Object.keys(existingStreams)) {
      if (!desiredStreams.has(serial)) {
        await this.go2rtcRepository.deleteStream(serial);

        this.logger.debug(`Deleted orphaned stream for printer ${serial}`);
      }
    }
  }

  async onModuleInit() {
    this.logger.log('Synchronizing go2rtc config with printers in database...');
    await this.syncConfig();
  }
}
