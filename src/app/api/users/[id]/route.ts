import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(`${BACKEND_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove user' }, { status: 500 });
  }
}
