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
async function compileTs() {
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

async function compileCss() {
  try {
    const start = performance.now();
    const entryPoints: string[] = [];
    for await (const file of Deno.readDir("assets/css/")) {
      if (file.name.endsWith(".css")) {
        entryPoints.push(`assets/css/${file.name}`);
      }
    }
    if (entryPoints.length === 0) {
      console.log("⚠️ No CSS files found in assets/css/");
      return;
    }
    const result = await esbuild.build({
      entryPoints: entryPoints,
      bundle: true,
      outfile: "public/css/styles.css",
      minify: !DEV_MODE,
    });

    if (result.errors.length > 0) {
      console.error("❌ CSS build failed with errors:", result.errors);
    } else {
      const duration = (performance.now() - start).toFixed(2);
      console.log(
        `✅ CSS bundle completed in ${duration}ms (${entryPoints.length} files)`
      );
    }
  } catch (error) {
    console.error("❌ CSS build failed:", error);
    Deno.exit(1);
  }
}

// Run the tasks
await Promise.all([compileTs(), compileCss()]);

// Clean up
if (!WATCH_MODE) {
  esbuild.stop();
}
