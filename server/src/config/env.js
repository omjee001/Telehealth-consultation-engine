import "dotenv/config";

// Keep environment-variable reading in one place so the rest of the app stays simple.
const requestedPort = Number(process.env.PORT);

const env = Object.freeze({
  port: Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI,

  // Phase 4: JWT configuration.
  // The secret is what the server uses to sign and verify tokens.
  // NEVER hard-code it — always read from environment variables.
  // If someone learns your secret, they can forge valid tokens for any user.
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",

  // Phase 11: Guest tokens use a much shorter lifespan.
  guestJwtExpiresIn: process.env.GUEST_JWT_EXPIRES_IN || "15m",

  // Phase 13: Redis connection URL (optional — app works without it)
  redisUrl: process.env.REDIS_URL || ""
});

export default env;
