import { z } from "zod";

/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */

export const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Team name is required").max(100),
    description: z.string().min(1, "Team description is required").max(500),
    ownerId: z.string().min(1, "Owner id is required")
  })
});

export const updateTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(500).optional(),
    ownerId: z.string().min(1).optional()
  }),
  params: z.object({
    id: z.string().min(1, "Team id is required")
  })
});

/* ------------------------------------------------------------------ */
// Query / route param schemas
/* ------------------------------------------------------------------ */

export const listTeamsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sort: z.string().optional().default("createdAt"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
    ownerId: z.string().optional(),
    memberId: z.string().optional(),
    search: z.string().optional()
  })
});

export const teamIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Team id is required")
  })
});

/* ------------------------------------------------------------------ */
// Member operation schemas
/* ------------------------------------------------------------------ */

export const addMemberSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "User id is required"),
    role: z.enum(["owner", "admin", "member"]).optional().default("member")
  }),
  params: z.object({
    id: z.string().min(1, "Team id is required")
  })
});

export const removeMemberSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "User id is required")
  }),
  params: z.object({
    id: z.string().min(1, "Team id is required")
  })
});
