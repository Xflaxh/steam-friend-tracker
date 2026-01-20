const { Client, GatewayIntentBits } = require("discord.js");
const fetch = require("node-fetch");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const STEAM_API_KEY = process.env.STEAM_API_KEY;
const DISCORD_USER_ID = process.env.DISCORD_USER_ID;
const FRIENDS = process.env.FRIENDS.split(",");

let lastStatus = {};

async function getFriendStatus(steamId) {
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.response.players[0];
}

async function checkFriends() {
  for (const friendId of FRIENDS) {
    try {
      const player = await getFriendStatus(friendId);

      if (!player) continue;

      const name = player.personaname;
      const gameId = player.gameid || null;
      const gameName = player.gameextrainfo || null;

      const last = lastStatus[friendId];

      if (!last?.gameId && gameId) {
        sendDM(`${name} started playing **${gameName}**`);
      }

      if (last?.gameId && !gameId) {
        sendDM(`${name} stopped playing **${last.gameName}**`);
      }

      lastStatus[friendId] = { gameId, gameName };
    } catch (e) {
      console.error("Error checking friend:", e);
    }
  }
}

async function sendDM(msg) {
  const user = await client.users.fetch(DISCORD_USER_ID);
  user.send(msg);
}

client.once("ready", () => {
  console.log("Bot is online!");
  checkFriends();
  setInterval(checkFriends, 30000);
});

client.login(DISCORD_TOKEN);
