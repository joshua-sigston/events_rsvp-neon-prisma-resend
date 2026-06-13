// Host-side event operations. Every function calls requireAuth() first,
// so only signed-in users can run them, and all queries filter by the
// session user's id — a host can never read or write another host's events.

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { createEventSchema, type CreateEventInput } from "@/lib/validations/events";
import { sendInvitesSchema } from "@/lib/validations/initation";
import { revalidatePath } from "next/cache";

// Creates a new event owned by the signed-in user.
export async function createEvent(data: CreateEventInput) {
    const session = await requireAuth();

    // Re-validate on the server — client-side validation can be bypassed.
    const parsed = createEventSchema.parse(data)

    const event = await prisma.event.create({
        data: {
            ...parsed,
            // Owner comes from the session, never from client input.
            hostId: session.user.id,
        }
    })

    // Clear the cached dashboard so the new event shows up immediately.
    revalidatePath("/dashboard");
    return event;
}

// Returns all events owned by the signed-in user, soonest first.
// Invitations and their RSVP responses are included so the dashboard
// can show response counts without extra queries.
export async function getHostEvents() {
    const session = await requireAuth();

    return prisma.event.findMany({
        where: {
            hostId: session.user.id,
        },
        orderBy: {
            eventDate: "asc"
        },
        include: {
            invitations: {
                include: {
                    response: true,
                }
            }
        }
    })
}

// Loads a single event for the event detail page, with its guest list
// (invitations ordered oldest-first) and each guest's response.
export async function getEventById(eventId: string) {
    const session = await requireAuth();

    // Filtering by hostId as well as id means requesting someone else's
    // event behaves exactly like a missing event.
    const event = await prisma.event.findFirst({
        where: {
            id: eventId, hostId: session.user.id,
        },
        include: {
            invitations: {
                include: { response: true },
                orderBy: { createdAt: "asc" },
            }
        }
    })

    if (!event) throw new Error("Event not found");

    return event;
}
