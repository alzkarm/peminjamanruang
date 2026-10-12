/**
 * SIPERU YARSI - PM2 Production Ecosystem Configuration
 * Menjalankan Frontend (Next.js) dan Backend (NestJS) secara otomatis di server VPS
 *
 * Cara menjalankan:
 * 1. cd ke folder project
 * 2. pm2 start ecosystem.config.js
 * 3. pm2 save && pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'siperu-backend',
      cwd: './backend',
      script: 'dist/src/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'siperu-frontend',
      cwd: './',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
