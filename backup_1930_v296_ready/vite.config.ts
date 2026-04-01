import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-save-api',
        configureServer(server) {
          server.middlewares.use('/api/save-images', (req, res) => {
            if (req.method !== 'POST') {
              res.writeHead(405, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }
            let body = '';
            req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const { images, folderName } = JSON.parse(body) as { images: string[]; folderName: string };
                const baseDir = path.join(os.homedir(), 'Pictures', folderName);
                fs.mkdirSync(baseDir, { recursive: true });
                const saved: string[] = [];
                for (const img of images) {
                  const base64 = img.includes(',') ? img.split(',')[1] : img;
                  const timestamp = Date.now();
                  const fileName = `cai_${timestamp}.png`;
                  const filePath = path.join(baseDir, fileName);
                  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
                  saved.push(filePath);
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, saved }));
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: String(err) }));
              }
            });
          });
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
