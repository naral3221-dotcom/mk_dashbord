import { ILogger } from '@/domain/services/ILogger';
import { PinoLogger } from './PinoLogger';

let loggerInstance: ILogger | null = null;

export function getLogger(): ILogger {
  if (!loggerInstance) {
    loggerInstance = new PinoLogger();
  }
  return loggerInstance;
}

export { PinoLogger } from './PinoLogger';
