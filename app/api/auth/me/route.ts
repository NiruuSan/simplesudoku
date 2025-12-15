import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { getCurrentUser } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  username: string;
  profile_picture: string | null;
}

export async function GET() {
  try {
    const tokenUser = await getCurrentUser();
    
    if (!tokenUser) {
      return NextResponse.json(
        { user: null },
        { status: 200 }
      );
    }
    
    // Get full user data from database (including profile picture)
    const [users] = await pool.execute<UserRow[]>(
      'SELECT id, email, username, profile_picture FROM users WHERE id = ?',
      [tokenUser.userId]
    );
    
    if (users.length === 0) {
      return NextResponse.json(
        { user: null },
        { status: 200 }
      );
    }
    
    const user = users[0];
    
    return NextResponse.json({
      user: {
        email: user.email,
        username: user.username,
        profilePicture: user.profile_picture || null,
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { user: null },
      { status: 200 }
    );
  }
}
