import { connectDatabase, disconnectDatabase } from "../config/database";
import { UserModel } from "../modules/users/models/user.model";

async function main() {
  await connectDatabase();
  console.log("Database connected successfully.");

  const admins = await UserModel.find({ role: { $in: ["super_admin", "admin"] } }).select("username email role status").lean();

  console.log("\nADMIN & SUPER_ADMIN USERS FOUND:");
  if (admins.length === 0) {
    console.log("No admins or super admins found in the database.");
  } else {
    admins.forEach((admin) => {
      console.log(`- Username: ${admin.username} | Email: ${admin.email} | Role: ${admin.role} | Status: ${admin.status}`);
    });
  }

  await disconnectDatabase();
}

main().catch(console.error);
