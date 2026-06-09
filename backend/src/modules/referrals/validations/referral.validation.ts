import { z } from "zod";

export const listReferralMembersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(9),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().trim().max(120).optional(),
});
