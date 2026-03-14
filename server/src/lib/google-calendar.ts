/**
 * Google Calendar API wrapper – CRUD operace nad událostmi.
 * Obousměrná synchronizace: local → Google, Google → local.
 */
import { google, calendar_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma.js";
import { getAuthenticatedClient } from "./google-auth.js";

function getCalendarApi(auth: OAuth2Client): calendar_v3.Calendar {
  return google.calendar({ version: "v3", auth });
}

const TYPE_COLOR_MAP: Record<string, string> = {
  meeting: "1",   // Lavender
  task: "5",      // Banana
  reminder: "6",  // Tangerine
  call: "10",     // Basil
};

// --- Push do Google Calendar ---

export async function pushEventToGoogle(
  userId: string,
  eventId: string
): Promise<string | null> {
  const client = await getAuthenticatedClient(userId);
  if (!client) return null;

  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) return null;

  const calendar = getCalendarApi(client);
  const body = buildGoogleEventBody(event);

  if (event.googleEventId) {
    await calendar.events.update({
      calendarId: "primary",
      eventId: event.googleEventId,
      requestBody: body,
    });
    await prisma.calendarEvent.update({
      where: { id: eventId },
      data: { lastSyncedAt: new Date() },
    });
    return event.googleEventId;
  }

  const result = await calendar.events.insert({
    calendarId: "primary",
    requestBody: body,
  });

  const googleEventId = result.data.id ?? null;
  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      googleEventId,
      googleCalendarId: "primary",
      lastSyncedAt: new Date(),
    },
  });

  return googleEventId;
}

export async function deleteEventFromGoogle(
  userId: string,
  googleEventId: string
): Promise<void> {
  const client = await getAuthenticatedClient(userId);
  if (!client) return;

  const calendar = getCalendarApi(client);
  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
    });
  } catch (err: any) {
    if (err?.code === 404 || err?.code === 410) return;
    throw err;
  }
}

/**
 * Hromadná synchronizace: pošle všechny aktivní události uživatele do Google Calendar.
 * Vrátí počet úspěšně synchronizovaných událostí.
 */
export async function syncAllEventsToGoogle(userId: string): Promise<number> {
  const client = await getAuthenticatedClient(userId);
  if (!client) return 0;

  const events = await prisma.calendarEvent.findMany({
    where: { userId, status: { not: "cancelled" } },
    orderBy: { startAt: "asc" },
  });

  let synced = 0;
  for (const event of events) {
    try {
      await pushEventToGoogle(userId, event.id);
      synced++;
    } catch (err) {
      console.error(`[GoogleCalendar] Sync failed for event ${event.id}:`, err);
    }
  }

  return synced;
}

/**
 * Stáhne události z Google Calendar a uloží/aktualizuje je v naší DB.
 */
export async function pullEventsFromGoogle(
  userId: string,
  timeMin?: Date,
  timeMax?: Date
): Promise<number> {
  const client = await getAuthenticatedClient(userId);
  if (!client) return 0;

  const calendar = getCalendarApi(client);
  const now = new Date();
  const params: calendar_v3.Params$Resource$Events$List = {
    calendarId: "primary",
    timeMin: (timeMin ?? new Date(now.getFullYear(), now.getMonth() - 1, 1)).toISOString(),
    timeMax: (timeMax ?? new Date(now.getFullYear(), now.getMonth() + 3, 0)).toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  };

  const response = await calendar.events.list(params);
  const items = response.data.items ?? [];

  let imported = 0;
  for (const gEvent of items) {
    if (!gEvent.id || !gEvent.summary) continue;

    const existing = await prisma.calendarEvent.findFirst({
      where: { googleEventId: gEvent.id, userId },
    });

    const startAt = gEvent.start?.dateTime
      ? new Date(gEvent.start.dateTime)
      : gEvent.start?.date
        ? new Date(gEvent.start.date)
        : null;
    const endAt = gEvent.end?.dateTime
      ? new Date(gEvent.end.dateTime)
      : gEvent.end?.date
        ? new Date(gEvent.end.date)
        : null;
    const allDay = !gEvent.start?.dateTime;

    if (!startAt) continue;

    if (existing) {
      await prisma.calendarEvent.update({
        where: { id: existing.id },
        data: {
          title: gEvent.summary,
          description: gEvent.description || null,
          startAt,
          endAt,
          allDay,
          location: gEvent.location || null,
          lastSyncedAt: new Date(),
        },
      });
    } else {
      await prisma.calendarEvent.create({
        data: {
          userId,
          title: gEvent.summary,
          description: gEvent.description || null,
          type: "meeting",
          startAt,
          endAt,
          allDay,
          location: gEvent.location || null,
          googleEventId: gEvent.id,
          googleCalendarId: "primary",
          lastSyncedAt: new Date(),
        },
      });
    }
    imported++;
  }

  return imported;
}

// --- Helpers ---

function buildGoogleEventBody(
  event: {
    title: string;
    description: string | null;
    type: string;
    startAt: Date;
    endAt: Date | null;
    allDay: boolean;
    location: string | null;
    reminderMinutes: number | null;
  }
): calendar_v3.Schema$Event {
  const body: calendar_v3.Schema$Event = {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    colorId: TYPE_COLOR_MAP[event.type] ?? "1",
  };

  if (event.allDay) {
    const dateStr = event.startAt.toISOString().split("T")[0];
    body.start = { date: dateStr };
    const endDate = event.endAt ?? new Date(event.startAt.getTime() + 86400_000);
    body.end = { date: endDate.toISOString().split("T")[0] };
  } else {
    body.start = {
      dateTime: event.startAt.toISOString(),
      timeZone: "Europe/Prague",
    };
    body.end = {
      dateTime: (event.endAt ?? new Date(event.startAt.getTime() + 3600_000)).toISOString(),
      timeZone: "Europe/Prague",
    };
  }

  if (event.reminderMinutes != null) {
    body.reminders = {
      useDefault: false,
      overrides: [{ method: "popup", minutes: event.reminderMinutes }],
    };
  }

  return body;
}
