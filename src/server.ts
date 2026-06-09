import http from "http";
import { app } from "./app";
import { db } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { registerSockets } from "./sockets";
import { socketService } from "./services/socket.service";
import { Server } from "socket.io";

const bootstrap = async () => {
  await db.connect();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*"
    }
  });

  socketService.setIO(io);
  registerSockets(io);

  server.listen(env.PORT, () => {
    logger.info(`${env.APP_NAME} listening on port ${env.PORT}`);
  });
};

void bootstrap();

