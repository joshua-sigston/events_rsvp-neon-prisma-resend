import { z } from "zod";

export const sendInvitesSchema = z.object({
    eventId: z.string(),
    guests: z.array(z.object({
        email: z.string().email(),
        name: z.string().optional(),
    })).min(1, "Add at least one guest"),
})

export type SendInvitesInput = z.infer<typeof sendInvitesSchema>