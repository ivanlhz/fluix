import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const resolveFromRoot = (...segments: string[]) => path.resolve(root, ...segments);

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@fluix-ui/core": resolveFromRoot("packages/core/src/index.ts"),
			"@fluix-ui/react": resolveFromRoot("packages/react/src/index.ts"),
		},
	},
});
