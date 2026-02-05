-- AlterTable: Update default aiModel for LearnItContent
ALTER TABLE "learn_it_contents" ALTER COLUMN "aiModel" SET DEFAULT 'gemini-3-flash-preview';
