import { connectDatabase, disconnectDatabase } from "../config/database";
import { UserModel } from "../modules/users/models/user.model";
import { RoleModel } from "../modules/roles/models/role.model";

async function main() {
  await connectDatabase();
  console.log("Database connected successfully.");

  const adminUser = await UserModel.findOne({ username: "admin" }).lean();
  if (adminUser) {
    console.log(`\n=== ADMIN USER IN DB ===`);
    console.log(`Username: ${adminUser.username}`);
    console.log(`Email:    ${adminUser.email}`);
    console.log(`Role:     ${adminUser.role}`);

    const roleDetails = await RoleModel.findOne({ name: adminUser.role }).lean();
    console.log(`\n=== ROLE PERMISSIONS ===`);
    console.log(`Role Name:   ${roleDetails?.name}`);
    console.log(`Permissions:`, roleDetails?.permissions);
  } else {
    console.log("Admin user 'admin' not found!");
  }

  await disconnectDatabase();
}

main().catch(console.error);
