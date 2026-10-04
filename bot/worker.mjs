import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
} from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN?.trim();

if (!token) {
  throw new Error("DISCORD_BOT_TOKEN must be set to run the Discord bot worker.");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  readyClient.user.setPresence({
    status: "online",
    activities: [{ name: "as noticias da guilda", type: ActivityType.Watching }],
  });

  console.log(`Discord bot online as ${readyClient.user.tag}`);
});

client.on(Events.Error, (error) => {
  console.error("Discord gateway error:", error);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    console.log(`Received ${signal}; closing Discord connection.`);
    client.destroy();
    process.exit(0);
  });
}

client.login(token).catch((error) => {
  console.error("Failed to connect Discord bot:", error);
  process.exit(1);
});