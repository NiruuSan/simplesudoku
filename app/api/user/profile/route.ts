import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { getCurrentUser } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  username: string;
  profile_picture: string | null;
  created_at: Date;
}

// GET user profile
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const [users] = await pool.execute<UserRow[]>(
      'SELECT id, email, username, profile_picture, created_at FROM users WHERE id = ?',
      [currentUser.userId]
    );
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profilePicture: user.profile_picture,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}

// PUT update user profile
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const { email, username, profilePicture } = await request.json();
    
    const [users] = await pool.execute<UserRow[]>(
      'SELECT id, email, username, profile_picture FROM users WHERE id = ?',
      [currentUser.userId]
    );
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];
    
    let newEmail = user.email;
    let newUsername = user.username;
    let newProfilePicture = user.profile_picture;

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const [existingEmails] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.toLowerCase(), currentUser.userId]
      );
      if (existingEmails.length > 0) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
      newEmail = email.toLowerCase();
    }

    // Check if username is already taken by another user
    if (username && username !== user.username) {
      const [existingUsernames] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, currentUser.userId]
      );
      if (existingUsernames.length > 0) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 400 }
        );
      }
      if (username.length < 3) {
        return NextResponse.json(
          { error: 'Username must be at least 3 characters' },
          { status: 400 }
        );
      }
      newUsername = username;
    }

    // Update profile picture (base64 string)
    if (profilePicture !== undefined) {
      newProfilePicture = profilePicture;
    }

    await pool.execute<ResultSetHeader>(
      'UPDATE users SET email = ?, username = ?, profile_picture = ? WHERE id = ?',
      [newEmail, newUsername, newProfilePicture, currentUser.userId]
    );

    return NextResponse.json({
      success: true,
      user: {
        email: newEmail,
        username: newUsername,
        profilePicture: newProfilePicture,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
