import { getStore } from '@netlify/blobs';

const STORE_NAME = 'portfolio-users';

function isValidUserId(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const userId = body?.userId;

  if (!isValidUserId(userId)) {
    return new Response('Invalid user id', { status: 400 });
  }

  const store = getStore({ name: STORE_NAME, consistency: 'strong' });

  await store.setJSON(
    userId,
    { firstSeen: new Date().toISOString() },
    { onlyIfNew: true },
  );

  return Response.json({ ok: true });
};
