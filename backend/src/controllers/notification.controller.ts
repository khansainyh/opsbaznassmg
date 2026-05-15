import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.status(200).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};
