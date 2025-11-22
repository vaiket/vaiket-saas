// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "vaiket-web", // your Next.js web (optional - if you want PM2 to run both)
      script: "npm",
      args: "run start:web",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "vaiket-imap-daemon",
      script: "worker/imap-daemon.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        APP_BASE_URL: process.env.APP_BASE_URL || "http://localhost:3000",
        IMAP_SYNC_INTERVAL_SECONDS: process.env.IMAP_SYNC_INTERVAL_SECONDS || "7"
      }
    }
  ]
};
