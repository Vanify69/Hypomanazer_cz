import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { isQueueAvailable, addCalendarReminderJob, removeCalendarReminderJob } from "../lib/queue.js";
import { getEmailProvider, buildEventCreatedEmailBody, type CalendarEmailEventData } from "../lib/email.js";
import { getFrontendBaseUrl } from "../lib/frontendUrl.js";
import { pushEventToGoogle, deleteEventFromGoogle } from "../lib/google-calendar.js";

function trySyncToGoogle(userId: string, eventId: string) {
  pushEventToGoogle(userId, eventId).catch((err) =>
    console.error("[Calendar] Google sync selhala:", err)
  );
}

function tryDeleteFromGoogle(userId: string, googleEventId: string | null) {
  if (!googleEventId) return;
  deleteEventFromGoogle(userId, googleEventId).catch((err) =>
    console.error("[Calendar] Google delete selhala:", err)
  );
}

function scheduleReminder(eventId: string, userId: string, startAt: Date, reminderMinutes: number | null) {
  if (reminderMinutes == null || !isQueueAvailable()) return;
  const reminderTime = new Date(startAt.getTime() - reminderMinutes * 60_000);
  const delayMs = reminderTime.getTime() - Date.now();
  if (delayMs <= 0) return;
  addCalendarReminderJob({ eventId, userId }, delayMs).catch((err) =>
    console.error("[Calendar] Nepodařilo se naplánovat připomínku:", err)
  );
}

const router = Router();
router.use(requireAuth);

// GET /api/calendar/events — seznam událostí s filtry
router.get("/events", async (req, res) => {
  const userId = (req as any).user.userId;
  const { dateFrom, dateTo, type, caseId, leadId, status } = req.query as Record<string, string | undefined>;

  const where: any = { userId };

  if (dateFrom || dateTo) {
    where.startAt = {};
    if (dateFrom) where.startAt.gte = new Date(dateFrom);
    if (dateTo) where.startAt.lte = new Date(dateTo);
  }
  if (type) where.type = type;
  if (caseId) where.caseId = caseId;
  if (leadId) where.leadId = leadId;
  if (status) where.status = status;
  else where.status = { not: "cancelled" };

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: {
      case: { select: { id: true, jmeno: true } },
      lead: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.json(events);
});

// GET /api/calendar/events/:id — detail události
router.get("/events/:id", async (req, res) => {
  const userId = (req as any).user.userId;
  const event = await prisma.calendarEvent.findFirst({
    where: { id: req.params.id, userId },
    include: {
      case: { select: { id: true, jmeno: true } },
      lead: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!event) {
    res.status(404).json({ error: "Událost nenalezena." });
    return;
  }
  res.json(event);
});

const VALID_TYPES = ["meeting", "task", "reminder", "call"];

// POST /api/calendar/events — vytvoření události
router.post("/events", async (req, res) => {
  const userId = (req as any).user.userId;
  const { title, description, type, startAt, endAt, allDay, location, caseId, leadId, reminderMinutes } = req.body;

  if (!title?.trim()) {
    res.status(400).json({ error: "Název události je povinný." });
    return;
  }
  if (!type || !VALID_TYPES.includes(type)) {
    res.status(400).json({ error: `Neplatný typ. Povolené: ${VALID_TYPES.join(", ")}` });
    return;
  }
  if (!startAt) {
    res.status(400).json({ error: "Datum začátku je povinný." });
    return;
  }

  const parsedStart = new Date(startAt);
  const parsedEnd = endAt ? new Date(endAt) : null;
  const parsedReminder = reminderMinutes != null ? Number(reminderMinutes) : null;

  const event = await prisma.calendarEvent.create({
    data: {
      userId,
      title: title.trim(),
      description: description?.trim() || null,
      type,
      startAt: parsedStart,
      endAt: parsedEnd,
      allDay: Boolean(allDay),
      location: location?.trim() || null,
      caseId: caseId || null,
      leadId: leadId || null,
      reminderMinutes: parsedReminder,
    },
    include: {
      case: { select: { id: true, jmeno: true } },
      lead: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  scheduleReminder(event.id, userId, parsedStart, parsedReminder);

  // Auto-sync do Google Calendar (pokud je připojený)
  trySyncToGoogle(userId, event.id);

  // Odeslat potvrzovací email vlastníkovi (asynchronně, nečekáme na výsledek)
  (async () => {
    try {
      const emailProvider = getEmailProvider();
      if (!emailProvider) return;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      if (!user?.email) return;
      const eventData: CalendarEmailEventData = {
        title: event.title,
        type: event.type,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        location: event.location,
        caseName: event.case?.jmeno ?? null,
        eventUrl: `${getFrontendBaseUrl()}/calendar`,
      };
      const { subject, html } = buildEventCreatedEmailBody(eventData, user.name ?? user.email);
      await emailProvider.send(user.email, subject, html);
    } catch (err) {
      console.error("[Calendar] Email notifikace selhala:", err);
    }
  })();

  res.status(201).json(event);
});

// PUT /api/calendar/events/:id — úprava události
router.put("/events/:id", async (req, res) => {
  const userId = (req as any).user.userId;
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: req.params.id, userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Událost nenalezena." });
    return;
  }

  const { title, description, type, startAt, endAt, allDay, location, caseId, leadId, reminderMinutes, status } = req.body;

  const data: any = {};
  if (title !== undefined) data.title = title.trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (type !== undefined) {
    if (!VALID_TYPES.includes(type)) {
      res.status(400).json({ error: `Neplatný typ. Povolené: ${VALID_TYPES.join(", ")}` });
      return;
    }
    data.type = type;
  }
  if (startAt !== undefined) data.startAt = new Date(startAt);
  if (endAt !== undefined) data.endAt = endAt ? new Date(endAt) : null;
  if (allDay !== undefined) data.allDay = Boolean(allDay);
  if (location !== undefined) data.location = location?.trim() || null;
  if (caseId !== undefined) data.caseId = caseId || null;
  if (leadId !== undefined) data.leadId = leadId || null;
  if (reminderMinutes !== undefined) data.reminderMinutes = reminderMinutes != null ? Number(reminderMinutes) : null;
  if (status !== undefined) data.status = status;

  const event = await prisma.calendarEvent.update({
    where: { id: req.params.id },
    data,
    include: {
      case: { select: { id: true, jmeno: true } },
      lead: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (startAt !== undefined || reminderMinutes !== undefined) {
    removeCalendarReminderJob(event.id).catch(() => {});
    scheduleReminder(event.id, userId, event.startAt, event.reminderMinutes);
  }

  trySyncToGoogle(userId, event.id);

  res.json(event);
});

// PATCH /api/calendar/events/:id/complete — označení úkolu jako splněného
router.patch("/events/:id/complete", async (req, res) => {
  const userId = (req as any).user.userId;
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: req.params.id, userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Událost nenalezena." });
    return;
  }

  const newStatus = existing.status === "completed" ? "active" : "completed";
  const event = await prisma.calendarEvent.update({
    where: { id: req.params.id },
    data: { status: newStatus },
    include: {
      case: { select: { id: true, jmeno: true } },
      lead: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (newStatus === "completed") {
    removeCalendarReminderJob(event.id).catch(() => {});
  } else {
    scheduleReminder(event.id, userId, event.startAt, event.reminderMinutes);
  }

  res.json(event);
});

// DELETE /api/calendar/events/:id — smazání události
router.delete("/events/:id", async (req, res) => {
  const userId = (req as any).user.userId;
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: req.params.id, userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Událost nenalezena." });
    return;
  }

  removeCalendarReminderJob(req.params.id).catch(() => {});
  tryDeleteFromGoogle(userId, existing.googleEventId);
  await prisma.calendarEvent.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export { router as calendarRouter };
