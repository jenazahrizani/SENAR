import { defineMiddleware } from 'astro/middleware';
import { adminAuth } from './lib/firebase-admin';

export const onRequest = defineMiddleware(async (context, next) => {
  // Hanya proteksi untuk rute /admin/*
  if (context.url.pathname.startsWith('/admin')) {
    const sessionCookie = context.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      return context.redirect('/login-9x4k');
    }

    try {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
      if (decodedClaims.role !== 'admin') {
        context.cookies.delete('session', { path: '/' });
        return context.redirect('/login-9x4k');
      }
    } catch (error) {
      context.cookies.delete('session', { path: '/' });
      return context.redirect('/login-9x4k');
    }
  }

  return next();
});