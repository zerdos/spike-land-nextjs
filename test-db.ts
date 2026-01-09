import { config } from "dotenv";
// Use quiet: true to suppress verbose logging
config({ path: ".env.local", quiet: true });
import prisma from "./src/lib/prisma";

async function main() {
  try {
    const count = await prisma.user.count();
    console.log("User count:", count);
  } catch (e) {
    console.error("DB Error:", e);
    process.exit(1);
  }
}

main();
