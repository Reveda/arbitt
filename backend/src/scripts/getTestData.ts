import { connectDatabase, disconnectDatabase } from "../config/database";
import { UserModel } from "../modules/users/models/user.model";
import { WalletModel } from "../modules/wallet/models/wallet.model";
import { TransactionModel } from "../modules/transactions/models/transaction.model";
import { walletService } from "../modules/wallet/services/wallet.service";
import { hashPassword } from "../utils/password";

async function main() {
  await connectDatabase();
  console.log("Database connected successfully.");

  const username = "nitesh1234";
  let user = await UserModel.findOne({ username }).lean();
  
  if (!user) {
    user = await UserModel.findOne({ role: "user" }).lean();
  }

  if (!user) {
    console.log("No user found in database!");
    await disconnectDatabase();
    return;
  }

  console.log(`\nFound User:`);
  console.log(`- ID: ${user._id}`);
  console.log(`- Username: ${user.username}`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Has Wallet Address: ${user.walletAddress ? "Yes (" + user.walletAddress + ")" : "No"}`);
  console.log(`- Has Transaction Password: ${user.transactionPasswordHash ? "Yes" : "No"}`);

  const hashedPassword = await hashPassword("123456");
  
  await UserModel.updateOne(
    { _id: user._id },
    { 
      $set: { 
        transactionPasswordHash: hashedPassword,
        walletAddress: user.walletAddress || "0x9621da5d61ffc6104f62b2bb746a8d8e578c7bf9"
      } 
    }
  );

  const wallet = await WalletModel.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        availableUsdt: 5000,
        lifetimeDepositsUsdt: 5000
      }
    },
    { new: true, upsert: true }
  ).lean();

  console.log(`\nUpdated User Wallet:`);
  console.log(`- Available Balance: ${wallet?.availableUsdt} USDT`);
  console.log(`- Transaction Password set to: "123456"`);
  console.log(`- BEP20 Address set to: "${user.walletAddress || "0x9621da5d61ffc6104f62b2bb746a8d8e578c7bf9"}"`);

  let pendingWithdrawal = await TransactionModel.findOne({
    userId: user._id,
    type: "withdrawal",
    status: "pending"
  }).lean();

  if (!pendingWithdrawal) {
    console.log("\nNo pending withdrawal found. Creating one...");
    const result = await walletService.createWithdrawalRequest(String(user._id), {
      amountUsdt: 500,
      network: "BEP20",
      walletAddress: user.walletAddress || "0x9621da5d61ffc6104f62b2bb746a8d8e578c7bf9",
      transactionPassword: "123456"
    });
    pendingWithdrawal = await TransactionModel.findById(result.id).lean();
    console.log("Created Mock Pending Withdrawal.");
  }

  if (pendingWithdrawal) {
    console.log("\nTEST WITHDRAWAL DATA:");
    console.log(`- Transaction ID: ${pendingWithdrawal._id}`);
    console.log(`- Amount Requested: ${pendingWithdrawal.payoutPrincipalUsdt ?? 500} USDT`);
    console.log(`- Net Payout (10% Tax): ${pendingWithdrawal.amountUsdt} USDT`);
    console.log(`- Status: ${pendingWithdrawal.status}`);
  }

  await disconnectDatabase();
}

main().catch(console.error);
