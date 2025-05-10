import { tryCatch } from "../ts/try-catch.ts";

importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js"
);

function startWorkbox() {
  if (!workbox) {
    console.error(`❌ Workbox load failed`);
    return;
  }

  console.log(`✅ Workbox loaded`);

  // Cache HTML, JS, CSS with StaleWhileRevalidate
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === "document" ||
      request.destination === "script" ||
      request.destination === "style",
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: "static-resources",
    })
  );

  // Cache Cal-Heatmap and other vendor JS
  workbox.routing.registerRoute(
    ({ url }) =>
      url.pathname.includes("cal-heatmap") ||
      url.pathname.includes("bootstrap") ||
      url.pathname.includes("jquery") ||
      url.pathname.includes("d3") ||
      url.pathname.includes("popper") ||
      url.pathname.includes("Tooltip") ||
      url.pathname.includes("supabase"),
    new workbox.strategies.CacheFirst({
      cacheName: "vendor-js",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        }),
      ],
    })
  );

  // Cache images (if any)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === "image",
    new workbox.strategies.CacheFirst({
      cacheName: "images",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
        }),
      ],
    })
  );

  // Example route for your /api/sync endpoint
  workbox.routing.registerRoute(
    ({ url }) => url.pathname === "/api/sync",
    async ({ request }) => {
      try {
        const { response, error } = await tryCatch(fetch(request.clone()));
        if (error) {
          throw error;
        }
        const { data, dataError } = await tryCatch(response.clone().json());
        localStorage.setItem("lastSync", JSON.stringify(data));

        if (dataError) {
          throw error;
        }
        return response;
      } catch {
        const cached = localStorage.getItem("lastSync");
        if (cached) {
          return new Response(cached, {
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Offline and no cache" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    "GET"
  );
}

startWorkbox();
