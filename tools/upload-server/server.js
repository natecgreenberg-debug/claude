const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9999;
const UPLOAD_DIR = '/tmp/uploads';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const HTML = `<!DOCTYPE html>
<html>
<head>
  <title>File Upload</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #eee; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
    h1 { margin-bottom: 24px; font-size: 1.4rem; color: #aaa; }
    #drop-zone {
      width: 480px; height: 260px; border: 2px dashed #444; border-radius: 16px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; cursor: pointer; transition: all 0.2s;
    }
    #drop-zone.hover { border-color: #7c6af7; background: #1a1a2e; }
    #drop-zone svg { opacity: 0.4; }
    #drop-zone p { color: #888; font-size: 0.95rem; }
    #drop-zone input { display: none; }
    #status { margin-top: 24px; font-size: 0.9rem; color: #7c6af7; min-height: 1.4rem; }
    #recent { margin-top: 32px; width: 480px; }
    #recent h2 { font-size: 0.85rem; color: #555; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    .file-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #222; font-size: 0.85rem; color: #888; }
    .file-row span:first-child { color: #ccc; }
  </style>
</head>
<body>
  <h1>Drop a file to send to VPS</h1>
  <div id="drop-zone">
    <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
    <p>Drag & drop any file here</p>
    <p style="font-size:0.8rem">or click to browse</p>
    <input type="file" id="file-input" multiple>
  </div>
  <div id="status"></div>
  <div id="recent"><h2>Recently uploaded</h2><div id="file-list"></div></div>

  <script>
    const zone = document.getElementById('drop-zone');
    const status = document.getElementById('status');
    const fileInput = document.getElementById('file-input');

    zone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => uploadFiles(e.target.files));

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('hover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('hover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('hover');
      uploadFiles(e.dataTransfer.files);
    });

    async function uploadFiles(files) {
      for (const file of files) {
        status.textContent = 'Uploading ' + file.name + '...';
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (data.ok) {
          status.textContent = '✓ Saved to ' + data.path;
          addToList(file.name, data.path);
        } else {
          status.textContent = '✗ Error: ' + data.error;
        }
      }
    }

    function addToList(name, path) {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.innerHTML = '<span>' + name + '</span><span>' + path + '</span>';
      document.getElementById('file-list').prepend(row);
    }

    // Load recent files on page load
    fetch('/recent').then(r => r.json()).then(files => {
      files.forEach(f => addToList(f.name, f.path));
    });
  </script>
</body>
</html>`;

function parseMultipart(body, boundary) {
  const parts = [];
  const boundaryBuf = Buffer.from('--' + boundary);
  let start = 0;

  while (start < body.length) {
    const boundaryIdx = body.indexOf(boundaryBuf, start);
    if (boundaryIdx === -1) break;

    const headerStart = boundaryIdx + boundaryBuf.length + 2; // skip \r\n
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;

    const headers = body.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4;
    const nextBoundary = body.indexOf(boundaryBuf, dataStart);
    if (nextBoundary === -1) break;

    const dataEnd = nextBoundary - 2; // strip trailing \r\n
    const data = body.slice(dataStart, dataEnd);

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);

    if (nameMatch && filenameMatch) {
      parts.push({ name: nameMatch[1], filename: filenameMatch[1], data });
    }

    start = nextBoundary;
  }
  return parts;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(HTML);
  }

  if (req.method === 'GET' && req.url === '/recent') {
    try {
      const files = fs.readdirSync(UPLOAD_DIR)
        .map(f => ({ name: f, path: path.join(UPLOAD_DIR, f), mtime: fs.statSync(path.join(UPLOAD_DIR, f)).mtime }))
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 10)
        .map(f => ({ name: f.name, path: f.path }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(files));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end('[]');
    }
  }

  if (req.method === 'POST' && req.url === '/upload') {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'No boundary' }));
    }

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const parts = parseMultipart(body, boundaryMatch[1]);

      if (!parts.length) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'No file found' }));
      }

      const file = parts[0];
      const savePath = path.join(UPLOAD_DIR, file.filename);
      fs.writeFileSync(savePath, file.data);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, path: savePath }));
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Upload server running at http://0.0.0.0:${PORT}`);
  console.log(`Files saved to ${UPLOAD_DIR}`);
});
