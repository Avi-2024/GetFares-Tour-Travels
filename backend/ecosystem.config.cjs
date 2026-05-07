module.exports = {
  apps: [
    {
      name: "travel-crm-backend",
      script: "src/server.js",
      exec_mode: "cluster",
      instances: "max",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
