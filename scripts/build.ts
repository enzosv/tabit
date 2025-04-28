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
    defaultExtractor: (content: string) => {
      // Match all class names in HTML class attributes
      const htmlClasses = content.match(/class="([^"]*)"/) || [];

      // Match all class names in template literals and string concatenations
      const jsClasses = content.match(/[`'"]\s*[^`'"]*\s*[`'"]/) || [];

      // Combine and clean up the matches
      const allMatches = [...htmlClasses, ...jsClasses]
        .map((match) => match.replace(/[`'"]/g, ""))
        .join(" ")
        .split(/[\s\n]+/)
        .filter((cls) => cls.length > 0);

      return allMatches;
    },
    // Only safelist critical Bootstrap components that might be added dynamically
    safelist: [
      /^modal/,
      /^popover/,
      /^tooltip/,
      /^dropdown-menu/,
      /^cal-heatmap/,
      // Add any dynamically added classes here
    ],
  });

  return results[0]?.css || cssContent;
}

async function compileCss() {
  try {
    const start = performance.now();

    // Combine vendor CSS and custom CSS
    const vendorCss =
      (await Deno.readTextFile("static/vendor/bootstrap.min.css")) +
      (await Deno.readTextFile("static/vendor/cal-heatmap.css"));

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
    if (!DEV_MODE) {
      combinedCss = await purgeCss(combinedCss);
    }

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

await Promise.all([esbuild.build(buildOptions), compileCss()]);
esbuild.stop();
