import { Controller, Get } from '@nestjs/common';
import { PrinterService } from 'src/services/printer.service';

@Controller('api/printer')
export class PrinterController {
  constructor(private readonly printerService: PrinterService) {}

  @Get()
  getPrinters() {
    return this.printerService.getPrinters();
  }
}
