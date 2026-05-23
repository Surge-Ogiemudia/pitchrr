import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Opportunity from '@/models/Opportunity';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const archived = searchParams.get('archived') === 'true';
    const opportunities = await Opportunity.find({ archived }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(opportunities);
  } catch (error) {
    console.error('Failed to fetch opportunities:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const opportunity = await Opportunity.create(body);
    return NextResponse.json(opportunity);
  } catch (error) {
    console.error('Failed to create opportunity:', error);
    return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 });
  }
}
