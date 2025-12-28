const Redis = require("ioredis");

const redis = new Redis(process.env.UPSTASH_REDIS_URL, {
  tls: {},
  maxRetriesPerRequest: null,
});

module.exports = { redis };
