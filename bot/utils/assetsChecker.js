const assetsConfig = require("../../assets.json");
const logger = require("../utils/logger");
const gameName = "Blum";
const axios = require("axios");

async function checkUrls(bot_name, session_name) {
  try {
    const startTime = Date.now();
    logger.info(
      `<ye>[${bot_name}]</ye> | ${session_name} | Checking for changes from <bl>${gameName}</bl>...`
    );

    // Check main URL
    const mainUrlResponse = await axios.get(assetsConfig.mainUrl);
    if (mainUrlResponse.status !== 200) {
      logger.error(
        `<ye>[${bot_name}]</ye> | ${session_name} | Bot stopped | Detected some changes with <bl>${gameName}</bl> which may cause ban. Contact the developer and report this issue. \nGitHub: <la>https://github.com/FreddyWhest</la> \nTelegram: <la>@roddyfred</la>`
      );
      process.exit(1);
    }

    // Concurrently check each asset URL
    const assetPromises = assetsConfig.assetsUrl.map(async (asset) => {
      const fullUrl = `${assetsConfig.mainUrl}${asset}`;
      try {
        const response = await axios.get(fullUrl);
        const contentType = response.headers["content-type"];

        if (response.status !== 200 || !contentType.includes("javascript")) {
          throw new Error(
            `Asset content type mismatch or status issue at ${fullUrl}`
          );
        }
      } catch (error) {
        logger.error(
          `<ye>[${bot_name}]</ye> | ${session_name} | Bot stopped | Detected some changes with <bl>${gameName}</bl> which may cause ban. Contact the developer and report this issue. \nGitHub: <la>https://github.com/FreddyWhest</la> \nTelegram: <la>@roddyfred</la>`
        );
        process.exit(1);
      }
    });

    // Wait for all assets to be checked
    await Promise.all(assetPromises);

    logger.success(
      `<ye>[${bot_name}]</ye> | ${session_name} | No Changes ✅. The Bot will now continue safely.`
    );

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;

    return totalTime;
  } catch (error) {
    console.log(error);

    logger.error(
      `<ye>[${bot_name}]</ye> | ${session_name} | Bot stopped | Detected some changes with <bl>${gameName}</bl> which may cause ban. Contact the developer and report this issue. \nGitHub: <la>https://github.com/FreddyWhest</la> \nTelegram: <la>@roddyfred</la>`
    );
    process.exit(1);
  }
}

async function checkGameAssets(bot_name, session_name) {
  try {
    const startTime = Date.now();
    logger.info(
      `<ye>[${bot_name}]</ye> | ${session_name} | Checking for changes from <bl>${gameName}</bl> game...`
    );

    // Check main URL
    const mainUrlResponse = await axios.get(assetsConfig.mainUrl);
    if (mainUrlResponse.status !== 200) {
      logger.error(
        `<ye>[${bot_name}]</ye> | ${session_name} | Bot stopped | Detected some changes with <bl>${gameName}</bl> game which may cause ban. Contact the developer and report this issue. \nGitHub: <la>https://github.com/FreddyWhest</la> \nTelegram: <la>@roddyfred</la>`
      );
      process.exit(1);
    }

    // Concurrently check each asset URL
    const assetPromises = assetsConfig.gameAssetsUrl.map(async (asset) => {
      const fullUrl = `${assetsConfig.mainUrl}${asset}`;
      try {
        const response = await axios.get(fullUrl);
        const contentType = response.headers["content-type"];

        if (response.status !== 200 || !contentType.includes("javascript")) {
          throw new Error(
            `Asset content type mismatch or status issue at ${fullUrl}`
          );
        }
      } catch (error) {
        logger.error(
          `<ye>[${bot_name}]</ye> | ${session_name} | Bot stopped | Detected some changes with <bl>${gameName}</bl> which may cause ban. Contact the developer and report this issue. \nGitHub: <la>https://github.com/FreddyWhest</la> \nTelegram: <la>@roddyfred</la>`
        );
        process.exit(1);
      }
    });

    // Wait for all assets to be checked
    await Promise.all(assetPromises);

    logger.success(
      `<ye>[${bot_name}]</ye> | ${session_name} | No Changes ✅. The Bot will now continue safely.`
    );

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;

    return totalTime;
  } catch (error) {
    console.log(error);

    logger.error(
      `<ye>[${bot_name}]</ye> | ${session_name} | Bot stopped | Detected some changes with <bl>${gameName}</bl> which may cause ban. Contact the developer and report this issue. \nGitHub: <la>https://github.com/FreddyWhest</la> \nTelegram: <la>@roddyfred</la>`
    );
    process.exit(1);
  }
}

module.exports = {
  checkUrls,
  checkGameAssets,
};
