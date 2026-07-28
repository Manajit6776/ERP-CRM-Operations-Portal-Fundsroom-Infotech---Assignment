import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import pool from '../config/db';
import { ENV } from '../config/env';
import { UserPayload } from '../types/index';
import { UnauthorizedError } from '../utils/errors';

export async function loginUser(email: string, pass: string) {
  const [rows]: any = await pool.query(
    `SELECT id, name, email, password_hash, role FROM users WHERE email = ?`,
    [email]
  );

  if (rows.length === 0) {
    throw new UnauthorizedError('Invalid credentials provided');
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(pass, user.password_hash);

  if (!isMatch) {
    throw new UnauthorizedError('Invalid credentials provided');
  }

  const payload: UserPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  const secret: Secret = ENV.JWT_SECRET;
  const options: SignOptions = { expiresIn: ENV.JWT_EXPIRES_IN as any };

  const token = jwt.sign(payload, secret, options);

  return {
    token,
    user: payload
  };
}

export async function getUserById(id: number) {
  const [rows]: any = await pool.query(
    `SELECT id, name, email, role, created_at FROM users WHERE id = ?`,
    [id]
  );
  if (rows.length === 0) {
    throw new UnauthorizedError('User not found');
  }
  return rows[0];
}
