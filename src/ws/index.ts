import { env } from '../config/env';
import { logger } from '../config/logger';
import { wsService } from '../services/ws.service';

export const startWsServer = (): void => {
  if (!env.WS_ENABLED) {
    logger.info('WS server is disabled (WS_ENABLED=false)');
    return;
  }

  wsService.start();
};

export const stopWsServer = (): Promise<void> => {
  return wsService.stop();
};
