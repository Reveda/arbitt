import { connectDatabase, disconnectDatabase } from "../config/database";
import { UserModel } from "../modules/users/models/user.model";
import { WalletModel } from "../modules/wallet/models/wallet.model";
import { WalletService } from "../modules/wallet/services/wallet.service";

async function main() {
  await connectDatabase();

  const user = await UserModel.findOne({ username: "nitesh1234" }).lean();
  if (user) {
    console.log(`\n=== USER NITESH1234 DETAILS ===`);
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
    console.log("User 'nitesh1234' not found!");
  }

  await disconnectDatabase();
}

main().catch(console.error);
