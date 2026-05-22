import { describe, it, expect } from 'vitest';
import { signJwt, verifyJwt, constantTimeEqual } from '~/lib/auth';

const SECRET = 'a'.repeat(32);

describe('auth', () => {
  it('signs and verifies a valid JWT', async () => {
    const token = await signJwt({ admin: true }, SECRET, 60);
    const payload = await verifyJwt(token, SECRET);
    expect(payload).toMatchObject({ admin: true });
  });

  it('rejects tampered tokens', async () => {
    const token = await signJwt({ admin: true }, SECRET, 60);
    const bad = token.slice(0, -2) + 'XX';
    await expect(verifyJwt(bad, SECRET)).resolves.toBeNull();
  });

  it('rejects expired tokens', async () => {
    const token = await signJwt({ admin: true }, SECRET, -10);
    await expect(verifyJwt(token, SECRET)).resolves.toBeNull();
  });

  it('constantTimeEqual returns true for equal strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
  });

  it('constantTimeEqual returns false for different strings', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });
});
