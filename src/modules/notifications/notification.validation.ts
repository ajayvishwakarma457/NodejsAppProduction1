import { z } from "zod";

export const notificationSchema = z.object({
  body: z.object({
    userId: z.string().min(1),
    title: z.string().min(1),
    message: z.string().min(1)
  })
});

