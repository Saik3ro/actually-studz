import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist', 'client');

// Import the server handler from the built server
let serverHandler;

async function loadServerHandler() {
  try {
    const serverFilePath = path.join(__dirname, 'dist', 'server', 'index.js');
    const serverFileUrl = new URL(`file://${serverFilePath.replace(/\\/g, '/')}`).href;
    const serverModule = await import(serverFileUrl);
    const handler = serverModule.default;
    
    if (!handler || typeof handler !== 'object') {
      throw new Error('Invalid server handler exported');
    }
    
    // The handler should have a fetch method for Workers compatibility
    if (typeof handler.fetch === 'function') {
      return handler.fetch.bind(handler);
    } else if (typeof handler === 'function') {
      return handler;
    } else {
      throw new Error('Server handler must export fetch method or be a function');
    }
  } catch (error) {
    console.error('Failed to load server handler:', error.message);
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  // Lazy load the server handler on first request
  if (!serverHandler) {
    try {
      serverHandler = await loadServerHandler();
    } catch (error) {
      console.error('Server initialization error:', error.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server initialization failed: ' + error.message);
      return;
    }
  }

  try {
    // Try to serve static files from client first
    const filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
    
    try {
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        const ext = path.extname(filePath);
        const contentTypes = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
          '.eot': 'application/vnd.ms-fontobject',
        };
        
        const contentType = contentTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fs.readFileSync(filePath));
        return;
      }
    } catch (err) {
      // File doesn't exist, fall through to SSR
    }
  } catch (err) {
    // Fall through to SSR
  }

  // Handle SSR requests
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const response = await serverHandler(
      new Request(url, {
        method: req.method,
        headers: new Headers(req.headers),
      })
    );

    const headers = Object.fromEntries(response.headers);
    res.writeHead(response.status, headers);
    
    if (response.body) {
      const reader = response.body.getReader();
      const pump = async () => {
        try {
          const { done, value } = await reader.read();
          if (done) return;
          res.write(value);
          await pump();
        } catch (error) {
          console.error('Stream error:', error);
          res.end();
        }
      };
      await pump();
      res.end();
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`\n✨ Server running at http://localhost:${PORT}/\n`);
});
