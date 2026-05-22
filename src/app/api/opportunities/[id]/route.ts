import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Opportunity from '@/models/Opportunity';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const opportunity = await Opportunity.findById(id).lean();
    if (!opportunity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(opportunity);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const body = await req.json();
    const opportunity = await Opportunity.findByIdAndUpdate(id, body, { new: true }).lean();
    return NextResponse.json(opportunity);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    await Opportunity.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
