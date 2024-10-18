const app = require("../config/app");
const settings = require("../config/config");
const { GP } = require("./helper");
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
      if (!_.isNull(profile_data) && !_.isEmpty(profile_data)) {
        return profile_data;
      }

      if (profile_data == false) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to get user data. Retrying again...`
        );
        await sleep(5);
        continue;
      }

      if (_.isNull(profile_data)) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while getting user data. Aborting...`
        );
        break;
      }
    }
    return null;
  }

  async fetch_tasks(http_client) {
    let tasks = false;
    while (typeof tasks == "boolean" && !tasks) {
      await sleep(2);
      tasks = await this.api.get_tasks(http_client);
      if (!_.isNull(tasks) && !_.isEmpty(tasks)) {
        return this.#filter_tasks(tasks);
      }

      if (tasks == false) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to get tasks. Retrying again...`
        );
        await sleep(5);
        continue;
      }

      if (_.isNull(tasks)) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while getting tasks. Aborting...`
        );
        break;
      }
    }
    return null;
  }

  async #start_tasks(http_client, task_id, task_name) {
    let tasks_data = false;
    while (typeof tasks_data == "boolean" && !tasks_data) {
      await sleep(2);
      tasks_data = await this.api.start_task(http_client, task_id);
      if (!_.isNull(tasks_data) && !_.isEmpty(tasks_data)) {
        return tasks_data;
      }
      if (tasks_data == false) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to start task <la>${task_name}</la>. Retrying again...`
        );
        await sleep(5);
        continue;
      }

      if (_.isNull(tasks_data)) {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while starting task <la>${task_name}</la>. Aborting...`
        );
        break;
      }
    }
    return null;
  }

  async #claim_tasks(http_client, task_id, task_name) {
    let tasks_data = false;
    while (typeof tasks_data === "boolean" && !tasks_data) {
      await sleep(2);
      tasks_data = await this.api.claim_task(http_client, task_id);

      // Check if tasks_data is a string and contains "Task is already claimed"
      if (
        typeof tasks_data === "string" &&
        tasks_data?.toLowerCase()?.includes("task is already claimed")
      ) {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Task <la>${task_name}</la> is already claimed. Stopping retry.`
        );
        break; // Exit the loop if the task is already claimed
      }
      // Successful claim
      if (!_.isNull(tasks_data) && !_.isEmpty(tasks_data)) {
        return tasks_data;
      }

      // Retry on server errors (status >= 500)
      if (tasks_data === false) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to claim task <la>${task_name}</la>. Retrying again...`
        );
        await sleep(5);
        continue;
      }

      if (_.isNull(tasks_data)) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while claiming task. Exiting...`
        );
        break;
      }
    }
    return null;
  }

  async claim_farming_reward(http_client) {
    let farm_reward = false;

    while (typeof farm_reward === "boolean" && !farm_reward) {
      await sleep(2); // Add delay before each retry

      farm_reward = await this.api.claim_farming(http_client);

      // Successful claim
      if (!_.isNull(farm_reward) && !_.isEmpty(farm_reward)) {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🎉 Claimed farming reward | Balance <lb>${farm_reward?.availableBalance}</lb> | Available Play Pass <ye>${farm_reward?.playPasses}</ye>`
        );
        return farm_reward; // Exit the loop as reward was claimed successfully
      }

      // Retry on server errors (status >= 500)
      if (farm_reward === false) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to claim farming reward. Retrying again...`
        );
        await sleep(5); // Wait before retrying
        continue;
      }

      // Exit on non-retryable error (if an error message is returned)
      if (farm_reward === null) {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while claiming farming reward. Exiting...`
        );
        break; // Exit loop on unknown or non-retryable errors
      }
    }

    return null; // Return null if claiming the reward failed
  }

  async start_farming(http_client) {
    let farm_response = false;

    while (typeof farm_response === "boolean" && !farm_response) {
      farm_response = await this.api.start_farming(http_client);

      // Check if the farm response was successful
      if (!_.isNull(farm_response) && !_.isEmpty(farm_response)) {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${
            this.session_name
          } | Farming started | End Time: <la>${new Date(
            farm_response?.endTime
          )}</la> | Earnings Rate: <pi>${farm_response?.earningsRate}</pi>`
        );
        return farm_response; // Exit the loop as farming started successfully
      }

      // Check if the response is a retryable server error
      if (farm_response === false) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to start farming. Retrying again...`
        );
        await sleep(3); // Wait before retrying
        continue;
      }

      // Check if the response is an error message (non-retryable)
      if (typeof farm_response === "string" && farm_response !== "error") {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Farming failed with message: <la>${farm_response}</la>. Exiting...`
        );
        break; // Exit the loop for non-retryable errors
      }

      // Handle generic error case
      if (farm_response === "error") {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Farming failed due to an unknown error. Exiting...`
        );
        break; // Exit the loop on unknown errors
      }
    }

    return null; // Return null if farming couldn't be started
  }

  async #start_game(http_client) {
    let game_response = false;

    while (typeof game_response === "boolean" && !game_response) {
      game_response = await this.api.start_game(http_client);

      // If it's a retryable error, continue retrying
      if (game_response === false) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to start game. Retrying again...`
        );
        await sleep(5);
        continue; // Continue the loop
      }

      // If it's a non-retryable error (null), exit the loop
      if (_.isNull(game_response)) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to start game. Non-retryable error occurred, stopping retries.`
        );
        break; // Exit the loop
      }

      // Exit the loop when gameId is received
      if (!_.isNull(game_response?.gameId)) {
        return game_response;
      }
    }

    return null; // Return null if gameId could not be retrieved
  }

  async #claim_game_reward(http_client, payload) {
    const data = { payload };
    let game_reward = false;

    while (typeof game_reward === "boolean" && !game_reward) {
      game_reward = await this.api.claim_game_reward(http_client, data);

      // Handle retryable errors
      if (game_reward === false) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to claim game reward. Retrying again...`
        );
        await sleep(5);
        continue;
      }

      // Handle game not found (404)
      if (game_reward === "not_found") {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Game reward not found for gameId: <la>${gameId}</la>. Exiting...`
        );
        break; // Exit the loop if the game is not found
      }

      // Handle non-retryable errors (e.g., other than 500)
      if (_.isNull(game_reward)) {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to claim game reward. Non-retryable error occurred, stopping retries.`
        );
        break; // Exit the loop for non-retryable errors
      }

      // Exit the loop if reward is successfully claimed
      if (!_.isEmpty(game_reward)) {
        return game_reward; // Successfully claimed reward
      }
    }

    return null; // Return null if reward couldn't be claimed
  }

  async handle_game(http_client) {
    const SLEEP_BEFORE_GAME = _.random(
      settings.DELAY_BETWEEN_GAME[0],
      settings.DELAY_BETWEEN_GAME[1]
    ); // seconds
    const GAME_DURATION = 30.05; // seconds
    let profile_data = await this.fetch_user_data(http_client);

    while (profile_data?.playPasses > 0) {
      logger.info(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | sleeping for ${SLEEP_BEFORE_GAME} seconds before starting game...`
      );
      await sleep(SLEEP_BEFORE_GAME);

      const start_game = await this.#start_game(http_client);

      if (start_game && start_game?.gameId) {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🎲  Game started | Duration: <la>30 seconds</la>`
        );
        const GPM = await GP();
        if (!_.isNull(GPM)) {
          const result = await GPM(start_game?.gameId, start_game);
          if (
            !_.isEmpty(result) &&
            result?.p_x &&
            result?.pts &&
            result?.executionTime
          ) {
            await sleep(GAME_DURATION - result.executionTime);

            const game_reward = await this.#claim_game_reward(
              http_client,
              result?.p_x
            );

            if (game_reward?.toLowerCase() === "ok") {
              profile_data = await this.fetch_user_data(http_client); // Get latest profile data after the game
              logger.info(
                `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🎲  Game ended  | Earnings: <gr>+${result?.pts}</gr> Blum points | Available Play Passes: <ye>${profile_data?.playPasses}</ye> | Balance: <lb>${profile_data?.availableBalance}</lb>`
              );
            }
          } else {
            logger.error(
              `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to get game payload. Exiting...`
            );
            break;
          }
        } else {
          logger.error(
            `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to GPM. Exiting...`
          );
          break;
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

      const claim_response = await this.#claim_tasks(
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
