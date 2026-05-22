/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
  PUBLIC_R2_URL: string;
}

declare namespace App {
  interface Locals extends Runtime {
    user?: { admin: true };
  }
}
