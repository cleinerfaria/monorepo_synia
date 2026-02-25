const http = require('http');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const indexFile = path.join(distDir, 'index.html');
const port = Number(process.env.PORT || 4173);
const host = '0.0.0.0';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

function sendText(res, statusCode, body, contentType = 'text/plain; charset=utf-8', cacheControl = null) {
  const headers = { 'Content-Type': contentType };
  if (cacheControl) {
    headers['Cache-Control'] = cacheControl;
  }
  res.writeHead(statusCode, headers);
  res.end(body);
}

function getCacheHeaders(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  // Assets com hash no nome: cache imutável de 1 ano
  const immutableExts = ['.js', '.css', '.woff', '.woff2', '.ttf', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico'];
  if (immutableExts.includes(ext) && filePath.includes('/assets/')) {
    return 'public, max-age=31536000, immutable';
  }
  // HTML e demais: sempre revalidar
  return 'no-cache';
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendText(res, 500, 'Internal Server Error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const cacheControl = getCacheHeaders(filePath);
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': cacheControl });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const rawPath = (req.url || '/').split('?')[0];

  if (rawPath === '/health') {
    sendText(res, 200, 'ok');
    return;
  }

  if (rawPath === '/env.js') {
    const runtimeEnv = {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
    };
    const payload = `window.__APP_CONFIG__ = ${JSON.stringify(runtimeEnv)};`;
    sendText(res, 200, payload, 'application/javascript; charset=utf-8', 'no-cache');
    return;
  }

  const safePath = path.normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(distDir, safePath);

  if (safePath === '/' || safePath === '') {
    filePath = indexFile;
    sendFile(res, filePath);
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, filePath);
      return;
    }

    sendFile(res, indexFile);
  });
});

server.listen(port, host, () => {
  console.log(`Static server running on http://${host}:${port}`);
});
