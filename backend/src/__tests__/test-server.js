import http from 'http';
const PORT = 3000;
http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  console.log(`[TEST] ${req.method} ${url.pathname} deviceId=${url.searchParams.get('deviceId') || '?'}`);
  const body = JSON.stringify([
    { channel: 1, state: 'ON', mode: 'REMOTE' },
    { channel: 2, state: 'OFF', mode: 'LOCAL' },
    { channel: 3, state: 'ON', mode: 'LOCAL' },
    { channel: 4, state: 'OFF', mode: 'REMOTE' }
  ]);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}).listen(PORT, () => console.log(`[TEST] Server en http://0.0.0.0:${PORT}`));
