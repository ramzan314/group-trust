import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { logSystemActivity } from '../utils/audit';

const router = Router();

const CreateMeetingSchema = z.object({
  groupId: z.string(),
  title: z.string().min(2),
  date: z.string().transform((str) => new Date(str)),
  location: z.string().optional(),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  minutes: z.string().optional(),
});

// Create a meeting
router.post('/', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const validated = CreateMeetingSchema.parse(req.body);

    const meeting = await prisma.meeting.create({
      data: {
        groupId: validated.groupId,
        title: validated.title,
        date: validated.date,
        location: validated.location || null,
        gpsLat: validated.gpsLat || null,
        gpsLng: validated.gpsLng || null,
        minutes: validated.minutes || null,
      },
    });

    await logSystemActivity(authReq.user!.id, 'MEETING_CREATE', `Scheduled meeting ${meeting.title} for group ${meeting.groupId}`);
    return res.status(201).json(meeting);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Meeting creation failed' });
  }
});

// Mark meeting attendance
router.post('/:id/attendance', authenticateJWT, requireRole(['NGO_ADMIN', 'SECRETARY']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { attendance } = req.body;
  const authReq = req as AuthenticatedRequest;

  if (!Array.isArray(attendance)) {
    return res.status(400).json({ error: 'Attendance must be an array of objects' });
  }

  try {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    await prisma.attendance.deleteMany({ where: { meetingId: id } });

    const attendanceData = attendance.map((att: any) => ({
      meetingId: id,
      memberId: att.memberId,
      status: att.status,
    }));

    await prisma.attendance.createMany({ data: attendanceData });

    await logSystemActivity(authReq.user!.id, 'MEETING_ATTENDANCE', `Logged attendance for meeting ${id}`);
    return res.json({ success: true, count: attendanceData.length });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// List meetings
router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  const { groupId } = req.query;
  try {
    const meetings = await prisma.meeting.findMany({
      where: groupId ? { groupId: String(groupId) } : {},
      include: {
        attendance: true,
      },
      orderBy: { date: 'desc' },
    });
    return res.json(meetings);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

export default router;
