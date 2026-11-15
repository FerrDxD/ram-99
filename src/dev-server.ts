// Dev server: serve dist/ over HTTP so ES modules work in browser
import { serve } from 'bun';
import path from 'node:path';
import fs from 'node:fs';

const PORT = 3000;
const DIST = path.join(process.cwd(), 'dist');

serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    let filePath = path.join(DIST, url.pathname === '/' ? '/index.html' : url.pathname);

    // Security: prevent path traversal
    if (!filePath.startsWith(DIST)) {
      return new Response('Forbidden', { status: 403 });
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const headers: Record<string, string> = {};
      if (ext === '.js') headers['Content-Type'] = 'application/javascript';
      if (ext === '.ts') headers['Content-Type'] = 'application/typescript';
      if (ext === '.html') headers['Content-Type'] = 'text/html; charset=utf-8';
      if (ext === '.css') headers['Content-Type'] = 'text/css';
      return new Response(fs.readFileSync(filePath), { headers });
    }

    // Fallback to index.html for SPA-like routing
    const indexPath = path.join(DIST, 'index.html');
    if (fs.existsSync(indexPath)) {
      return new Response(fs.readFileSync(indexPath), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
});

console.log(`RAM-99 dev server: http://localhost:${PORT}`);
