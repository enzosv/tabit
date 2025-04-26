// scripts/build.ts
import * as esbuild from "https://deno.land/x/esbuild@v0.19.2/mod.js";
import * as path from "https://deno.land/std@0.203.0/path/mod.ts";

const WATCH_MODE = Deno.args.includes("--watch");
const DEV_MODE = Deno.args.includes("--dev") || WATCH_MODE;

// Define the build options
const buildOptions: esbuild.BuildOptions = {
  entryPoints: ["assets/ts/main.ts"],
  bundle: true,
  outdir: "public/js",
  sourcemap: DEV_MODE,
  minify: !DEV_MODE,
  target: ["es2020"],
  format: "esm",
  platform: "browser",
};

// Create a build function
async function build() {
  try {
    const start = performance.now();

    if (WATCH_MODE) {
      // Watch mode with live reload support
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log("👀 Watching for changes...");

      // Start live reload server
      const { host, port } = await ctx.serve({
        servedir: "public",
        host: "localhost",
        port: 8001,
      });

      console.log(`⚡ Live reload server running at http://${host}:${port}`);
    } else {
      // One-time build
      const result = await esbuild.build(buildOptions);

      if (result.errors.length > 0) {
        console.error("❌ Build failed with errors:", result.errors);
      } else {
        const duration = (performance.now() - start).toFixed(2);
        console.log(`✅ Build completed in ${duration}ms`);
      }
    }
  } catch (error) {
    console.error("❌ Build failed:", error);
    Deno.exit(1);
  }
}

// Run the build
await build();

// Clean up
if (!WATCH_MODE) {
  esbuild.stop();
}
