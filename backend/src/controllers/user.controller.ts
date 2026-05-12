import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { Role } from '@prisma/client';

const DEFAULT_PASSWORD = 'password123';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, role } = req.body;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email sudah terdaftar di sistem.' });
    }

    const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: role as Role,
        password_hash
      }
    });

    res.json(newUser);
  } catch (error: any) {
    console.error('Create User Error:', error);
    res.status(500).json({ error: 'Gagal membuat user baru pada database.' });
  }
};

export const bulkCreateUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users: { name: string, email: string, role: string }[] = req.body;
    const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    let createdCount = 0;
    
    // We process them one by one to ignore duplicates instead of full crash
    for (const u of users) {
      if (!u.email || !u.name || !u.role) continue;
      
      const exists = await prisma.user.findUnique({ where: { email: u.email } });
      if (!exists) {
        await prisma.user.create({
          data: {
            name: u.name,
            email: u.email,
            role: u.role as Role,
            password_hash
          }
        });
        createdCount++;
      }
    }

    res.json({ message: `Successfully imported ${createdCount} users.` });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, email, role, resetPassword } = req.body;

    // Check if email belongs to ANOTHER user
    const existing = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Email tersebut sudah digunakan oleh akun lain.' });
    }

    const data: any = { name, email, role: role as Role };
    if (resetPassword) {
      data.password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data
    });

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Update User Error:', error);
    res.status(500).json({ error: 'Gagal memperbarui data user.' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.user.delete({
      where: { id }
    });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Password lama dan password baru wajib diisi.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Password lama salah. Silakan coba lagi.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { password_hash: newHash }
    });

    res.json({ message: 'Password berhasil diperbarui.' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ error: 'Gagal memperbarui password.' });
  }
};
