module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    // First application
    {
      name: 'impactgraph',
      script: 'node_modules/.bin/ts-node', // or locally "./node_modules/.bin/_ts-node"
      args: '--project ./tsconfig.json --max-old-space-size=4096 index.ts',
      log_date_format: 'YYYY-MM-DD HH:mm',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
