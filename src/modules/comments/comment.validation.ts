import { z } from "zod";

export const commentSchema = z.object({
  body: z.object({
    taskId: z.string().min(1),
    content: z.string().min(1)
  })
});

