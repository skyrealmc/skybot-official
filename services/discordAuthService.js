const axios = require("axios");

const DISCORD_API = "https://discord.com/api/v10";
const OAUTH_SCOPES = ["identify", "guilds"];

function buildLoginUrl(state) {
  const url = new URL(`${DISCORD_API}/oauth2/authorize`);
  url.searchParams.set("client_id", process.env.CLIENT_ID);
  url.searchParams.set("redirect_uri", process.env.REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", OAUTH_SCOPES.join(" "));
  url.searchParams.set("prompt", "consent");
  if (state) {
    url.searchParams.set("state", state);
  }
  return url.toString();
}

async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.REDIRECT_URI
  });

  const response = await axios.post(`${DISCORD_API}/oauth2/token`, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  return response.data;
}

async function fetchDiscordUser(accessToken) {
  const response = await axios.get(`${DISCORD_API}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response.data;
}

async function fetchDiscordGuilds(accessToken) {
  const response = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response.data;
}

module.exports = {
  buildLoginUrl,
  exchangeCodeForToken,
  fetchDiscordUser,
  fetchDiscordGuilds
};
