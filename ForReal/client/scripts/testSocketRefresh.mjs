import { io } from 'socket.io-client';

const SERVER = process.env.SERVER || 'http://localhost:5000';

async function registerUser(suffix) {
  const body = {
    username: `e2e_refresh_${suffix}`,
    email: `e2e_refresh_${suffix}@example.com`,
    password: 'Test1234!',
    displayName: `E2E Refresh ${suffix}`,
  };

  const res = await fetch(`${SERVER}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`register failed: ${res.status} ${txt}`);
  }
  return res.json(); // { token, refreshToken, user }
}

async function main() {
  try {
    const suffix = Date.now() % 100000;
    console.log('Registering test user...');
    const data = await registerUser(suffix);
    console.log('Registered user', data.user._id);

    const validToken = data.token;
    const refreshToken = data.refreshToken;

    // Intentionally use an invalid/expired access token and provide refresh token in handshake
    const badToken = 'invalid_or_expired_token';

    const socket = io(SERVER, { auth: { token: badToken, refreshToken }, transports: ['websocket'] });

    socket.on('connect', () => console.log('Socket connected, id=', socket.id));
    socket.on('connect_error', (err) => console.error('connect_error', err && err.message));
    socket.on('auth:refreshed', (p) => console.log('auth:refreshed ->', p));
    socket.on('room:members:update', (p) => console.log('room:members:update', p));

    // Join a test room after a short delay
    setTimeout(() => {
      socket.emit('room:join', { roomId: '6a0888053756e3758fdc15f4' }, (ack) => console.log('join ack', ack));
    }, 1000);

    setTimeout(() => {
      socket.close();
      process.exit(0);
    }, 6000);
  } catch (err) {
    console.error('Test failed', err);
    process.exit(1);
  }
}

main();
