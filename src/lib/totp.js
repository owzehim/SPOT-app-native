import { authenticator } from '@otplib/preset-default';

authenticator.options = { step: 15, digits: 6 };

export function totp(secret) {
  try {
    return authenticator.generate(secret);
  } catch {
    return null;
  }
}