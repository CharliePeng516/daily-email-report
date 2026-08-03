'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionCookieValue, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, verifyPassword } from '../../lib/auth';

export async function login(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/');

  if (!verifyPassword(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, createSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });

  redirect(next.startsWith('/') ? next : '/');
}
