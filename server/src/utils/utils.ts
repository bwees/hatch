import { Printer } from 'src/db/schema';

export function streamURLForPrinter(printer: Printer) {
  return `rtsps://bblp:${printer.accessCode}@${printer.hostIp}:322/streaming/live/1`;
}
