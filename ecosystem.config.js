module.exports = {
  apps: [
    {
      name: 'alemancenter-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/vhosts/alemancenter.com/httpdocs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'https://api.alemancenter.com/api',
        NEXT_PUBLIC_APP_URL: 'https://alemancenter.com',
        NEXT_PUBLIC_FRONTEND_API_KEY: '9f3c6a7b1d2e4f8a0c5e9a1b7d6f2c8e4a9b0d3e5f6a1c7b8e2d4f9a6c0b'
      },
      error_file: '/var/www/vhosts/alemancenter.com/logs/pm2-error.log',
      out_file: '/var/www/vhosts/alemancenter.com/logs/pm2-out.log',
      time: true
    }
  ]
};
