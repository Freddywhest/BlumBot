const app = require("../config/app");
const logger = require("../utils/logger");
const sleep = require("../utils/sleep");
var _ = require("lodash");

class ApiRequest {
  constructor(session_name, bot_name) {
    this.session_name = session_name;
    this.bot_name = bot_name;
  }

  async get_user_data(http_client) {
    try {
      const response = await http_client.get(
        `${app.gameApiUrl}/api/v1/user/balance`
      );

      return response.data;
    } catch (error) {
      if (error?.response?.status >= 500) {
        return false;
      }
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ${
            error?.response?.status >= 500
              ? "Server Error while getting User Data: "
              : ""
          }${error.response.data.message}`
        );
        return null;
      }
      const regex = /ENOTFOUND\s([^\s]+)/;
      const match = error.message.match(regex);
      logger.error(
        `<ye>[${this.bot_name}]</ye> | ${
          this.session_name
        } | Error while getting User Data: ${
          error.message.includes("ENOTFOUND") ||
          error.message.includes("getaddrinfo") ||
          error.message.includes("ECONNREFUSED")
            ? `The proxy server at ${
                match && match[1] ? match[1] : "unknown address"
              } could not be found. Please check the proxy address and your network connection`
            : error.message
        }`
      );
      await sleep(3); // Sleep for 3 seconds
      return null;
    }
  }

  async daily_reward(http_client) {
    try {
      const response = await http_client.post(
        `${app.gameApiUrl}/api/v1/daily-reward?offset=0`
      );
      return response.data == "OK";
    } catch (error) {
      if (
        error?.response?.data?.message &&
        error?.response?.data?.message?.includes("same day")
      ) {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Daily reward already claimed.`
        );
        return false;
      }

      if (
        error?.response?.data?.message &&
        error?.response?.data?.message?.includes("same day")
      ) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while claiming daily: ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while claiming daily: ${error.message}`
        );
      }

      return false;
    }
  }

  async get_friend_balance(http_client) {
    try {
      const response = await http_client.get(
        `${app.gatewayApiUrl}/api/v1/friends/balance`
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status >= 500) {
        return false;
      }
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>getting friends balance:</b>: ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>getting friends balance:</b>: ${error.message}`
        );
      }
      return null;
    }
  }

  async validate_query_id(http_client, data) {
    try {
      const response = await http_client.post(
        `${app.gatewayApiUrl}/api/v1/auth/provider/PROVIDER_TELEGRAM_MINI_APP`,
        JSON.stringify(data)
      );

      if (!_.isEmpty(response?.data)) {
        return true;
      }
      return false;
    } catch (error) {
      if (
        error?.response?.data?.message
          ?.toLowerCase()
          ?.includes("signature is invalid")
      ) {
        return false;
      }

      throw error;
    }
  }

  async claim_friends_balance(http_client) {
    try {
      const response = await http_client.post(
        `${app.gatewayApiUrl}/api/v1/friends/claim`
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status >= 500) {
        return false;
      }
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>claiming friends balance:</b> ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>claiming friends balance:</b> ${error.message}`
        );
      }
      return null;
    }
  }

  async get_time(http_client) {
    try {
      const response = await http_client.get(
        `${app.gameApiUrl}/api/v1/time/now`
      );
      return response.data;
    } catch (error) {
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>getting time:</b> ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>getting time:</b> ${error.message}`
        );
      }
      return null;
    }
  }

  async start_game(http_client) {
    try {
      const response = await http_client.post(
        `${app.gameApiUrl}/api/v2/game/play`
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status >= 500) {
        return false;
      }
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>starting game:</b> ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>starting game:</b> ${error.message}`
        );
      }
      return null;
    }
  }

  async claim_game_reward(http_client, data) {
    try {
      const response = await http_client.post(
        `${app.gameApiUrl}/api/v2/game/claim`,
        JSON.stringify(data)
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status >= 500) {
        return false;
      }
      if (error?.response?.status === 404) {
        return "not_found";
      }
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>claiming game reward:</b> ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>claiming game reward:</b> ${error.message}`
        );
      }
      return null;
    }
  }

  async start_farming(http_client) {
    try {
      const response = await http_client.post(
        `${app.gameApiUrl}/api/v1/farming/start`
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status >= 500) {
        return false;
      }
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>starting farming:</b> ${error?.response?.data?.message}`
        );
        return error?.response?.data?.message;
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>starting farming:</b> ${error.message}`
        );
      }
      return "error";
    }
  }

  async claim_farming(http_client) {
    try {
      const response = await http_client.post(
        `${app.gameApiUrl}/api/v1/farming/claim`
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status >= 500) {
        return false;
      }
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>claiming farm reward:</b> ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>claiming farm reward:</b> ${error.message}`
        );
      }
      return null;
    }
  }

  async refresh_token(http_client, data) {
    try {
      const response = await http_client.post(
        `${app.gatewayApiUrl}/api/v1/auth/refresh`,
        JSON.stringify(data)
      );
      return response.data;
    } catch (error) {
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>refreshing JWT token:</b> ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>refreshing JWT token:</b> ${error.message}`
        );
      }
      return null;
    }
  }

  async check_jwt(http_client) {
    try {
      const response = await http_client.get(
        `${app.gatewayApiUrl}/api/v1/user/me`
      );
      return response.data?.username ? true : false;
    } catch (error) {
      if (error?.response?.data?.message && error?.response?.data?.code == 16) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ JWT token has expired: ${error?.response?.data?.message} | Trying to refresh...`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>checking JWT token:</b> ${error.message}`
        );
      }
      return false;
    }
  }

  async get_tribes(http_client) {
    try {
      const response = await http_client.get(
        `${app.tribeApiUrl}/api/v1/tribe?search=Freddy_bots`
      );
      return response.data;
    } catch (error) {
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>getting tribes:</b> ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>getting tribes:</b> ${error.message}`
        );
      }
      return [];
    }
  }

  async join_tribe(http_client, tribe_id) {
    try {
      const response = await http_client.post(
        `${app.tribeApiUrl}/api/v1/tribe/${tribe_id}/join`
      );
      return response.data;
    } catch (error) {
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>joining tribe:</b> ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>joining tribe:</b> ${error.message}`
        );
      }
      return null;
    }
  }

  async check_my_tribe(http_client) {
    try {
      await http_client.get(`${app.tribeApiUrl}/api/v1/tribe/my`);
      return true;
    } catch (error) {
      if (
        error?.response?.data?.canCreateTribe &&
        error?.response?.data?.canCreateTribe == true
      ) {
        return false;
      } else if (
        error?.response?.data?.message &&
        !error?.response?.data?.message?.includes("NOT_FOUND")
      ) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>checking my tribe:</b> ${error?.response?.data?.message}`
        );
        return false;
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>checking my tribe:</b> ${error.message}`
        );
        return null;
      }
    }
  }

  async get_tasks(http_client) {
    try {
      const response = await http_client.get(`${app.earnApiUrl}/api/v1/tasks`);
      return response.data;
    } catch (error) {
      if (error?.response?.status >= 500) {
        return false;
      }
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>getting tasks:</b> ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>getting tasks:</b> ${error.message}`
        );
      }
      return null;
    }
  }

  async start_task(http_client, task_id) {
    try {
      const response = await http_client.post(
        `${app.earnApiUrl}/api/v1/tasks/${task_id}/start`
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status >= 500) {
        return false;
      }
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>starting tasks:</b> ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>starting tasks:</b> ${error.message}`
        );
      }
      return null;
    }
  }

  async claim_task(http_client, task_id) {
    try {
      const response = await http_client.post(
        `${app.earnApiUrl}/api/v1/tasks/${task_id}/claim`
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status >= 500) {
        return false;
      }
      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ⚠️ Error while <b>claiming tasks:</b> ${error?.response?.data?.message}`
        );
        return error?.response?.data?.message;
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>claiming tasks:</b> ${error.message}`
        );
        return null;
      }
    }
  }
}

module.exports = ApiRequest;
