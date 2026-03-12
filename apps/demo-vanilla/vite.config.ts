import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const resolveFromRoot = (...segments: string[]) => path.resolve(root, ...segments);

export default defineConfig({
	resolve: {
		alias: {
			"@fluix-ui/core": resolveFromRoot("packages/core/src/index.ts"),
			"@fluix-ui/vanilla": resolveFromRoot("packages/vanilla/src/index.ts"),
		},
	},
});
