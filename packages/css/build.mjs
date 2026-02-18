import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const srcDir = "src";
const distDir = "dist";

mkdirSync(distDir, { recursive: true });

// Copy individual CSS files to dist
const files = readdirSync(srcDir).filter((f) => f.endsWith(".css"));
for (const file of files) {
	cpSync(join(srcDir, file), join(distDir, file));
}

// Concatenate all into a single fluix.css bundle
const order = ["variables.css", "animations.css", ...files.filter((f) => f !== "variables.css" && f !== "animations.css")];
const bundle = order
	.filter((f) => files.includes(f))
	.map((f) => `/* === ${f} === */\n${readFileSync(join(srcDir, f), "utf-8")}`)
	.join("\n\n");

writeFileSync(join(distDir, "fluix.css"), bundle);

console.log(`Built ${files.length} CSS files → dist/fluix.css`);
