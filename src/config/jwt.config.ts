import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET || 'default_secret_key_change_in_production';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_key_change_in_production';

  if (isProd && (secret.includes('default') || refreshSecret.includes('default'))) {
    console.warn('⚠️ WARNING: Using default JWT secrets in production environment! Set JWT_SECRET and JWT_REFRESH_SECRET env vars immediately.');
  }

  return {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };
});
