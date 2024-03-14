import { createLogger, levelFromName, DEBUG } from 'bunyan';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RotatingFileStream = require('bunyan-rotating-file-stream');

function createBunyanLogger() {
  const logDir = process.env.LOG_PATH || './logs/impact-graph.log';
  // if (!existsSync(logDir)) {
  //   writeFileSync(logDir, '');
  // }
  // eslint-disable-next-line no-console
  console.log('Bunyan log level is', process.env.LOG_LEVEL || 'debug');
  const bunyanStreams: any[] = [
    {
      type: 'raw',
      stream: new RotatingFileStream({
        path: logDir,
        period: '30d', // monthly rotation
        totalFiles: 30, // keep 30 back copies
        rotateExisting: true, // Give ourselves a clean file when we start up, based on period
        threshold: '100m', // Rotate log files larger than 100 megabytes
        totalSize: '500m', // Don't keep more than 500 megabytes of archived log files
        gzip: false, // Compress the archive log files to save space
      }),
    },
  ];

  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.LOG_STDOUT === 'true'
  ) {
    // Adding logs to console in local machine and running tests
    bunyanStreams.push({
      stream: process.stdout,
    });
  }
  return createLogger({
    name: 'giveth-impact-graph',
    level: levelFromName[process.env.LOG_LEVEL] || DEBUG,
    // level :process.env.LOG_LEVEL | 'error',
    streams: bunyanStreams,
  });
}

export const logger = createBunyanLogger();
