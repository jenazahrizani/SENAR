import type { APIRoute } from 'astro';
import { adminDb, adminAuth } from '../../../../lib/firebase-admin';
export const prerender = false;

// DELETE
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const sessionCookie = cookies.get('session')?.value;
  if (!sessionCookie) return new Response('Unauthorized', { status: 401 });
  
  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response('Missing ID', { status: 400 });
  }

  await adminDb.collection('chords').doc(id).delete();
  return new Response(null, { status: 204 });
};

// PUT
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const sessionCookie = cookies.get('session')?.value;
  if (!sessionCookie) return new Response('Unauthorized', { status: 401 });
  
  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response('Missing ID', { status: 400 });
  }

  const { title, artist, key, content } = await request.json();
  if (!title || !artist || !content) {
    return new Response('Missing fields', { status: 400 });
  }

  await adminDb.collection('chords').doc(id).update({
    title,
    artist,
    key: key || '',
    content,
    updatedAt: new Date(),
  });

  return new Response(null, { status: 204 });
};