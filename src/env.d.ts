/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
  PUBLIC_R2_URL: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_BUCKET: string;
}

declare namespace App {
  interface Locals extends Runtime {
    user?: { admin: true };
  }
}
