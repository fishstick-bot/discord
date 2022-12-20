import 'dotenv/config';
import connectToDatabase from './src/database';
import { UserModel } from './src/database/models';

(async () => {
  await connectToDatabase();

  const search = await UserModel.find({
    epicAccounts: {
      $exists: true,
      $ne: [],
      $elemMatch: {
        autoFreeLlamas: true,
      },
    },
  })
    .count()
    .exec();
  console.log(search);
})();
