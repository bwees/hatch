import { Injectable, Logger } from '@nestjs/common';

// There are other properties, but we only care about the producer URLs
type Go2RTCStream = {
  producers: {
    url: string;
  }[];
};

type Go2RTCInfo = {
  version: string;
  config_path: string;
};

@Injectable()
export class Go2RTCRepository {
  private readonly logger = new Logger(Go2RTCRepository.name);

  async getStreams(): Promise<Record<string, Go2RTCStream>> {
    const res = await fetch('http://localhost:1984/api/streams');
    return (await res.json()) as Record<string, Go2RTCStream>;
  }

  async deleteStream(serial: string) {
    const r = await fetch(`http://localhost:1984/api/streams?src=${serial}`, {
      method: 'DELETE',
    });

    if (!r.ok) {
      this.logger.error(
        `Failed to delete stream for printer ${serial}: ${r.statusText}`,
      );
    }
  }

  async createStream(serial: string, url: string) {
    url = encodeURIComponent(url);

    const r = await fetch(
      `http://localhost:1984/api/streams?name=${serial}&src=${url}`,
      {
        method: 'PUT',
      },
    );

    if (!r.ok) {
      this.logger.error(
        `Failed to create stream for printer ${serial}: ${r.statusText}`,
      );
    }
  }

  async updateStream(serial: string, url: string) {
    const r = await fetch(
      `http://localhost:1984/api/streams?name=${serial}&src=${url}`,
      {
        method: 'PATCH',
      },
    );

    if (!r.ok) {
      this.logger.error(
        `Failed to update stream for printer ${serial}: ${r.statusText}`,
      );
    }
  }

  async getInfo() {
    return (await fetch('http://localhost:1984/api').then((res) =>
      res.json(),
    )) as Go2RTCInfo;
  }
}
