import { connect } from 'mongoose';

import getLogger from '../Logger';

const logger = getLogger('DATABASE');

const connectToDatabase = async (): Promise<void> => {
  const start = Date.now();
  await connect(process.env.MONGO_URI!, {});
  logger.info(`Connected to database [${(Date.now() - start).toFixed(2)}ms]`);
};

export default connectToDatabase;
