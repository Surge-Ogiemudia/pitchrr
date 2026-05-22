import { NextResponse } from 'next/server';
import { dbConnectShared } from '@/lib/db';
import { getStartupProfileModel } from '@/models/StartupProfile';

export async function GET() {
  try {
    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);
    
    let profile = await StartupProfile.findOne().lean();
    if (!profile) {
      // Return empty if not found
      return NextResponse.json(null);
    }
    
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
