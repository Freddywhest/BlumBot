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

  DELAY_BETWEEN_STARTING_BOT:
    process.env.DELAY_BETWEEN_STARTING_BOT &&
    _isArray(process.env.DELAY_BETWEEN_STARTING_BOT)
      ? JSON.parse(process.env.DELAY_BETWEEN_STARTING_BOT)
      : [15, 20],

  DELAY_BETWEEN_TASKS:
    process.env.DELAY_BETWEEN_TASKS && _isArray(process.env.DELAY_BETWEEN_TASKS)
      ? JSON.parse(process.env.DELAY_BETWEEN_TASKS)
      : [15, 20],

  DELAY_BETWEEN_GAME:
    process.env.DELAY_BETWEEN_GAME && _isArray(process.env.DELAY_BETWEEN_GAME)
      ? JSON.parse(process.env.DELAY_BETWEEN_GAME)
      : [10, 20],

  USE_PROXY_FROM_TXT_FILE: process.env.USE_PROXY_FROM_TXT_FILE
    ? process.env.USE_PROXY_FROM_TXT_FILE.toLowerCase() === "true"
    : false,

  USE_PROXY_FROM_JS_FILE: process.env.USE_PROXY_FROM_JS_FILE
    ? process.env.USE_PROXY_FROM_JS_FILE.toLowerCase() === "true"
    : false,

  AUTO_JOIN_TRIBE: process.env.AUTO_JOIN_TRIBE
    ? process.env.AUTO_JOIN_TRIBE.toLowerCase() === "true"
    : true,

  CLAIM_TASKS_REWARD: process.env.CLAIM_TASKS_REWARD
    ? process.env.CLAIM_TASKS_REWARD.toLowerCase() === "true"
    : true,
  F_E: ".mjs",

  CAN_CREATE_SESSION: false,
};

module.exports = settings;
