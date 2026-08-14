import type { APIRoute } from 'astro';
import { adminDb, adminAuth } from '../../../lib/firebase-admin';
export const prerender = false;

// GET - semua chord
export const GET: APIRoute = async ({ cookies }) => {
  const sessionCookie = cookies.get('session')?.value;
  if (!sessionCookie) return new Response('Unauthorized', { status: 401 });
  
  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const snapshot = await adminDb.collection('chords').orderBy('title').get();
  const chords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return new Response(JSON.stringify(chords), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST - tambah chord
export const POST: APIRoute = async ({ request, cookies }) => {
  const sessionCookie = cookies.get('session')?.value;
  if (!sessionCookie) return new Response('Unauthorized', { status: 401 });
  
  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const { title, artist, key, content } = await request.json();
  if (!title || !artist || !content) {
    return new Response('Missing fields', { status: 400 });
  }

  const docRef = await adminDb.collection('chords').add({
    title,
    artist,
    key: key || '',
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return new Response(JSON.stringify({ id: docRef.id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};