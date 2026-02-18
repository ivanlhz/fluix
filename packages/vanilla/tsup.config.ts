import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["cjs", "esm", "iife"],
	dts: true,
	clean: true,
	sourcemap: true,
	treeshake: true,
	globalName: "Fluix",
	external: ["@fluix/core", "@fluix/css"],
});
