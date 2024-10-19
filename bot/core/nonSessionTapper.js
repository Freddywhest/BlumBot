const { default: axios } = require("axios");
const logger = require("../utils/logger");
const headers = require("./header");
const settings = require("../config/config");
const app = require("../config/app");
const user_agents = require("../config/userAgents");
const fs = require("fs");
const sleep = require("../utils/sleep");
const ApiRequest = require("./api");
var _ = require("lodash");
const path = require("path");
const _isArray = require("../utils/_isArray");
const Fetchers = require("../utils/fetchers");
const { HttpsProxyAgent } = require("https-proxy-agent");

class NonSessionTapper {
  constructor(query_id, query_name, lkl) {
    this.bot_name = "blum";
    this.session_name = query_name;
    this.query_id = query_id;
    this.session_user_agents = this.#load_session_data();
    this.headers = { ...headers, "user-agent": this.#get_user_agent() };
    this.api = new ApiRequest(this.session_name, this.bot_name);
    this.lkl = lkl;
  }

  #load_session_data() {
    try {
      const filePath = path.join(process.cwd(), "session_user_agents.json");
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        return {};
      } else {
        throw error;
      }
    }
  }

  #get_random_user_agent() {
    const randomIndex = Math.floor(Math.random() * user_agents.length);
    return user_agents[randomIndex];
  }

  #get_user_agent() {
    if (this.session_user_agents[this.session_name]) {
      return this.session_user_agents[this.session_name];
    }

    logger.info(
      `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Generating new user agent...`
    );
    const newUserAgent = this.#get_random_user_agent();
    this.session_user_agents[this.session_name] = newUserAgent;
    this.#save_session_data(this.session_user_agents);
    return newUserAgent;
  }

  #save_session_data(session_user_agents) {
    const filePath = path.join(process.cwd(), "session_user_agents.json");
    fs.writeFileSync(filePath, JSON.stringify(session_user_agents, null, 2));
  }

  #proxy_agent(proxy) {
    try {
      if (!proxy) return null;
      let proxy_url;
      if (!proxy.password && !proxy.username) {
        proxy_url = `${proxy.protocol}://${proxy.ip}:${proxy.port}`;
      } else {
        proxy_url = `${proxy.protocol}://${proxy.username}:${proxy.password}@${proxy.ip}:${proxy.port}`;
      }
      return new HttpsProxyAgent(proxy_url);
    } catch (e) {
      logger.error(
        `<ye>[${this.bot_name}]</ye> | ${
          this.session_name
        } | Proxy agent error: ${e}\nProxy: ${JSON.stringify(proxy, null, 2)}`
      );
      return null;
    }
  }

  async #get_tg_web_data() {
    try {
      const json = {
        query: this.query_id,
      };
      return json;
    } catch (error) {
      logger.error(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ❗️Unknown error during Authorization: ${error}`
      );
      throw error;
    } finally {
      /* await this.tg_client.disconnect(); */
      await sleep(1);
      logger.info(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🚀 Starting session...`
      );
    }
  }
  async run(proxy) {
    let http_client;
    let access_token_created_time = 0;

    let profile_data;
    let sleep_reward = 0;
    let access_token;
    let tasks = [];

    const fetchers = new Fetchers(
      this.api,
      this.session_name,
      this.bot_name,
      this.lkl
    );

    if (settings.USE_PROXY_FROM_FILE && proxy) {
      http_client = axios.create({
        httpsAgent: this.#proxy_agent(proxy),
        headers: this.headers,
        withCredentials: true,
      });
      const proxy_result = await fetchers.check_proxy(http_client, proxy);
      if (!proxy_result) {
        http_client = axios.create({
          headers: this.headers,
          withCredentials: true,
        });
      }
    } else {
      http_client = axios.create({
        headers: this.headers,
        withCredentials: true,
      });
    }
    while (true) {
      try {
        const currentTime = Date.now() / 1000;
        if (currentTime - access_token_created_time >= 1800) {
          const tg_web_data = await this.#get_tg_web_data();
          if (
            _.isNull(tg_web_data) ||
            _.isUndefined(tg_web_data) ||
            !tg_web_data ||
            _.isEmpty(tg_web_data)
          ) {
            continue;
          }

          access_token = await fetchers.get_access_token(
            tg_web_data,
            http_client
          );
          if (!access_token) {
            continue;
          }
          http_client.defaults.headers[
            "authorization"
          ] = `Bearer ${access_token?.access}`;
          access_token_created_time = currentTime;
          await sleep(2);
        }

        profile_data = await fetchers.fetch_user_data(http_client);
        const time = await this.api.get_time(http_client);
        const checkJWT = await this.api.check_jwt(http_client);
        tasks = await fetchers.fetch_tasks(http_client);

        if (!checkJWT || !profile_data) {
          profile_data = null;
          access_token = null;
          access_token_created_time = 0;
          continue;
        }
        // Get latest profile data after the game
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Available Play Passes: <ye>${profile_data?.playPasses}</ye> | Balance: <lb>${profile_data?.availableBalance}</lb>`
        );

        await sleep(2);

        // Daily reward
        if (currentTime >= sleep_reward) {
          if (settings.CLAIM_DAILY_REWARD) {
            const daily_reward = await this.api.daily_reward(http_client);
            if (daily_reward) {
              logger.info(
                `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🎉 Claimed daily reward`
              );
            } else {
              sleep_reward = currentTime + 18000;
              logger.info(
                `<ye>[${this.bot_name}]</ye> | ${
                  this.session_name
                } | ⏰ Daily reward not available. Next check: <b><lb>${new Date(
                  sleep_reward * 1000
                )}</lb></b>`
              );
            }
          }
        }

        if (settings.CLAIM_TASKS_REWARD) {
          /* logger.info(
            `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Claiming of tasks is not available for everyone yet. <br /> Set <b><la>CLAIM_TASKS_REWARD=False</la></b> to disable this message.`
          ); */
          await fetchers.handle_task(http_client, tasks);
        }

        // Sleep
        await sleep(3);

        // Tribe
        if (settings.AUTO_JOIN_TRIBE) {
          const check_my_tribe = await this.api.check_my_tribe(http_client);
          if (check_my_tribe === false) {
            const get_tribes = await this.api.get_tribes(http_client);
            if (
              Array.isArray(get_tribes?.items) &&
              get_tribes?.items?.length > 0
            ) {
              await this.api.join_tribe(http_client, get_tribes?.items[0].id);
              logger.info(
                `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Joined tribe: <lb>${get_tribes?.items[0].chatname}</lb>`
              );
            }
          }
        }

        if (time?.now >= profile_data?.farming?.endTime) {
          await sleep(3);
          if (settings.AUTO_CLAIM_FARMING_REWARD) {
            logger.info(
              `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Claiming farming reward...`
            );
            await fetchers.claim_farming_reward(http_client);
          }
        } else if (time?.now >= profile_data?.farming?.startTime) {
          const remainingHours = Math.floor(
            (profile_data?.farming?.endTime - time?.now) / 1000 / 60 / 60
          );
          logger.info(
            `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Farming ends in ${remainingHours} hour(s)`
          );
        }

        // Farming
        if (!profile_data?.farming) {
          await sleep(2);
          if (settings.AUTO_START_FARMING) {
            await fetchers.start_farming(http_client);
          }
        }

        // Sleep
        await sleep(3);

        // Re-assign profile data
        profile_data = await fetchers.fetch_user_data(http_client);

        if (settings.AUTO_PLAY_GAMES) {
          await fetchers.handle_game(http_client);
        }

        // Sleep
        await sleep(3);

        if (settings.CLAIM_FRIENDS_REWARD) {
          // Friend reward
          const friend_reward = await this.api.get_friend_balance(http_client);
          if (
            friend_reward?.canClaim &&
            !isNaN(parseInt(friend_reward?.amountForClaim))
          ) {
            if (parseInt(friend_reward?.amountForClaim) > 0) {
              const friend_reward_response =
                await this.api.claim_friends_balance(http_client);
              if (friend_reward_response?.claimBalance) {
                // Re-assign profile data
                profile_data = await fetchers.fetch_user_data(http_client);
                logger.info(
                  `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🎉 Claimed friends reward <gr>+${friend_reward_response?.claimBalance}</gr> | Balance: <lb>${profile_data?.availableBalance}</lb>`
                );
              }
            }
          }
        }
      } catch (error) {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ❗️Unknown error: ${error}`
        );
      } finally {
        let ran_sleep;
        if (_isArray(settings.SLEEP_BETWEEN_TAP)) {
          if (
            _.isInteger(settings.SLEEP_BETWEEN_TAP[0]) &&
            _.isInteger(settings.SLEEP_BETWEEN_TAP[1])
          ) {
            ran_sleep = _.random(
              settings.SLEEP_BETWEEN_TAP[0],
              settings.SLEEP_BETWEEN_TAP[1]
            );
          } else {
            ran_sleep = _.random(450, 800);
          }
        } else if (_.isInteger(settings.SLEEP_BETWEEN_TAP)) {
          const ran_add = _.random(20, 50);
          ran_sleep = settings.SLEEP_BETWEEN_TAP + ran_add;
        } else {
          ran_sleep = _.random(450, 800);
        }

        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Sleeping for ${ran_sleep} seconds...`
        );
        await sleep(ran_sleep);
      }
    }
  }
}
module.exports = NonSessionTapper;
