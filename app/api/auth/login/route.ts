import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/mysql';
import { createToken, setAuthCookie } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  username: string;
  password: string;
  profile_picture: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find user
    const [users] = await pool.execute<UserRow[]>(
      'SELECT id, email, username, password, profile_picture FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    const user = users[0];
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Create token and set cookie
    const token = await createToken({
      userId: user.id.toString(),
      email: user.email,
      username: user.username,
    });
    
    await setAuthCookie(token);
    
    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        username: user.username,
        profilePicture: user.profile_picture || null,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
