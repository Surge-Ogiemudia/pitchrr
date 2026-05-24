import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnectShared } from '@/lib/db';
import { getStartupProfileModel, TRACKED_PROFILE_FIELDS } from '@/models/StartupProfile';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);
    const profile = await StartupProfile.findOne({ userId: session.user.id }).lean();
    return NextResponse.json(profile ?? null);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { field, value } = await req.json();
    if (!field || value === undefined) {
      return NextResponse.json({ error: 'field and value required' }, { status: 400 });
    }

    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);
    const doc = await StartupProfile.findOne({ userId: session.user.id });
    if (!doc) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    if (TRACKED_PROFILE_FIELDS.has(field)) {
      (doc as any)[field] = { value, source: 'manual', updatedAt: new Date() };
    } else {
      const existingIdx = (doc.dynamicFields as any[]).findIndex((f: any) => f.key === field);
      if (existingIdx >= 0) {
        (doc.dynamicFields as any[])[existingIdx].value = value;
      } else {
        (doc.dynamicFields as any[]).push({ key: field, value, source: 'manual', confidence: 1, addedAt: new Date() });
      }
    }

    await doc.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update profile:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { key } = await req.json();
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);
    const doc = await StartupProfile.findOne({ userId: session.user.id });
    if (!doc) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    (doc as any).dynamicFields = (doc.dynamicFields as any[]).filter((f: any) => f.key !== key);
    await doc.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete fact:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
