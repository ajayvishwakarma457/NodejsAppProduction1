import http from 'http';
import { app } from './app';
import { db } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { redisService } from './services/redis.service';
import { jobOrchestrator } from './jobs';
import { registerSockets } from './sockets';
import { initializeNamespaces } from './sockets/namespaces';
import { socketService } from './services/socket.service';
import { initializeEventBus } from './events';
import { Server } from 'socket.io';

let server: http.Server | null = null;

const bootstrap = async () => {
  try {
    await db.connect();
    await redisService.connect();

    server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: env.CLIENT_URL,
      },
    });

    socketService.setIO(io);
    registerSockets(io);
    initializeNamespaces(io);

    if (env.EVENT_BUS_ENABLED) {
      initializeEventBus();
    }

    server.listen(env.PORT, () => {
      logger.info(`${env.APP_NAME} listening on port ${env.PORT}`, {
        env: env.NODE_ENV,
      });
    });

    jobOrchestrator.startAll();
  } catch (error) {
    logger.error('Failed to bootstrap application', { error });
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  try {
    const io = socketService.getIO();
    if (io) {
      io.close(() => {
        logger.info('Socket.IO server closed');
      });
    }

    await jobOrchestrator.stopAll();

    await db.disconnect();
    await redisService.disconnect();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  gracefulShutdown('uncaughtException');
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

void bootstrap();
