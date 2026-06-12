import { RawData } from 'ws';
import { WSClient } from '../../services/ws.service';
import { sendMessage } from '../helpers';
import { logger } from '../../config/logger';

export const handleMessage = (client: WSClient, raw: RawData): void => {
  try {
    const data = JSON.parse(raw.toString()) as { event: string; payload?: unknown };
    const { event, payload } = data;

    if (event.startsWith('subscribe:')) {
      const channel = event.replace('subscribe:', '');
      client.channels.add(channel);
      sendMessage(client.socket, 'subscribed', { channel });
      logger.debug('WS client subscribed', { userId: client.userId, channel });
      return;
    }

    if (event.startsWith('unsubscribe:')) {
      const channel = event.replace('unsubscribe:', '');
      client.channels.delete(channel);
      sendMessage(client.socket, 'unsubscribed', { channel });
      logger.debug('WS client unsubscribed', { userId: client.userId, channel });
      return;
    }

    logger.debug('WS message received', { userId: client.userId, event, payload });
  } catch (err) {
    sendMessage(client.socket, 'error', { message: 'Invalid JSON message' });
    logger.warn('WS invalid message', {
      userId: client.userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
