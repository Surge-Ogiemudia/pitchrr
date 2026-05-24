import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnectShared } from '@/lib/db';
import { getStartupProfileModel } from '@/models/StartupProfile';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const { title, content, theme } = await req.json();
    if (!title || !content) return NextResponse.json({ error: 'title and content required' }, { status: 400 });

    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);
    const doc = await StartupProfile.findOne({ userId: session.user.id });
    if (!doc) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    (doc as any).stories = [...((doc as any).stories || []), { title, content, theme: theme || 'other', addedAt: new Date() }];
    await doc.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save story' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { title } = await req.json();
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);
    const doc = await StartupProfile.findOne({ userId: session.user.id });
    if (!doc) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    (doc as any).stories = ((doc as any).stories || []).filter((s: any) => s.title !== title);
    await doc.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete story' }, { status: 500 });
  }
}
