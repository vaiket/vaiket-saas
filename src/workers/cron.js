const cron = require("node-cron");
const { Queue } = require("bullmq");
const { redis } = require("../lib/redis");

const queue = new Queue("imap-sync", { connection: redis });

// Run every 30 minutes
cron.schedule("*/30 * * * *", async () => {
  await queue.add("sync", {});
  console.log("⏰ Auto sync job added (30 min)");
});

console.log("⏳ CRON running…");
