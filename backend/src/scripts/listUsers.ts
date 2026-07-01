import { connectDatabase, disconnectDatabase } from "../config/database";
import { UserModel } from "../modules/users/models/user.model";

async function main() {
  await connectDatabase();
  const users = await UserModel.find({}).select("username email role").lean();
  console.log("Users registered in Database:", users);
  await disconnectDatabase();
}
main().catch(console.error);
