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
  
    const { rule } = await req.json();
    if (!rule?.trim()) return NextResponse.json({ error: 'No rule provided' }, { status: 400 });

    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);

    await StartupProfile.updateOne({}, { $push: { draftingRules: rule.trim() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save drafting rule:', error);
    return NextResponse.json({ error: 'Failed to save rule' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);
    const profile = await StartupProfile.findOne({ userId: session.user.id }).select('draftingRules').lean();
    return NextResponse.json({ rules: (profile as any)?.draftingRules || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}
