import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authRouter } from "./modules/auth/auth.routes";
import { commentRouter } from "./modules/comments/comment.routes";
import { notificationRouter } from "./modules/notifications/notification.routes";
import { projectRouter } from "./modules/projects/project.routes";
import { taskRouter } from "./modules/tasks/task.routes";
import { teamRouter } from "./modules/teams/team.routes";
import { userRouter } from "./modules/users/user.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { rateLimitMiddleware } from "./middleware/rateLimit.middleware";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimitMiddleware);

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "OK" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/teams", teamRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/tasks", taskRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/notifications", notificationRouter);

app.use(errorMiddleware);

