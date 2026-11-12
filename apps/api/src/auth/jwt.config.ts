const configuredSecret = process.env.JWT_SECRET;

if (!configuredSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be configured in production');
}

export const jwtSecret = configuredSecret || 'local-development-secret-change-me';
