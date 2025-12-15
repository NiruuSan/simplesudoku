import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool, { initDatabase } from '@/lib/mysql';
import { createToken, setAuthCookie } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    // Initialize database tables if they don't exist
    await initDatabase();
    
    const { email, username, password } = await request.json();
    
    // Validation
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }
    
    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const [existingEmails] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    
    if (existingEmails.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }
    
    // Check if username already exists
    const [existingUsernames] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUsernames.length > 0) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      );
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
      [email.toLowerCase(), username, hashedPassword]
    );
    
    const userId = result.insertId;
    
    // Create token and set cookie
    const token = await createToken({
      userId: userId.toString(),
      email: email.toLowerCase(),
      username,
    });
    
    await setAuthCookie(token);
    
    return NextResponse.json({
      success: true,
      user: {
        email: email.toLowerCase(),
        username,
        profilePicture: null,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
