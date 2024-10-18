const logger = require("./bot/utils/logger");
const luncher = require("./bot/utils/luncher");
const axios = require("axios");
const { version, name } = require("./package.json");
const _ = require("lodash");
const { SysReq } = require("./bot/utils/helper");

const main = async () => {
  const nodeVersion = process.version;
  const major = process.versions
    ? parseInt(nodeVersion.split(".")[0].replace("v", ""), 10)
    : 0;
  if (major < 18 || major > 20 || isNaN(major) || major === 0) {
    return logger.error(
      "To run this bot, Node.js version <la>18.x</la> or <lb>20.x</lb> is required.\n Current version: <bl>" +
        nodeVersion +
        "</bl>"
    );
  }
  await luncher.process();
};

// Wrap main function execution in an async context to handle asynchronous operations
(async () => {
  try {
    const latestVersion = await axios.get(
      "https://raw.githubusercontent.com/Freddywhest/BlumBot/refs/heads/main/package.json"
    );
    if (!_.isEqual(latestVersion.data.version, version)) {
      logger.versionWarning(
        `You are using version <bl>${version}</bl> of the ${name} bot, while the latest version is <lb>${latestVersion.data.version}</lb>. Please update the bot.\n\n`
      );
      process.exit(1);
    }

    const systemRequirements = await SysReq();
    if (!systemRequirements) {
      logger.versionWarning(
        `Your system does not meet the minimum requirements for running the ${name} bot.\n
<u>System Requirements</u>
- Node.js 18+
- Supported Operating Systems:
  - Windows: Windows 10+, Windows Server 2016+, or Windows Subsystem for Linux (WSL).
  - macOS: macOS 13 Ventura or macOS 14 Sonoma.
  - Linux: Debian 11/12, Ubuntu 20.04/22.04/24.04 (x86-64 and arm64).\n
        `
      );
      process.exit(1);
    }
    await main();
  } catch (error) {
    throw error;
  }
})();
