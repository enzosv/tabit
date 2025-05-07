// scripts/build.ts
import * as esbuild from "https://deno.land/x/esbuild@v0.19.2/mod.js";
import { PurgeCSS } from "https://deno.land/x/purgecss@0.1.4/mod.ts";

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

async function purgeCss(cssContent: string): Promise<string> {
  const results = await new PurgeCSS().purge({
    content: ["layouts/**/*.html", "assets/ts/**/*.ts"],
    css: [{ raw: cssContent }],
    // safelist critical Bootstrap components that might be added dynamically
    safelist: [
      /^modal/,
      /^popover/,
      /^tooltip/,
      /^dropdown-menu/,
      /^btn-/,
      /^form-/,
      "needs-validation",
      "d-flex",
      "gap-2",
    ],
  });

  return results[0]?.css || cssContent;
}

async function compileCss() {
  try {
    const start = performance.now();

    // Combine vendor CSS and custom CSS
    const vendorCss = await Deno.readTextFile(
      "static/vendor/bootstrap.min.css"
    );
    // not including cal-heatmap because purgecss has too many false positives
    // (await Deno.readTextFile("static/vendor/cal-heatmap.css"));

    // Get custom CSS files
    const customCssFiles: string[] = [];
    for await (const file of Deno.readDir("assets/css/")) {
      if (file.name.endsWith(".css")) {
        customCssFiles.push(`assets/css/${file.name}`);
      }
    }

    // Bundle custom CSS
    const customCssResult = await esbuild.build({
      entryPoints: customCssFiles,
      bundle: true,
      write: false,
      minify: !DEV_MODE,
    });

    const customCss = new TextDecoder().decode(
      customCssResult.outputFiles[0].contents
    );

    // Combine all CSS
    let combinedCss = vendorCss + customCss;

    // Purge unused CSS in production
    // if (!DEV_MODE) {
    combinedCss = await purgeCss(combinedCss);
    // }

    // Write final CSS
    await Deno.writeTextFile("public/css/styles.css", combinedCss);

    const duration = (performance.now() - start).toFixed(2);
    console.log(`✅ CSS bundle completed in ${duration}ms`);

    return combinedCss;
  } catch (error) {
    console.error("❌ CSS build failed:", error);
    throw error;
  }
}

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
      return;
    }
    // One-time build
    const result = await esbuild.build(buildOptions);

    if (result.errors.length > 0) {
      console.error("❌ Build failed with errors:", result.errors);
    } else {
      const duration = (performance.now() - start).toFixed(2);
      console.log(`✅ Build completed in ${duration}ms`);
    }
  } catch (error) {
    console.error("❌ Build failed:", error);
    Deno.exit(1);
  }
}

async function copyServiceWorker() {
  try {
    const start = performance.now();

    // Read the service worker file
    const swContent = await Deno.readTextFile("assets/js/service-worker.js");

    // Minify the service worker in production
    let finalContent = swContent;
    if (!DEV_MODE) {
      const result = await esbuild.build({
        stdin: {
          contents: swContent,
          loader: "js",
        },
        minify: true,
        write: false,
      });
      finalContent = new TextDecoder().decode(result.outputFiles[0].contents);
    }

    // Write the service worker to public directory
    await Deno.writeTextFile("public/service-worker.js", finalContent);

    const duration = (performance.now() - start).toFixed(2);
    console.log(`✅ Service worker copied in ${duration}ms`);
  } catch (error) {
    console.error("❌ Service worker copy failed:", error);
    throw error;
  }
}

await Promise.all([compileCss(), compileTs(), copyServiceWorker()]);
if (!WATCH_MODE) {
  esbuild.stop();
}
