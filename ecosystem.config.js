// Legacy PM2 fallback for non-Docker VPS deployments only.
// Current recommended production path for this repo is:
// Host Nginx (SSL/domain) -> Docker Compose -> frontend/backend/worker/mongo/redis.
// If you deploy with Docker Compose, this file is not used.
module.exports = {
  apps: [
    {
      name: "arbitrum-api",
      script: "backend/dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PROCESS_ROLE: "api",
        PORT: 5000,
      },
    },
    {
      name: "arbitrum-worker",
      script: "backend/dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PROCESS_ROLE: "worker",
        PORT: 5001,
      },
    },
  ],
};
