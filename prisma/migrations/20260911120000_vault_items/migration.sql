-- CreateTable
CREATE TABLE "VaultItem" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "envelopeVersion" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL,
    "nonce" BYTEA NOT NULL,
    "tagBits" INTEGER NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VaultItem_phase6_contract" CHECK (
        "itemType" = 'GENERIC_SECRET' AND
        "envelopeVersion" = 1 AND
        "algorithm" = 'AES-256-GCM' AND
        octet_length("nonce") = 12 AND
        "tagBits" = 128 AND
        octet_length("ciphertext") BETWEEN 16 AND 32784
    )
);

-- CreateIndex
CREATE INDEX "VaultItem_ownerId_updatedAt_idx" ON "VaultItem"("ownerId", "updatedAt" DESC);

-- AddForeignKey
ALTER TABLE "VaultItem" ADD CONSTRAINT "VaultItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
