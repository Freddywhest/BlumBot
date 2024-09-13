const app = require("../config/app");
const logger = require("./logger");
const sleep = require("./sleep");
var _ = require("lodash");

class Fetchers {
  constructor(api, session_name, bot_name) {
    this.api = api;
    this.session_name = session_name;
    this.bot_name = bot_name;
  }

  async get_access_token(tgWebData, http_client) {
    try {
      const response = await http_client.post(
        `${app.gatewayApiUrl}/api/v1/auth/provider/PROVIDER_TELEGRAM_MINI_APP`,
        JSON.stringify(tgWebData)
      );

      return response.data?.token;
    } catch (error) {
      if (error?.response?.status > 499) {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Server Error, retrying again after sleep...`
        );
        await sleep(1);
        return null;
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ❗️Unknown error while getting Access Token: ${error}`
        );
        await sleep(3); // 3 seconds delay
      }
    }
  }

  #filter_tasks(tasks) {
    const combinedTasks = tasks
      .flatMap((section) => [
        ...section.tasks,
        ...section.subSections.flatMap((subSection) => subSection.tasks),
      ])
      .filter(
        (task) =>
          task?.type?.toUpperCase() === "SOCIAL_SUBSCRIPTION" &&
          task?.status?.toUpperCase() !== "FINISHED" &&
          task?.validationType?.toUpperCase() === "DEFAULT"
      )
      .sort((a, b) => a.title.localeCompare(b.title)); // Sort by title

    return combinedTasks;
  }

  async check_proxy(http_client, proxy) {
    try {
      const response = await http_client.get("https://httpbin.org/ip");
      const ip = response.data.origin;
      logger.info(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Proxy IP: ${ip}`
      );
    } catch (error) {
      if (
        error.message.includes("ENOTFOUND") ||
        error.message.includes("getaddrinfo") ||
        error.message.includes("ECONNREFUSED")
      ) {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error: Unable to resolve the proxy address. The proxy server at ${proxy.ip}:${proxy.port} could not be found. Please check the proxy address and your network connection.`
        );
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | No proxy will be used.`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Proxy: ${proxy.ip}:${proxy.port} | Error: ${error.message}`
        );
      }

      return false;
    }
  }

  async fetch_user_data(http_client) {
    let profile_data = false;
    while (typeof profile_data == "boolean" && !profile_data) {
      await sleep(2);
      profile_data = await this.api.get_user_data(http_client);
      if (_.isNull(profile_data) || _.isEmpty(profile_data)) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to get user data. Retrying again...`
        );
        profile_data = false;
        await sleep(3);
      }
    }
    return profile_data;
  }

  async fetch_tasks(http_client) {
    let tasks = false;
    while (typeof tasks == "boolean" && !tasks) {
      await sleep(2);
      tasks = await this.api.get_tasks(http_client);
      if (_.isNull(tasks) || _.isEmpty(tasks)) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to get tasks. Retrying again...`
        );
        tasks = false;
        await sleep(3);
      }
    }
    return this.#filter_tasks(tasks);
  }

  async #start_tasks(http_client, task_id, task_name) {
    let tasks_data = false;
    while (typeof tasks_data == "boolean" && !tasks_data) {
      await sleep(2);
      tasks_data = await this.api.start_task(http_client, task_id);
      if (_.isNull(tasks_data) || _.isEmpty(tasks_data)) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to start task <la>${task_name}</la>. Retrying again...`
        );
        tasks_data = false;
        await sleep(3);
      }
    }
    return tasks_data;
  }

  async #claim_tasks(http_client, task_id, task_name) {
    let tasks_data = false;
    while (typeof tasks_data === "boolean" && !tasks_data) {
      await sleep(2);
      tasks_data = await this.api.claim_task(http_client, task_id);

      // Check if tasks_data is a string and contains "Task is already claimed"
      if (
        typeof tasks_data === "string" &&
        tasks_data?.toLowerCase()?.includes("Task is already claimed")
      ) {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Task <la>${task_name}</la> is already claimed. Stopping retry.`
        );
        break; // Exit the loop if the task is already claimed
      }

      if (_.isNull(tasks_data) || _.isEmpty(tasks_data)) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to claim task <la>${task_name}</la>. Retrying again...`
        );
        tasks_data = false;
        await sleep(3);
      }
    }
    return tasks_data;
  }

  async claim_farming_reward(http_client) {
    let farm_reward = false;
    while (typeof farm_reward === "boolean" && !farm_reward) {
      await sleep(2);
      farm_reward = await this.api.claim_farming(http_client);

      if (!_.isNull(farm_reward) && !_.isEmpty(farm_reward)) {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🎉 Claimed farming reward | Balance <lb>${farm_reward?.availableBalance}</lb> | Available Play Pass <ye>${farm_reward?.playPasses}</ye>`
        );
      } else {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to claim farming reward. Retrying again...`
        );
        farm_reward = false;
        await sleep(3);
      }
    }
  }

  async start_farming(http_client) {
    let farm_response = false;
    while (typeof farm_response === "boolean" && !farm_response) {
      farm_response = await this.api.start_farming(http_client);
      if (!_.isNull(farm_response) && !_.isEmpty(farm_response)) {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${
            this.session_name
          } | Farming started  | End Time: <la>${new Date(
            farm_response?.endTime
          )}</la> | Earnings Rate: <pi>${farm_response?.earningsRate}</pi>`
        );
      } else {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to start farming. Retrying again...`
        );
        farm_response = false;
        await sleep(3);
      }
    }
  }

  async #start_game(http_client) {
    let game_response = false;
    while (typeof game_response === "boolean" && !game_response) {
      game_response = await this.api.start_game(http_client);
      if (
        _.isNull(game_response) ||
        _.isEmpty(game_response) ||
        _.isNull(game_response?.gameId)
      ) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to start game. Retrying again...`
        );
        game_response = false;
        await sleep(3);
      }
    }
    return game_response?.gameId;
  }

  async #claim_game_geward(http_client, gameId, points) {
    const data = { gameId, points };
    let game_reward = false;
    while (typeof game_reward === "boolean" && !game_reward) {
      game_reward = await this.api.claim_game_reward(http_client, data);
      if (_.isNull(game_reward) || _.isEmpty(game_reward)) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to claim game reward. Retrying again...`
        );
        game_reward = false;
        await sleep(3);
      }
    }
    return game_reward;
  }

  async handle_game(http_client) {
    const SLEEP_BEFORE_GAME = 20; // seconds
    const GAME_DURATION = 35; // seconds
    let profile_data = await this.fetch_user_data(http_client);

    while (profile_data?.playPasses > 0) {
      logger.info(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | sleeping for ${SLEEP_BEFORE_GAME} seconds before starting game...`
      );
      await sleep(SLEEP_BEFORE_GAME);

      const gameId = await this.#start_game(http_client);

      if (gameId) {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🎲  Game started | Duration: <la>${GAME_DURATION} seconds</la>`
        );
        await sleep(GAME_DURATION);

        const points = _.random(130, 220);
        const game_reward = await this.#claim_game_geward(
          http_client,
          gameId,
          points
        );

        if (game_reward?.toLowerCase() === "ok") {
          profile_data = await this.fetch_user_data(http_client); // Get latest profile data after the game
          logger.info(
            `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🎲  Game ended  | Earnings: <gr>+${points}</gr> Blum points | Available Play Passes: <ye>${profile_data?.playPasses}</ye> | Balance: <lb>${profile_data?.availableBalance}</lb>`
          );
        }
      }

      // Fetch updated profile data
      profile_data = await this.fetch_user_data(http_client);
    }
  }

  async #process_task(http_client, task) {
    const START_TASK_DELAY = 10; // seconds
    const CLAIM_TASK_DELAY = 15; // seconds
    const POST_CLAIM_DELAY = 10; // seconds
    if (task?.status?.toUpperCase() === "NOT_STARTED") {
      logger.info(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Sleeping ${START_TASK_DELAY} seconds before starting task: <lb>${task?.title}</lb>`
      );
      await sleep(START_TASK_DELAY);

      const start_response = await this.#start_tasks(
        http_client,
        task?.id,
        task?.title
      );
      if (
        !_.isEmpty(start_response) &&
        start_response?.status?.toUpperCase() === "STARTED"
      ) {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Sleeping ${CLAIM_TASK_DELAY} seconds before claiming task: <lb>${task?.title}</lb>`
        );
        await sleep(CLAIM_TASK_DELAY);

        const claim_response = await this.#claim_tasks(
          http_client,
          task?.id,
          task?.title
        );
        if (
          !_.isEmpty(claim_response) &&
          claim_response?.status?.toUpperCase() === "FINISHED"
        ) {
          logger.info(
            `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🎉 Completed task: <lb>${task?.title}</lb> | Reward: <gr>+${task?.reward}</gr>`
          );
        }
      }
    } else if (task?.status?.toUpperCase() === "STARTED") {
      logger.info(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Sleeping ${POST_CLAIM_DELAY} seconds after claiming task: <lb>${task?.title}</lb>`
      );
      await sleep(POST_CLAIM_DELAY);

      const claim_response = await await this.#claim_tasks(
        http_client,
        task?.id,
        task?.title
      );
      if (!_.isEmpty(claim_response) && claim_response?.status === "FINISHED") {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🎉 Completed task: <lb>${task?.title}</lb> | Reward: <gr>+${task?.reward}</gr>`
        );
      }
    }
  }

  async handle_task(http_client, tasks) {
    for (const task of tasks) {
      await this.#process_task(http_client, task);
    }
  }
}

module.exports = Fetchers;
