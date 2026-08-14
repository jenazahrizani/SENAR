import type { APIRoute } from 'astro';
import { adminAuth } from '../../../lib/firebase-admin';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const { idToken } = await request.json();
  
  if (!idToken) {
    return new Response('Missing ID token', { status: 400 });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (decodedToken.role !== 'admin') {
      return new Response('Unauthorized', { status: 403 });
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: 60 * 60 * 24 * 5 * 1000,
    });

    cookies.set('session', sessionCookie, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 5,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response('Authentication failed', { status: 401 });
  }
};