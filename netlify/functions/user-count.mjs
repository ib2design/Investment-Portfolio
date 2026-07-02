import { getStore } from '@netlify/blobs';

const STORE_NAME = 'portfolio-users';

async function countUsers(store) {
  let count = 0;
  let cursor;

  do {
    const page = await store.list({ cursor });
    count += page.blobs.length;
    cursor = page.cursor;
  } while (cursor);

  return count;
}

export default async (request) => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  const count = await countUsers(store);

  return Response.json({ count });
};
