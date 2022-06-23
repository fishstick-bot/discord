import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import moment from 'moment';

const {
  combine, timestamp, label, printf,
} = format;

const myFormat = printf(({
  level, message, label: name,
}) => `${moment
  .utc()
  .format(
    'HH:mm:ss',
  )} | [${level.toUpperCase()}] | [${name}]: ${message}`);

const getLogger = (name: string) => createLogger({
  level: 'silly',
  format: combine(
    label({ label: name }),
    timestamp(),
    myFormat,
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new transports.DailyRotateFile({
      filename: './logs/%DATE%.log',
      datePattern: 'DD-MM-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '7d',
    }),
    new transports.Console({}),
  ],
});

export default getLogger;
