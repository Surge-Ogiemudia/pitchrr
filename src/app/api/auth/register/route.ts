import { NextResponse } from 'next/server';
import { dbConnectShared } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { name, email, password, persona } = await req.json();

    if (!name || !email || !password || !persona) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnectShared();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      persona
    });

    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
