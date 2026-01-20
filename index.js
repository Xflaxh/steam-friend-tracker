const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

/* ---------------- WEB SERVER ---------------- */

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Steam tracker bot is running");
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

/* ---------------- DISCORD CLIENT ---------------- */

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const STEAM_API_KEY = process.env.STEAM_API_KEY;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const FRIENDS = process.env.FRIENDS.split(",");

let lastStatus = {};

/* ---------------- STEAM ---------------- */

async function getFriendStatus(steamId) {
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`;
  const res = await fetch(url); // ← native fetch
  const data = await res.json();
  return data.response.players[0];
}

async function sendLog(message) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (channel) await channel.send(message);
  } catch (err) {
    console.error("Failed to send log:", err);
  }
}

async function checkFriends() {
  console.log("Checking friends...");

  for (const steamId of FRIENDS) {
    try {
      const player = await getFriendStatus(steamId);
      if (!player) continue;

      const name = player.personaname;
      const gameId = player.gameid || null;
      const gameName = player.gameextrainfo || null;

      const last = lastStatus[steamId];

      if (!last?.gameId && gameId) {
        sendLog(`🟢 **${name}** started playing **${gameName}**`);
      }

      if (last?.gameId && !gameId) {
        sendLog(`🔴 **${name}** stopped playing **${last.gameName}**`);
      }

      lastStatus[steamId] = { gameId, gameName };
    } catch (err) {
      console.error("Steam check failed:", err);
    }
  }
}

/* ---------------- READY ---------------- */

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  checkFriends();
  setInterval(checkFriends, 30000);
});

client.login(DISCORD_TOKEN);
