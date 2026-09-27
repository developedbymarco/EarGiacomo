const host = process.env.HOST || "127.0.0.1";
const port = process.env.PORT || "3000";

module.exports = {
  apps: [
    {
      name: "eargiacomo",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: `start --hostname ${host} --port ${port}`,
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "700M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
