import { z } from "zod";

export const projectSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    teamId: z.string().min(1)
  })
});

