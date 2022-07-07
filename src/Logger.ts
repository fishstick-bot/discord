import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import moment from 'moment';

const { combine, timestamp, label, printf, colorize } = format;

const myFormat = printf(
  ({ level, message, label: _label }) =>
    `${moment.utc().format('HH:mm:ss')} | ${level
      .toUpperCase()
      .padEnd(7)} | ${_label.toUpperCase().padEnd(20)} | ${message}`,
);

const getLogger = (name: string) =>
  createLogger({
    level: 'silly',
    // format: combine(label({ label: name }), timestamp(), myFormat),
    format: combine(label({ label: name }), timestamp(), myFormat),
    defaultMeta: { service: 'user-service' },
    transports: [
      new transports.DailyRotateFile({
        filename: './logs/%DATE%.log',
        datePattern: 'DD-MM-YYYY',
        zippedArchive: true,
        maxSize: '100m',
        maxFiles: '7d',
      }),
      new transports.Console({
        format: combine(
          label({ label: name }),
          timestamp(),
          myFormat,
          colorize({ all: true }),
        ),
      }),
    ],
  });

export default getLogger;
