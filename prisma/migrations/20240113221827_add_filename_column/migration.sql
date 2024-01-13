/*
  Warnings:

  - Added the required column `fileName` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "fileName" VARCHAR(255) NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;
