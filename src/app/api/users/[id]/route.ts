import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:4000/api';

function getForwardHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const auth = req.headers.get('authorization');
  if (auth) {
    headers['authorization'] = auth;
  } else {
    const token =
      req.cookies.get('siperu_auth_token')?.value ||
      req.cookies.get('siperu_access_token')?.value;
    if (token) {
      headers['authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(`${BACKEND_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getForwardHeaders(req),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove user' }, { status: 500 });
  }
}
