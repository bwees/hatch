import { Injectable } from '@nestjs/common';
import { Go2RTCRepository } from '../repositories/go2rtc.repository';
import { PrinterRepository } from '../repositories/printer.repository';

@Injectable()
export class BaseService {
  constructor(
    protected printerRepository: PrinterRepository,
    protected go2rtcRepository: Go2RTCRepository,
  ) {}
}
