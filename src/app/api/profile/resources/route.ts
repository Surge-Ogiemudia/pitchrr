import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnectShared } from '@/lib/db';
import { getStartupProfileModel } from '@/models/StartupProfile';
import { put } from '@vercel/blob';

// pdf-parse is imported dynamically inside the route to bypass Turbopack ESM default export strictness

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const type = formData.get('type') as string;
    const format = formData.get('format') as string;
    const file = formData.get('file') as File | null;
    let url = formData.get('url') as string;

    if (!title || !type || !format) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let extractedContext = '';

    if (file) {
      // Upload to Vercel Blob
      const blob = await put(file.name, file, { access: 'public' });
      url = blob.url;

      // Extract text if PDF
      if (format === 'pdf') {
        try {
          const pdfParse = require('pdf-parse');
          const buffer = Buffer.from(await file.arrayBuffer());
          const pdfData = await pdfParse(buffer);
          extractedContext = pdfData.text;
        } catch (parseErr) {
          console.error('Failed to parse PDF:', parseErr);
        }
      }
    } else if (format === 'youtube' && url) {
      // Basic extraction placeholder for YouTube
      extractedContext = `YouTube Video Link: ${url}`;
    } else if (!url) {
      return NextResponse.json({ error: 'File or URL is required' }, { status: 400 });
    }

    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);
    const doc = await StartupProfile.findOne({ userId: session.user.id });
    if (!doc) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const newResource = {
      title,
      type,
      format,
      url,
      extractedContext,
      addedAt: new Date()
    };

    doc.resources.push(newResource);
    await doc.save();

    return NextResponse.json({ success: true, resource: newResource });
  } catch (error) {
    console.error('Failed to add resource:', error);
    return NextResponse.json({ error: 'Failed to add resource' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Resource ID required' }, { status: 400 });

    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);
    const doc = await StartupProfile.findOne({ userId: session.user.id });
    if (!doc) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    doc.resources = doc.resources.filter((r: any) => r._id.toString() !== id);
    await doc.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete resource:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
