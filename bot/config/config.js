require("dotenv").config();
const settings = {
  API_ID:
    process.env.API_ID && /^\d+$/.test(process.env.API_ID)
      ? parseInt(process.env.API_ID)
      : process.env.API_ID && !/^\d+$/.test(process.env.API_ID)
      ? "N/A"
      : undefined,
  API_HASH: process.env.API_HASH || "",

  CLAIM_DAILY_REWARD: process.env.CLAIM_DAILY_REWARD
    ? process.env.CLAIM_DAILY_REWARD.toLowerCase() === "true"
    : true,

  CLAIM_FRIENDS_REWARD: process.env.CLAIM_FRIENDS_REWARD
    ? process.env.CLAIM_FRIENDS_REWARD.toLowerCase() === "true"
    : true,

  AUTO_PLAY_GAMES: process.env.AUTO_PLAY_GAMES
    ? process.env.AUTO_PLAY_GAMES.toLowerCase() === "true"
    : true,

  AUTO_START_FARMING: process.env.AUTO_START_FARMING
    ? process.env.AUTO_START_FARMING.toLowerCase() === "true"
    : true,

  AUTO_CLAIM_FARMING_REWARD: process.env.AUTO_CLAIM_FARMING_REWARD
    ? process.env.AUTO_CLAIM_FARMING_REWARD.toLowerCase() === "true"
    : true,

  SLEEP_BETWEEN_TAP: process.env.SLEEP_BETWEEN_TAP
    ? process.env.SLEEP_BETWEEN_TAP.split(",").map((str) =>
        parseInt(str.trim())
      )
    : 70,

  USE_PROXY_FROM_FILE: process.env.USE_PROXY_FROM_FILE
    ? process.env.USE_PROXY_FROM_FILE.toLowerCase() === "true"
    : false,
};

module.exports = settings;
