import { io } from 'socket.io-client';

const SERVER = 'http://localhost:5000';
const roomId = process.argv[2] || '6a0888053756e3758fdc15f4';
const token1 = process.env.TOKEN1;
const token2 = process.env.TOKEN2;

function connectClient(name, token) {
  const socket = io(SERVER, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log(`${name} connected, id=${socket.id}`);
    socket.emit('room:join', { roomId }, (ack) => {
      console.log(`${name} join ack:`, ack);
    });
  });

  socket.on('room:members:update', (payload) => {
    console.log(`${name} received room:members:update ->`, payload);
  });

  socket.on('connect_error', (err) => console.error(`${name} connect_error`, err.message));
  socket.on('disconnect', (reason) => console.log(`${name} disconnected:`, reason));

  return socket;
}

async function main(){
  if (!token1 || !token2) {
    console.error('Set TOKEN1 and TOKEN2 env vars');
    process.exit(1);
  }

  const c1 = connectClient('Client1', token1);
  const c2 = connectClient('Client2', token2);

  // keep process alive a bit to receive events
  setTimeout(()=>{
    console.log('Closing sockets');
    c1.close(); c2.close();
    process.exit(0);
  }, 8000);
}

main();
