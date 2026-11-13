-- Align User with the class diagram while preserving existing user IDs and relations.
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";
ALTER TABLE "LoyaltyTransaction" DROP CONSTRAINT "LoyaltyTransaction_userId_fkey";

ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "id" TYPE TEXT USING "id"::TEXT;
ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'CUSTOMER';

ALTER TABLE "Order" ALTER COLUMN "userId" TYPE TEXT USING "userId"::TEXT;
ALTER TABLE "LoyaltyTransaction" ALTER COLUMN "userId" TYPE TEXT USING "userId"::TEXT;

DROP SEQUENCE IF EXISTS "User_id_seq";

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LoyaltyTransaction"
  ADD CONSTRAINT "LoyaltyTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
