const USER_ID_KEY = 'portfolio-anonymous-user-id';
const USER_REGISTERED_KEY = 'portfolio-user-registered';

function getOrCreateUserId() {
  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

export function registerUserOnce() {
  if (localStorage.getItem(USER_REGISTERED_KEY) === '1') {
    return;
  }

  const userId = getOrCreateUserId();

  fetch('/.netlify/functions/register-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
    keepalive: true,
  })
    .then((response) => {
      if (response.ok) {
        localStorage.setItem(USER_REGISTERED_KEY, '1');
      }
    })
    .catch(() => {});
}
