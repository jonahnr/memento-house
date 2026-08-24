/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_TEST_SECRET_KEY?: string;
  STRIPE_TEST_WEBHOOK_SECRET?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ADMIN_EMAILS?: string;
  STRIPE_PRICE_MAP_BASIC?: string;
  STRIPE_PRICE_MAP_PLUS?: string;
  STRIPE_PRICE_DECK_ESSENTIAL?: string;
  STRIPE_PRICE_DECK_SIGNATURE?: string;
  STRIPE_PRICE_DECK_STORY?: string;
  STRIPE_PRICE_DECK_BESPOKE?: string;
  STRIPE_PRICE_UNITY_STANDARD?: string;
  STRIPE_PRICE_UNITY_BESPOKE?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Sites provides production secrets as Worker bindings. Mirror only the
    // server-side values that route handlers read through Node's process.env.
    for (const key of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_TEST_SECRET_KEY", "STRIPE_TEST_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAILS", "STRIPE_PRICE_MAP_BASIC", "STRIPE_PRICE_MAP_PLUS", "STRIPE_PRICE_DECK_ESSENTIAL", "STRIPE_PRICE_DECK_SIGNATURE", "STRIPE_PRICE_DECK_STORY", "STRIPE_PRICE_DECK_BESPOKE", "STRIPE_PRICE_UNITY_STANDARD", "STRIPE_PRICE_UNITY_BESPOKE"] as const) {
      if (env[key]) process.env[key] = env[key];
    }

    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
