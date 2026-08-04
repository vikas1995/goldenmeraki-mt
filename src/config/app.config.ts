import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const rawCors = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,https://golden-meraki-app.vercel.app,https://goldenmeraki.vercel.app';
  const corsOrigin = rawCors.split(',').map((origin) => origin.trim()).filter(Boolean);

  return {
    nodeEnv,
    port: parseInt(process.env.PORT || '3000', 10),
    corsOrigin,
    enableSwagger: process.env.ENABLE_SWAGGER === 'true' || nodeEnv !== 'production',
  };
});
