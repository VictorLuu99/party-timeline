import { AwsClient } from 'aws4fetch';

export async function signPutUrl(env: Env & { R2_ACCESS_KEY_ID: string; R2_SECRET_ACCESS_KEY: string; R2_ACCOUNT_ID: string; R2_BUCKET: string }, key: string, contentType: string, expiresSec = 300): Promise<string> {
  const client = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });
  const url = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${key}`);
  url.searchParams.set('X-Amz-Expires', String(expiresSec));
  const signed = await client.sign(new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }), { aws: { signQuery: true } });
  return signed.url;
}

export function publicUrl(env: Env, key: string): string {
  return `${env.PUBLIC_R2_URL}/${key}`;
}
