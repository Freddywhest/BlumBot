const { default: axios } = require("axios");
const logger = require("../utils/logger");
const headers = require("./header");
const { Api } = require("telegram");
const settings = require("../config/config");
const app = require("../config/app");
const user_agents = require("../config/userAgents");
const fs = require("fs");
const sleep = require("../utils/sleep");
const ApiRequest = require("./api");
var _ = require("lodash");
const parser = require("../utils/parser");
const path = require("path");
const _isArray = require("../utils/_isArray");
const FdyTmp = require("fdy-tmp");
const Fetchers = require("../utils/fetchers");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { checkUrls } = require("../utils/assetsChecker");
const UAParser = require("ua-parser-js");
const deviceResolutions = require("../config/deviceResolutions");
const analyticsEvent = require("analytics-core-fdy");
const { v4: uuid } = require("uuid");

class Tapper {
  constructor(tg_client, xg) {
    this.bot_name = "blum";
    this.session_name = tg_client.session_name;
    this.tg_client = tg_client.tg_client;
    this.session_user_agents = this.#load_session_data();
    this.headers = { ...headers, "user-agent": this.#get_user_agent() };
    this.api = new ApiRequest(this.session_name, this.bot_name);
    this.sleep_floodwait = 0;
    this.runOnce = false;
    this.xg = xg;
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

  #clean_tg_web_data(queryString) {
    let cleanedString = queryString.replace(/^tgWebAppData=/, "");
    cleanedString = cleanedString.replace(
      /&tgWebAppVersion=.*?&tgWebAppPlatform=.*?(?:&tgWebAppBotInline=.*?)?$/,
      ""
    );
    return cleanedString;
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

  #get_platform(userAgent) {
    const platformPatterns = [
      { pattern: /iPhone/i, platform: "ios" },
      { pattern: /Android/i, platform: "android" },
      { pattern: /iPad/i, platform: "ios" },
    ];

    for (const { pattern, platform } of platformPatterns) {
      if (pattern.test(userAgent)) {
        return platform;
      }
    }

    return "Unknown";
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
      const tmp = new FdyTmp({
        fileName: `${this.bot_name}.fdy.tmp`,
        tmpPath: path.join(process.cwd(), "cache/queries"),
      });
      if (tmp.hasJsonElement(this.session_name)) {
        const queryStringFromCache = tmp.getJson(this.session_name);
        if (!_.isEmpty(queryStringFromCache)) {
          const json = {
            query: queryStringFromCache,
          };

          const va_hc = axios.create({
            headers: this.headers,
            withCredentials: true,
          });

          const validate = await this.api.validate_query_id(va_hc, json);

          if (validate) {
            logger.info(
              `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🔄 Getting data from cache...`
            );
            if (this.tg_client.connected) {
              await this.tg_client.disconnect();
              await this.tg_client.destroy();
            }
            await sleep(5);
            return json;
          } else {
            tmp.deleteJsonElement(this.session_name);
          }
        }
      }
      await this.tg_client.connect();
      await this.tg_client.start();
      const platform = this.#get_platform(this.#get_user_agent());

      if (!this.bot) {
        this.bot = await this.tg_client.getInputEntity(app.bot);
      }

      if (!this.runOnce) {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 📡 Waiting for authorization...`
        );
        const botHistory = await this.tg_client.invoke(
          new Api.messages.GetHistory({
            peer: this.bot,
            limit: 10,
          })
        );
        if (botHistory.messages.length < 1) {
          await this.tg_client.invoke(
            new Api.messages.SendMessage({
              message: "/start",
              silent: true,
              noWebpage: true,
              peer: this.bot,
            })
          );
        }
      }

      await sleep(5);

      const result = await this.tg_client.invoke(
        new Api.messages.RequestWebView({
          peer: this.bot,
          bot: this.bot,
          platform,
          from_bot_menu: true,
          url: app.webviewUrl,
        })
      );

      const authUrl = result.url;
      const tgWebData = authUrl.split("#", 2)[1];
      logger.info(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 💾 Storing data in cache...`
      );

      await sleep(5);

      tmp
        .addJson(
          this.session_name,
          decodeURIComponent(this.#clean_tg_web_data(tgWebData))
        )
        .save();

      const json = {
        query: decodeURIComponent(this.#clean_tg_web_data(tgWebData)),
      };

      return json;
    } catch (error) {
      if (error.message.includes("AUTH_KEY_DUPLICATED")) {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | The same authorization key (session file) was used in more than one place simultaneously. You must delete your session file and create a new session`
        );
        return null;
      }
      const regex = /A wait of (\d+) seconds/;
      if (
        error.message.includes("FloodWaitError") ||
        error.message.match(regex)
      ) {
        const match = error.message.match(regex);

        if (match) {
          this.sleep_floodwait =
            new Date().getTime() / 1000 + parseInt(match[1], 10) + 10;
        } else {
          this.sleep_floodwait = new Date().getTime() / 1000 + 50;
        }
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${
            this.session_name
          } | Some flood error, waiting ${
            this.sleep_floodwait - new Date().getTime() / 1000
          } seconds to try again...`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ❗️Unknown error during Authorization: ${error}`
        );
      }
      return null;
    } finally {
      if (this.tg_client.connected) {
        await this.tg_client.disconnect();
        await this.tg_client.destroy();
      }
      this.runOnce = true;
      if (this.sleep_floodwait > new Date().getTime() / 1000) {
        await sleep(this.sleep_floodwait - new Date().getTime() / 1000);
        return await this.#get_tg_web_data();
      }
      await sleep(3);
    }
  }

  async run(proxy) {
    let http_client;
    let access_token_created_time = 0;
    const uaJson = new UAParser(this.#get_user_agent()).getResult();
    let profile_data;
    let sleep_reward = 0;
    let access_token;
    let tasks = [];
    let runCount = 0;
    let sessionInfo = {};
    let userTgInfo = {};
    let dr = null;
    const userAgent = {
      ua: uaJson.ua,
      screen: {
        width: deviceResolutions[uaJson.device.model]?.width ?? 1080,
        height: deviceResolutions[uaJson.device.model]?.width ?? 3088,
      },
      browserInfo: `${uaJson.browser.name};${uaJson.browser.version}|${
        uaJson.os.name
      }%20WebView;${uaJson.browser.version}|Not%3FA_Brand;${_.random(
        80,
        99
      )}.0.0.0`,
      deviceModel: uaJson.device.model,
      deviceVersion: uaJson.os.version,
    };
    let session_count = 0;

    await checkUrls(this.bot_name, this.session_name);

    const fetchers = new Fetchers(
      this.api,
      this.session_name,
      this.bot_name,
      this.xg
    );

    if (
      (settings.USE_PROXY_FROM_TXT_FILE || settings.USE_PROXY_FROM_JS_FILE) &&
      proxy
    ) {
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
    while (runCount < settings.RUN_COUNT) {
      try {
        const currentTime = Date.now() / 1000;
        if (currentTime - access_token_created_time >= 1800) {
          session_count = 0;
          sessionInfo = {
            _p: `${Date.now()}`,
            tag_exp: `101${_.random(800000, 899999)}~101${_.random(
              900000,
              999999
            )}`,
            cid: `${_.random(1000000000, 1999999999)}.${_.floor(
              Date.now() / 1000 + 1
            )}`,
            sid: `${_.floor(currentTime)}`,
          };
          const tg_web_data = await this.#get_tg_web_data();
          if (
            _.isNull(tg_web_data) ||
            _.isUndefined(tg_web_data) ||
            !tg_web_data ||
            _.isEmpty(tg_web_data)
          ) {
            continue;
          }
          const parsedUser = parser.toJson(tg_web_data?.query);

          userTgInfo = {
            username: parsedUser?.user?.username,
            language_code: parsedUser?.user?.language_code,
            allows_write_to_pm: parsedUser?.user?.allows_write_to_pm,
            added_to_attachment_menu: false,
            userId: parsedUser?.user?.id,
          };
          session_count += 1;
          await analyticsEvent.tgAnalytics(
            userAgent,
            { init: uuid(), hide: uuid() },
            "init",
            userTgInfo
          );

          await sleep(_.random(1, 3));

          access_token = await fetchers.get_access_token(
            tg_web_data,
            http_client
          );
          if (!access_token) {
            continue;
          }

          session_count += 1;
          await analyticsEvent.ganalytics(
            "/",
            "login",
            session_count,
            userAgent,
            sessionInfo,
            currentTime * 1000,
            null,
            userTgInfo
          );
          await sleep(_.random(1, 2));

          await analyticsEvent.postHog(
            "/",
            "login",
            userTgInfo,
            userTgInfo?.userId
          );

          http_client.defaults.headers[
            "authorization"
          ] = `Bearer ${access_token?.access}`;
          access_token_created_time = currentTime;
          await sleep(2);
        }

        profile_data = await fetchers.fetch_user_data(http_client);
        const time = await this.api.get_time(http_client);
        const checkJWT = await this.api.check_jwt(http_client);
        if (!checkJWT || !profile_data) {
          profile_data = null;
          access_token = null;
          access_token_created_time = 0;
          continue;
        }

        // Sleep
        await sleep(3);

        // Daily reward
        if (currentTime >= sleep_reward) {
          if (settings.CLAIM_DAILY_REWARD) {
            const daily_reward = await this.api.daily_reward(http_client);
            if (daily_reward) {
              session_count += 1;
              await analyticsEvent.ganalytics(
                "/daily-reward",
                "page_view",
                session_count,
                userAgent,
                sessionInfo,
                currentTime * 1000,
                dr
              );
              dr = "/daily-reward";
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
        // Sleep
        await sleep(3);

        const viewPage = _.random(1, 6);

        if (viewPage == 1) {
          session_count += 1;

          await analyticsEvent.ganalytics(
            "/wallet",
            "page_view",
            session_count,
            userAgent,
            sessionInfo,
            currentTime * 1000,
            null
          );

          dr = "/wallet";
        } else if (viewPage == 2) {
          session_count += 1;

          await analyticsEvent.ganalytics(
            "/tasks",
            "page_view",
            session_count,
            userAgent,
            sessionInfo,
            currentTime * 1000,
            null
          );

          dr = "/tasks";
        } else if (viewPage == 3) {
          session_count += 1;

          await analyticsEvent.ganalytics(
            "/frens",
            "page_view",
            session_count,
            userAgent,
            sessionInfo,
            currentTime * 1000,
            null
          );

          dr = "/frens";
        } else {
          dr = "/";
        }
        // Get latest profile data after the game
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Available Play Passes: <ye>${profile_data?.playPasses}</ye> | Balance: <lb>${profile_data?.availableBalance}</lb>`
        );

        await sleep(2);

        if (time?.now >= profile_data?.farming?.endTime) {
          await sleep(3);
          if (settings.AUTO_CLAIM_FARMING_REWARD) {
            logger.info(
              `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Claiming farming reward...`
            );
            await fetchers.claim_farming_reward(http_client);
            session_count += 1;
            await analyticsEvent.ganalytics(
              "/",
              "farming_claimed",
              session_count,
              userAgent,
              sessionInfo,
              currentTime * 1000,
              dr,
              {
                num: profile_data?.farming?.balance,
              }
            );

            await sleep(1);

            await analyticsEvent.postHog("farming_claimed", {
              num: profile_data?.farming?.balance,
            });
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
            session_count += 1;
            await analyticsEvent.ganalytics(
              "/",
              "farming_started",
              session_count,
              userAgent,
              sessionInfo,
              currentTime * 1000,
              dr
            );

            await sleep(1);

            await analyticsEvent.postHog("farming_started");
          }
        }

        if (settings.CLAIM_TASKS_REWARD) {
          /* logger.info(
            `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Claiming of tasks is not available for everyone yet. <br /> Set <b><la>CLAIM_TASKS_REWARD=False</la></b> to disable this message.`
          ); */
          tasks = await fetchers.fetch_tasks(http_client);

          session_count += 1;

          await analyticsEvent.ganalytics(
            "/tasks",
            "page_view",
            session_count,
            userAgent,
            sessionInfo,
            currentTime * 1000,
            dr
          );

          dr = "/tasks";

          await fetchers.handle_task(http_client, tasks);
        }

        // Sleep
        await sleep(3);

        // Tribe
        if (settings.AUTO_JOIN_TRIBE) {
          const check_my_tribe = await this.api.check_my_tribe(http_client);
          if (check_my_tribe === false) {
            session_count += 1;

            await analyticsEvent.ganalytics(
              "/tribe",
              "page_view",
              session_count,
              userAgent,
              sessionInfo,
              currentTime * 1000,
              dr == "/tribe" ? null : dr
            );

            dr = "/tribe";
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

        // Re-assign profile data
        profile_data = await fetchers.fetch_user_data(http_client);

        const view2ndPage = _.random(1, 3);

        if (view2ndPage == 1) {
          session_count += 1;

          await analyticsEvent.ganalytics(
            "/tribe",
            "page_view",
            session_count,
            userAgent,
            sessionInfo,
            currentTime * 1000,
            dr
          );

          dr = "/tribe";

          await analyticsEvent.ganalytics(
            "/tribe",
            "scroll",
            session_count,
            userAgent,
            sessionInfo,
            currentTime * 1000,
            dr
          );

          await sleep(2);

          await analyticsEvent.ganalytics(
            "/tribe/top",
            "page_view",
            session_count,
            userAgent,
            sessionInfo,
            currentTime * 1000,
            dr
          );

          dr = "/tribe/top";
        } else if (view2ndPage == 2) {
          session_count += 1;

          await analyticsEvent.ganalytics(
            "/tasks",
            "page_view",
            session_count,
            userAgent,
            sessionInfo,
            currentTime * 1000,
            null
          );

          dr = "/tasks";
        } else if (view2ndPage == 3) {
          session_count += 1;

          await analyticsEvent.ganalytics(
            "/",
            "page_view",
            session_count,
            userAgent,
            sessionInfo,
            currentTime * 1000,
            null
          );

          dr = "/";
        }

        if (settings.AUTO_PLAY_GAMES) {
          session_count += _.random(2, 5);

          await analyticsEvent.ganalytics(
            "/game",
            "page_view",
            session_count,
            userAgent,
            sessionInfo,
            currentTime * 1000,
            dr
          );

          dr = "/game";

          await fetchers.handle_game(
            http_client,
            currentTime,
            session_count,
            userAgent,
            sessionInfo,
            dr
          );
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
            session_count += _.random(1, 7);

            await analyticsEvent.ganalytics(
              "/frens",
              "page_view",
              session_count,
              userAgent,
              sessionInfo,
              currentTime * 1000,
              dr
            );

            dr = "/frens";
            if (parseInt(friend_reward?.amountForClaim) > 0) {
              const friend_reward_response =
                await this.api.claim_friends_balance(http_client);
              if (friend_reward_response?.claimBalance) {
                // Re-assign profile data
                profile_data = await fetchers.fetch_user_data(http_client);

                session_count += 1;

                await analyticsEvent.ganalytics(
                  "/frens",
                  "frens_claimed",
                  session_count,
                  userAgent,
                  sessionInfo,
                  currentTime * 1000,
                  dr,
                  {
                    num: friend_reward_response?.claimBalance,
                  }
                );
                dr = "/frens";

                await analyticsEvent.postHog("frens_claimed", {
                  num: friend_reward_response?.claimBalance,
                });
                logger.info(
                  `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🎉 Claimed friends reward <gr>+${friend_reward_response?.claimBalance}</gr> | Balance: <lb>${profile_data?.availableBalance}</lb>`
                );
              }
            }
          }
        }
      } catch (error) {
        console.log(error);

        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ❗️Unknown error: ${error}`
        );
      } finally {
        await checkUrls(this.bot_name, this.session_name);
        if (settings.USE_NON_THREAD) {
          runCount++;
        } else {
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
}
module.exports = Tapper;
