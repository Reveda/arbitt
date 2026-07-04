module.exports = {
  apps: [
    {
      name: "arbitrum-api",
      script: "backend/dist/server.js",
      instances: "max", // Utilize all available CPU cores
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
      instances: 1, // Only 1 worker instance to prevent blockchain nonce collisions
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PROCESS_ROLE: "worker",
        PORT: 5001,
      },
    },
  ],
};
