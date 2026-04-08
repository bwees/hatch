import { Printer } from 'src/db/schema';
import { BaseService } from './base.service';

export class PrinterService extends BaseService {
  getPrinters(): Promise<Printer[]> {
    return this.printerRepository.getPrinters();
  }
}
