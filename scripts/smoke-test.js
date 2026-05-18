(async function(){
  const base = process.env.SMOKE_API_BASE || 'http://localhost:4000/api';
  const req = async (path, opts={}) => {
    const url = path.startsWith('http') ? path : base+path;
    const res = await fetch(url, opts);
    const headersObj = {};
    try { res.headers.forEach((v,k) => headersObj[k] = v); } catch (e) {}
    const t = await res.text();
    try { return { status: res.status, body: JSON.parse(t), headers: headersObj }; } catch(e){ return { status: res.status, body: t, headers: headersObj }; }
  };

  console.log('1) health');
  console.log(await req('/health'));

  console.log('\n2) register alice');
  const aliceReg = await req('/auth/register', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ username:'alice', email:'alice@example.com', password:'Password123', displayName:'Alice' }), credentials: 'include' });
  console.log(aliceReg);

  console.log('\n3) login alice');
  const aliceLogin = await req('/auth/login', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ identifier:'alice', password:'Password123' }) });
  console.log(aliceLogin);
  const aliceToken = aliceLogin.body.token;

  // derive alice id from token when /auth/me may be unavailable
  const tokenBody = (aliceToken || '').replace(/^mocktoken-/, '');
  const aliceIdMatch = tokenBody.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  const aliceId = aliceIdMatch ? aliceIdMatch[0] : null;
  console.log('\n4) me (alice) - fetching /auth/me may fail; using token-extracted id=', aliceId);

  console.log('\n5) register bob');
  let bobId = null;
  const bobReg = await req('/auth/register', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ username:'bob', email:'bob@example.com', password:'Password123', displayName:'Bob' }) });
  console.log(bobReg);
  if (bobReg.status === 201 && bobReg.body?.user?._id) {
    bobId = bobReg.body.user._id;
  } else {
    // bob likely exists already; attempt login to get id
    const bobLogin = await req('/auth/login', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ identifier:'bob', password:'Password123' }) });
    console.log('bob login fallback', bobLogin);
    const bobToken = bobLogin.body?.token;
    const bobTokenBody = (bobToken || '').replace(/^mocktoken-/, '');
    const bobIdMatch = bobTokenBody.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    bobId = bobIdMatch ? bobIdMatch[0] : null;
  }

  console.log('\n6) alice follows bob');
  console.log(await req(`http://localhost:4000/user/${bobId}/follow`, { method: 'POST', headers: { Authorization: `Bearer ${aliceToken}`, 'content-type':'application/json' } }));

  console.log('\n7) alice update settings');
  console.log(await req('http://localhost:4000/auth/update-settings', { method: 'PUT', headers: { Authorization: `Bearer ${aliceToken}`, 'content-type':'application/json' }, body: JSON.stringify({ bio:'Hi Im Alice', avatar: 'https://example.com/alice.png' }) }));

  console.log('\n8) create room');
  console.log(await req('/rooms', { method: 'POST', headers: { Authorization: `Bearer ${aliceToken}`, 'content-type':'application/json' }, body: JSON.stringify({ topic:'Smoke Test Room', description:'desc', category:'test' }) }));

  console.log('\n9) create post');
  console.log(await req('/posts', { method: 'POST', headers: { Authorization: `Bearer ${aliceToken}`, 'content-type':'application/json' }, body: JSON.stringify({ content:'Hello world from Alice', author: { username: 'alice' } }) }));

  console.log('\n10) send chat');
  console.log(await req('http://localhost:4000/chat', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ text: 'Hello chat' }) }));

})();
