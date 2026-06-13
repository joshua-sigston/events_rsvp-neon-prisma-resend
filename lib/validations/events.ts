import { z } from "zod";

export const createEventSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    location: z.string().min(1, "Location is required"),
    eventDate: z.coerce.date().refine((date) => date > new Date(), {
        message: "Event date must be in the future",
    })
})

export type CreateEventInput = z.infer<typeof createEventSchema>