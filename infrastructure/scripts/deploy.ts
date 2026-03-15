#!/usr/bin/env npx tsx

import { execSync } from "child_process";
import { createInterface } from "readline";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DOCKER_DEV = resolve(ROOT, "infrastructure/dockers/development");

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((r) => rl.question(question, r));
}

function clear() {
  process.stdout.write("\x1b[2J\x1b[H");
}

function header(title: string) {
  console.log("\x1b[36m╔══════════════════════════════════════╗\x1b[0m");
  console.log(
    `\x1b[36m║\x1b[0m  \x1b[1m${title.padEnd(34)}\x1b[0m\x1b[36m║\x1b[0m`
  );
  console.log("\x1b[36m╚══════════════════════════════════════╝\x1b[0m\n");
}

function menu(options: string[]): void {
  options.forEach((opt, i) => {
    console.log(`  \x1b[33m${i + 1})\x1b[0m ${opt}`);
  });
  console.log(`  \x1b[33m0)\x1b[0m Back / Exit\n`);
}

function run(cmd: string, cwd?: string) {
  console.log(`\n\x1b[90m$ ${cmd}\x1b[0m\n`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: cwd ?? ROOT });
  } catch {
    console.log("\n\x1b[31mCommand failed.\x1b[0m");
  }
}

async function developmentMenu() {
  while (true) {
    clear();
    header("Development Environment");
    menu([
      "Start services (docker compose up)",
      "Stop services (docker compose down)",
      "View logs",
      "Reset (destroy volumes & restart)",
      "Service status",
    ]);

    const choice = await ask("Select option: ");

    switch (choice.trim()) {
      case "1":
        run(`docker compose -f docker-compose.yml up -d`, DOCKER_DEV);
        await ask("\nPress Enter to continue...");
        break;
      case "2":
        run(`docker compose -f docker-compose.yml down`, DOCKER_DEV);
        await ask("\nPress Enter to continue...");
        break;
      case "3":
        run(`docker compose -f docker-compose.yml logs --tail=50`, DOCKER_DEV);
        await ask("\nPress Enter to continue...");
        break;
      case "4": {
        const confirm = await ask(
          "\x1b[31mThis will destroy all data. Continue? (y/N): \x1b[0m"
        );
        if (confirm.trim().toLowerCase() === "y") {
          run(
            `docker compose -f docker-compose.yml down -v && docker compose -f docker-compose.yml up -d`,
            DOCKER_DEV
          );
        }
        await ask("\nPress Enter to continue...");
        break;
      }
      case "5":
        run(`docker compose -f docker-compose.yml ps`, DOCKER_DEV);
        await ask("\nPress Enter to continue...");
        break;
      case "0":
        return;
      default:
        break;
    }
  }
}

async function productionMenu() {
  clear();
  header("Production Environment");
  console.log(
    "  \x1b[33mNot configured yet.\x1b[0m Add infrastructure/dockers/production/\n"
  );
  await ask("Press Enter to go back...");
}

async function main() {
  while (true) {
    clear();
    header("Token Town Deploy");
    menu(["Development", "Production"]);

    const choice = await ask("Select environment: ");

    switch (choice.trim()) {
      case "1":
        await developmentMenu();
        break;
      case "2":
        await productionMenu();
        break;
      case "0":
        rl.close();
        process.exit(0);
      default:
        break;
    }
  }
}

main();
