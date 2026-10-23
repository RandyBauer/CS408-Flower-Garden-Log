// npm run gardener:create: creates the gardener account, or sets a new password for it.
// Prompts for the email and password. Run on the server after the first deploy.
import { createInterface } from "node:readline/promises";
import { MIN_PASSWORD_LENGTH, setGardener } from "../lib/accounts";
import { databasePath, openDatabase } from "../lib/db";

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
  const email = await rl.question("Gardener email: ");

  // Hide the password as it is typed when running in a terminal.
  const output = rl as unknown as { _writeToOutput?: (text: string) => void };
  const original = output._writeToOutput;
  const prompt = `Password (at least ${MIN_PASSWORD_LENGTH} characters): `;
  if (process.stdin.isTTY) {
    output._writeToOutput = (text: string) => original?.call(rl, text.startsWith(prompt) ? prompt : "");
  }
  const password = await rl.question(prompt);
  output._writeToOutput = original;
  if (process.stdin.isTTY) process.stdout.write("\n");
  rl.close();

  const db = openDatabase();
  try {
    const gardener = setGardener(db, email, password);
    console.log(`Gardener account ready: ${gardener.email} (${databasePath()})`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
