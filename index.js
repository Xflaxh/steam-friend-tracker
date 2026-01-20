import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

// ================== CONFIG ==================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const STEAM_API_KEY = process.env.STEAM_API_KEY;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// Steam IDs to track
const FRIEND_STEAM_IDS = [
  "76561199230809711",
  "76561199145999818",
  "76561199521428784",
  "76561199512325915",
  "76561199486383594",
  "76561199204929088"
];

// ===========================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Stores last known game per friend
const lastStatus = {};

// -------------------------------------------
// Get Steam player info
async function getFriendStatus(steamId) {
  const url =
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/` +
    `?key=${STEAM_API_KEY}&steamids=${steamId}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.response.players.length) return null;
  return data.response.players[0];
}

// -------------------------------------------
// Initial scan (startup)
async function initialCheck() {
  const channel = await client.channels.fetch(LOG_CHANNEL_ID);

  for (const steamId of FRIEND_STEAM_IDS) {
    try {
      const player = await getFriendStatus(steamId);
      if (!player) continue;

      lastStatus[steamId] = player.gameextrainfo || null;

      if (player.gameextrainfo) {
        await channel.send(
          `🔵 **[Startup] ${player.personaname}** is playing **${player.gameextrainfo}**`
        );
      }
    } catch (err) {
      console.error("Startup error:", steamId, err);
    }
  }
}

// -------------------------------------------
// Repeating check
async function checkFriends() {
  const channel = await client.channels.fetch(LOG_CHANNEL_ID);

  for (const steamId of FRIEND_STEAM_IDS) {
    try {
      const player = await getFriendStatus(steamId);
      if (!player) continue;

      const currentGame = player.gameextrainfo || null;
      const previousGame = lastStatus[steamId] || null;

      // Game started
      if (!previousGame && currentGame) {
        await channel.send(
          `🟢 **${player.personaname} started playing ${currentGame}**`
        );
      }

      // Game stopped
      if (previousGame && !currentGame) {
        await channel.send(
          `🔴 **${player.personaname} stopped playing ${previousGame}**`
        );
      }

      lastStatus[steamId] = currentGame;
    } catch (err) {
      console.error("Error checking Steam ID:", steamId, err);
    }
  }
}

// -------------------------------------------
// Bot ready
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const channel = await client.channels.fetch(LOG_CHANNEL_ID);
  await channel.send("🟡 **Tracking started**");

  await initialCheck();
  setInterval(checkFriends, 30_000);
});

// -------------------------------------------
client.login(DISCORD_TOKEN);
