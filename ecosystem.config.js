module.exports = {
  apps : [{
    script: 'npm',
    args: 'start',
    watch: 'true',
    name: 'log_analyzer',
    exp_backoff_restart_delay: 100,

    env_production: {
      NODE_ENV: "production",
      PORT: "8080",
      DB_HOST: "bottleneck-search-db.cgnxwdv2m5sd.us-east-1.rds.amazonaws.com",
      DB_USER: "admin",
      DB_PASSWORD: "admin-amazon",
      DB_DATABASE: "master",
      LOG_PATH: "/home/ubuntu/log_analyzer/query_log.sql",

      PROD_HOST: "prod-dump-test.cgnxwdv2m5sd.us-east-1.rds.amazonaws.com",
      PROD_DB_USER: "admin",
      PROD_DB_PASSWORD: "database-dump-test",
      PROD_DATABASE: "tp_prod"
   }
  }]
};
