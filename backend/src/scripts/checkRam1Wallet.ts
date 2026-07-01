import { connectDatabase, disconnectDatabase } from "../config/database";
import { UserModel } from "../modules/users/models/user.model";
import { WalletModel } from "../modules/wallet/models/wallet.model";
import { WalletService } from "../modules/wallet/services/wallet.service";

async function main() {
  await connectDatabase();
  console.log("Database connected.");

  const user = await UserModel.findOne({ username: "ram1" }).lean();
  if (user) {
    console.log(`\n=== USER RAM1 DETAILS ===`);
    console.log(`Username: ${user.username}`);
    console.log(`ID:       ${user._id}`);

    const wallet = await WalletModel.findOne({ userId: user._id }).lean();
    console.log(`\n=== RAW WALLET DOCUMENT IN DB ===`);
    console.log(JSON.stringify(wallet, null, 2));

    const walletService = new WalletService();
    const summary = await walletService.getWalletSummary(String(user._id));
    console.log(`\n=== API SUMMARY RESPONSE ===`);
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("User 'ram1' not found in database!");
  }

  await disconnectDatabase();
}

main().catch(console.error);
