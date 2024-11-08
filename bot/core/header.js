const app = require("../config/app");

const headers = {
  "content-type": "application/json",
  accept: "application/json, text/plain, */*",
  "sec-fetch-site": "cross-site",
  "accept-encoding": "gzip, deflate, br, zstd",
  "accept-language": "en-US,en;q=0.9",
  "sec-fetch-mode": "cors",
  origin: app.origin,
  "user-agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  "sec-fetch-dest": "empty",
  "x-requested-with": "org.telegram.messenger.web",
  priority: "u=1, i",
  lang: "en",
  pragma: "no-cache",
  "Sec-Ch-Ua-Platform-Version": '"13.0.0"',
  "Sec-Ch-Ua-Full-Version": '"130.0.6723.58"',
  "Sec-Ch-Ua-Mobile": "?1",
  "Sec-Ch-Ua-Arch": '""',
  "Sec-Ch-Ua-Platform": '"Android"',
  "Sec-Ch-Ua-Full-Version-List":
    '"Chromium";v="130.0.6723.58", "Android WebView";v="130.0.6723.58", "Not?A_Brand";v="99.0.0.0"',
  "Sec-Ch-Ua-Mobile": "?1",
  "Sec-Ch-Ua": `"Android WebView";v="129", "Not=A?Brand";v="8", "Chromium";v="129"`,
};

module.exports = headers;
