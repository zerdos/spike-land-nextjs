import { config } from "dotenv";
config({ path: ".env.local" });
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
