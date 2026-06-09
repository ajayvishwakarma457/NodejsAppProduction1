import { z } from "zod";

export const taskSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    projectId: z.string().min(1)
  })
});

