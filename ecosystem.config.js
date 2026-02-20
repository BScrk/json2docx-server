module.exports = {
  apps: [
    {
      name: "json2docx-server",
      script: "./server.js",
      exec_mode: "fork",
      instances: 1,
      log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
      merge_logs: true,
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      }
    }
  ]
};
