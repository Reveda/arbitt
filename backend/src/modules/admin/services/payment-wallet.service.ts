import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { HTTP_STATUS } from "../../../constants/http";
import { env } from "../../../config/env";
import { ApiError } from "../../../utils/ApiError";
import { PlatformSettingModel } from "../models/platform-setting.model";
import { AuditLogModel } from "../models/audit-log.model";
import { UserModel } from "../../users/models/user.model";
import { emailService } from "../../email/services/email.service";

const PAYMENT_WALLET_SETTING_KEY = "payment_wallet";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const PAYMENT_WALLET_OTP_EXPIRES_MINUTES = 10;
const PAYMENT_WALLET_OTP_MAX_ATTEMPTS = 5;

type StoredPaymentWallet = {
  address?: string;
  addressEncrypted?: {
    algorithm: typeof ENCRYPTION_ALGORITHM;
    authTag: string;
    ciphertext: string;
    iv: string;
    version: 1;
  };
  addressFingerprint?: string;
  network?: string;
  updatedBy?: string | null;
  deletedAt?: string;
  deletedBy?: string;
  isDeleted?: boolean;
};

export type PlatformPaymentWallet = {
  address: string;
  network: string;
  configured: boolean;
  updatedAt: Date | string | null;
  updatedBy: string | null;
};

function normalizeAddress(address?: string) {
  return address?.trim() ?? "";
}

function getEncryptionSecret() {
  return env.PAYMENT_WALLET_ENCRYPTION_KEY ?? env.JWT_ACCESS_SECRET;
}

function getEncryptionKey() {
  return createHash("sha256").update(getEncryptionSecret()).digest();
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@", 2);
  return `${name.slice(0, 2)}***@${domain}`;
}

function hashPaymentWalletOtp(email: string, otp: string) {
  return createHmac("sha256", getEncryptionKey())
    .update(`admin-payment-wallet:${email.toLowerCase()}:${otp}`)
    .digest("hex");
}

function createPaymentWalletOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function testOtpPayload(otp: string) {
  const allowed = env.EXPOSE_AUTH_OTP_IN_TEST_MODE && env.APP_ENV === "test";
  return allowed ? { testMode: true, testOtp: otp } : {};
}

export async function requestPaymentWalletOtp(input: {
  address: string;
  network: string;
  adminUserId: string;
  ipAddress?: string;
}) {
  const user = await UserModel.findOne({
    _id: input.adminUserId,
    role: { $in: ["admin", "super_admin"] },
    status: "active",
    isDeleted: { $ne: true },
  }).select("+adminPaymentWalletOtpHash +adminPaymentWalletOtpExpiresAt +adminPaymentWalletOtpAttempts +pendingAdminPaymentWalletAddress +pendingAdminPaymentWalletNetwork");

  if (!user) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "Admin verification is required.");
  }

  const otp = createPaymentWalletOtp();
  const expiresAt = new Date(Date.now() + PAYMENT_WALLET_OTP_EXPIRES_MINUTES * 60_000);
  user.set({
    pendingAdminPaymentWalletAddress: normalizeAddress(input.address),
    pendingAdminPaymentWalletNetwork: input.network,
    adminPaymentWalletOtpHash: hashPaymentWalletOtp(user.email, otp),
    adminPaymentWalletOtpExpiresAt: expiresAt,
    adminPaymentWalletOtpAttempts: 0,
  });
  await user.save();

  const delivery = await emailService.sendOtpEmail({
    to: user.email,
    otp,
    purpose: "wallet-address-change",
    expiresInMinutes: PAYMENT_WALLET_OTP_EXPIRES_MINUTES,
    contextLabel: "Admin payment wallet change",
  });
  await AuditLogModel.create({
    actorUserId: input.adminUserId,
    action: "admin.payment_wallet.otp_requested",
    entityType: "platform_setting",
    entityId: "payment_wallet",
    ipAddress: input.ipAddress,
    metadata: { network: input.network, emailSent: delivery.sent },
  });

  return { email: maskEmail(user.email), expiresAt, ...testOtpPayload(otp) };
}

export async function verifyPaymentWalletOtp(input: {
  address: string;
  network: string;
  adminUserId: string;
  otp: string;
  ipAddress?: string;
}) {
  const user = await UserModel.findOne({
    _id: input.adminUserId,
    role: { $in: ["admin", "super_admin"] },
    status: "active",
    isDeleted: { $ne: true },
  }).select("+adminPaymentWalletOtpHash +adminPaymentWalletOtpExpiresAt +adminPaymentWalletOtpAttempts +pendingAdminPaymentWalletAddress +pendingAdminPaymentWalletNetwork");

  const fail = async () => {
    if (user) {
      user.set({ adminPaymentWalletOtpAttempts: (user.get("adminPaymentWalletOtpAttempts") ?? 0) + 1 });
      await user.save();
    }
    await AuditLogModel.create({
      actorUserId: input.adminUserId,
      action: "admin.payment_wallet.otp_failed",
      entityType: "platform_setting",
      entityId: "payment_wallet",
      ipAddress: input.ipAddress,
      metadata: { network: input.network },
    });
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid or expired verification code.");
  };

  const expiresAt = user?.get("adminPaymentWalletOtpExpiresAt") as Date | null | undefined;
  if (!user || user.get("adminPaymentWalletOtpAttempts") >= PAYMENT_WALLET_OTP_MAX_ATTEMPTS ||
      user.get("pendingAdminPaymentWalletAddress") !== normalizeAddress(input.address) ||
      user.get("pendingAdminPaymentWalletNetwork") !== input.network ||
      !expiresAt || new Date(expiresAt).getTime() <= Date.now() ||
      user.get("adminPaymentWalletOtpHash") !== hashPaymentWalletOtp(user.email, input.otp)) {
    await fail();
  }

  user!.set({
    pendingAdminPaymentWalletAddress: null,
    pendingAdminPaymentWalletNetwork: null,
    adminPaymentWalletOtpHash: null,
    adminPaymentWalletOtpExpiresAt: null,
    adminPaymentWalletOtpAttempts: 0,
  });
  await user!.save();
  await AuditLogModel.create({
    actorUserId: input.adminUserId,
    action: "admin.payment_wallet.otp_verified",
    entityType: "platform_setting",
    entityId: "payment_wallet",
    ipAddress: input.ipAddress,
    metadata: { network: input.network },
  });
}

export function encryptValue(
  plainText: string,
): NonNullable<StoredPaymentWallet["addressEncrypted"]> {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);

  return {
    algorithm: ENCRYPTION_ALGORITHM,
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    version: 1,
  };
}

export function decryptValue(value: NonNullable<StoredPaymentWallet["addressEncrypted"]>): string {
  if (!value) {
    return "";
  }

  try {
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      getEncryptionKey(),
      Buffer.from(value.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(value.authTag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Encrypted setting value could not be decrypted. Check encryption key.",
    );
  }
}

function encryptAddress(address: string): StoredPaymentWallet["addressEncrypted"] {
  return encryptValue(address);
}

function decryptAddress(value: StoredPaymentWallet["addressEncrypted"]) {
  return decryptValue(value!);
}

function fingerprintAddress(address: string) {
  return createHmac("sha256", getEncryptionKey()).update(address).digest("hex");
}

function buildStoredWallet(input: { address: string; network: string; updatedBy?: string | null }) {
  const address = normalizeAddress(input.address);

  return {
    addressEncrypted: encryptAddress(address),
    addressFingerprint: fingerprintAddress(address),
    network: input.network,
    updatedBy: input.updatedBy ?? null,
  };
}

function getStoredAddress(value?: StoredPaymentWallet) {
  if (!value) {
    return "";
  }

  if (value.addressEncrypted) {
    return normalizeAddress(decryptAddress(value.addressEncrypted));
  }

  return normalizeAddress(value.address);
}

function isConfiguredAddress(address?: string) {
  const normalizedAddress = normalizeAddress(address);
  return Boolean(normalizedAddress) && !normalizedAddress.toUpperCase().startsWith("DEV-");
}

function getPaymentWalletSettingKey(network: string) {
  return `${PAYMENT_WALLET_SETTING_KEY}:${network}`;
}

function toPaymentWallet(
  value: StoredPaymentWallet | undefined,
  updatedAt?: Date | string | null,
  fallbackNetwork = "BEP20",
) {
  const address = getStoredAddress(value);

  return {
    address,
    network: value?.network ?? fallbackNetwork,
    configured: isConfiguredAddress(address),
    updatedAt: updatedAt ?? null,
    updatedBy: value?.updatedBy ?? null,
  };
}

async function migrateLegacyPlainAddress(setting: {
  _id: unknown;
  updatedAt?: Date | string | null;
  value?: unknown;
}) {
  const value = setting.value as StoredPaymentWallet | undefined;

  if (!value?.address || value.addressEncrypted) {
    return value;
  }

  const encryptedValue = buildStoredWallet({
    address: value.address,
    network: value.network ?? "BEP20",
    updatedBy: value.updatedBy ?? null,
  });

  await PlatformSettingModel.updateOne(
    { _id: setting._id },
    {
      $set: { value: encryptedValue },
    },
  );

  return encryptedValue;
}

async function archiveCurrentWallet(input: {
  current: {
    _id: unknown;
    value?: unknown;
  };
  deletedAt: Date;
  deletedBy: string;
}) {
  const currentValue = input.current.value as StoredPaymentWallet | undefined;
  const currentAddress = getStoredAddress(currentValue);
  const encryptedArchiveValue = currentAddress
    ? buildStoredWallet({
        address: currentAddress,
        network: currentValue?.network ?? "BEP20",
        updatedBy: currentValue?.updatedBy ?? null,
      })
    : {
        network: currentValue?.network ?? "BEP20",
        updatedBy: currentValue?.updatedBy ?? null,
      };

  await PlatformSettingModel.updateOne(
    { _id: input.current._id },
    {
      $set: {
        deletedAt: input.deletedAt,
        deletedBy: input.deletedBy,
        key: `${PAYMENT_WALLET_SETTING_KEY}:deleted:${String(input.current._id)}:${input.deletedAt.getTime()}`,
        value: {
          ...encryptedArchiveValue,
          deletedAt: input.deletedAt.toISOString(),
          deletedBy: input.deletedBy,
          isDeleted: true,
        },
      },
    },
  );
}

export async function getPlatformPaymentWallet(): Promise<PlatformPaymentWallet> {
  return getPlatformPaymentWalletForNetwork("BEP20");
}

export async function getPlatformPaymentWalletForNetwork(
  network: string,
): Promise<PlatformPaymentWallet> {
  const networkSetting = await PlatformSettingModel.findOne({
    deletedAt: null,
    key: getPaymentWalletSettingKey(network),
  }).lean();

  if (networkSetting) {
    const value = await migrateLegacyPlainAddress(networkSetting);
    return toPaymentWallet(value, networkSetting.updatedAt, network);
  }

  const setting = await PlatformSettingModel.findOne({
    deletedAt: null,
    key: PAYMENT_WALLET_SETTING_KEY,
  }).lean();
  const value = setting ? await migrateLegacyPlainAddress(setting) : undefined;

  if ((value?.network ?? "BEP20") === network) {
    return toPaymentWallet(value, setting?.updatedAt, network);
  }

  return toPaymentWallet(undefined, null, network);
}

export async function updatePlatformPaymentWallet(input: {
  address: string;
  network: string;
  updatedBy: string;
}): Promise<PlatformPaymentWallet> {
  const now = new Date();
  const current = await PlatformSettingModel.findOne({
    deletedAt: null,
    key: getPaymentWalletSettingKey(input.network),
  }).lean();
  const nextValue = buildStoredWallet({
    address: input.address,
    network: input.network,
    updatedBy: input.updatedBy,
  });

  if (current) {
    await archiveCurrentWallet({
      current,
      deletedAt: now,
      deletedBy: input.updatedBy,
    });
  }

  const setting = await PlatformSettingModel.create({
    key: getPaymentWalletSettingKey(input.network),
    value: nextValue,
  });

  return toPaymentWallet(setting.value as StoredPaymentWallet, setting.updatedAt);
}
