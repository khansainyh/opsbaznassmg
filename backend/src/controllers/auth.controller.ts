import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ status: 'error', message: 'Email dan Password wajib diisi.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({ status: 'error', message: 'Email atau password yang Anda masukkan salah. Silakan periksa kembali dan coba lagi.' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ status: 'error', message: 'Email atau password yang Anda masukkan salah. Silakan periksa kembali dan coba lagi.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'rahasia_baznas_temp_secret',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server.' });
  }
};
