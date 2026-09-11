-- CreateTable
CREATE TABLE "VaultEncryptionProfile" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "profileFormatVersion" INTEGER NOT NULL,
    "profileRevision" INTEGER NOT NULL,
    "passphraseWrapRevision" INTEGER NOT NULL,
    "recoveryWrapRevision" INTEGER NOT NULL,
    "passphraseEncoding" TEXT NOT NULL,
    "kdfAlgorithm" TEXT NOT NULL,
    "kdfAlgorithmVersion" INTEGER NOT NULL,
    "kdfSalt" BYTEA NOT NULL,
    "kdfMemoryKiB" INTEGER NOT NULL,
    "kdfIterations" INTEGER NOT NULL,
    "kdfParallelism" INTEGER NOT NULL,
    "kdfOutputBytes" INTEGER NOT NULL,
    "passphraseWrapAlgorithm" TEXT NOT NULL,
    "passphraseWrapNonce" BYTEA NOT NULL,
    "passphraseWrapTagBits" INTEGER NOT NULL,
    "passphraseWrappedDek" BYTEA NOT NULL,
    "recoveryPhraseEncoding" TEXT NOT NULL,
    "recoveryKdfAlgorithm" TEXT NOT NULL,
    "recoveryKdfSalt" BYTEA NOT NULL,
    "recoveryKdfInfo" TEXT NOT NULL,
    "recoveryKdfOutputBytes" INTEGER NOT NULL,
    "recoveryWrapAlgorithm" TEXT NOT NULL,
    "recoveryWrapNonce" BYTEA NOT NULL,
    "recoveryWrapTagBits" INTEGER NOT NULL,
    "recoveryWrappedDek" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultEncryptionProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VaultEncryptionProfile_v1_contract" CHECK (
        "profileFormatVersion" = 1 AND
        "profileRevision" >= 1 AND
        "passphraseWrapRevision" >= 1 AND
        "recoveryWrapRevision" >= 1 AND
        "passphraseEncoding" = 'utf8-nfc-v1' AND
        "kdfAlgorithm" = 'argon2id' AND
        "kdfAlgorithmVersion" = 19 AND
        octet_length("kdfSalt") = 16 AND
        "kdfMemoryKiB" BETWEEN 19456 AND 131072 AND
        "kdfIterations" BETWEEN 2 AND 6 AND
        "kdfParallelism" = 1 AND
        "kdfOutputBytes" = 32 AND
        "passphraseWrapAlgorithm" = 'AES-256-GCM' AND
        octet_length("passphraseWrapNonce") = 12 AND
        "passphraseWrapTagBits" = 128 AND
        octet_length("passphraseWrappedDek") = 48 AND
        "recoveryPhraseEncoding" = 'bip39-english-256-v1' AND
        "recoveryKdfAlgorithm" = 'HKDF-SHA-256' AND
        octet_length("recoveryKdfSalt") = 32 AND
        "recoveryKdfInfo" = 'devstash:recovery-wrap:v1' AND
        "recoveryKdfOutputBytes" = 32 AND
        "recoveryWrapAlgorithm" = 'AES-256-GCM' AND
        octet_length("recoveryWrapNonce") = 12 AND
        "recoveryWrapTagBits" = 128 AND
        octet_length("recoveryWrappedDek") = 48
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "VaultEncryptionProfile_ownerId_key" ON "VaultEncryptionProfile"("ownerId");

-- AddForeignKey
ALTER TABLE "VaultEncryptionProfile" ADD CONSTRAINT "VaultEncryptionProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
