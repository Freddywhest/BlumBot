require("dotenv").config();
const _isArray = require("../utils/_isArray");
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

  SLEEP_BETWEEN_TAP:
    process.env.SLEEP_BETWEEN_TAP && _isArray(process.env.SLEEP_BETWEEN_TAP)
      ? JSON.parse(process.env.SLEEP_BETWEEN_TAP)
      : process.env.SLEEP_BETWEEN_TAP &&
        /^\d+$/.test(process.env.SLEEP_BETWEEN_TAP)
      ? parseInt(process.env.SLEEP_BETWEEN_TAP)
      : 150,

  USE_PROXY_FROM_FILE: process.env.USE_PROXY_FROM_FILE
    ? process.env.USE_PROXY_FROM_FILE.toLowerCase() === "true"
    : false,

  USE_QUERY_ID: process.env.USE_QUERY_ID
    ? process.env.USE_QUERY_ID.toLowerCase() === "true"
    : false,

  AUTO_JOIN_TRIBE: process.env.AUTO_JOIN_TRIBE
    ? process.env.AUTO_JOIN_TRIBE.toLowerCase() === "true"
    : true,

  CLAIM_TASKS_REWARD: process.env.CLAIM_TASKS_REWARD
    ? process.env.CLAIM_TASKS_REWARD.toLowerCase() === "true"
    : true,
};

module.exports = settings;
