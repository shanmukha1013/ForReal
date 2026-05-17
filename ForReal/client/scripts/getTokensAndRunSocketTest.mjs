import { io } from 'socket.io-client';

const SERVER = process.env.SERVER || 'http://localhost:5000';
const roomId = process.argv[2] || '6a0888053756e3758fdc15f4';

async function registerUser(suffix) {
  const body = {
    username: `e2e_user_${suffix}`,
    email: `e2e_user_${suffix}@example.com`,
    password: 'Test1234!',
    displayName: `E2E ${suffix}`,
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
  const json = await res.json();
  return json; // { token, user }
}

function connectClient(name, token, sendMessage = false) {
  const socket = io(SERVER, { auth: { token }, transports: ['websocket'] });

  socket.on('connect', () => {
    console.log(`${name} connected, id=${socket.id}`);
    socket.emit('room:join', { roomId }, (ack) => {
      console.log(`${name} join ack:`, ack);
      if (sendMessage) {
        setTimeout(() => {
          socket.emit('message:send', { roomId, text: `Hello from ${name}` }, (r) => console.log(`${name} send ack:`, r));
        }, 400);
      }
    });
  });

  socket.on('message:new', (payload) => console.log(`${name} received message:new ->`, payload));
  socket.on('room:members:update', (payload) => console.log(`${name} received room:members:update ->`, payload));
  socket.on('connect_error', (err) => console.error(`${name} connect_error`, err.message));
  socket.on('disconnect', (reason) => console.log(`${name} disconnected:`, reason));

  return socket;
}

async function main() {
  try {
    const suffix1 = Date.now() % 100000;
    const suffix2 = (Date.now() + 1) % 100000;
    console.log('Registering two test users...');
    const a = await registerUser(suffix1);
    console.log('User1 registered:', a.user._id);
    const b = await registerUser(suffix2);
    console.log('User2 registered:', b.user._id);

    const token1 = a.token;
    const token2 = b.token;

    const c1 = connectClient('Client1', token1, true);
    const c2 = connectClient('Client2', token2, false);
    // After both clients connected, create a room via REST as user1 and verify client2 receives rooms:new
    setTimeout(async () => {
      try {
        console.log('Creating room via API as Client1');
        const createResp = await fetch(`${SERVER}/api/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
          body: JSON.stringify({ title: `E2E room ${Date.now()}`, description: 'Realtime test room' }),
        });
        const created = await createResp.json();
        console.log('Create room response:', createResp.status, created?.room?._id || created?.room);
      } catch (err) {
        console.error('Room creation failed', err);
      }

      // keep process alive a little to observe events, then close
      setTimeout(() => {
        console.log('Closing sockets');
        c1.close();
        c2.close();
        process.exit(0);
      }, 4000);

    }, 1200);
  } catch (err) {
    console.error('Test failed', err);
    process.exit(1);
  }
}

main();
