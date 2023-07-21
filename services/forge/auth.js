const { AuthClientThreeLegged, UserProfileApi, ApiClient, AuthClientTwoLegged } = require('forge-apis');
const { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_CALLBACK_URL, INTERNAL_TOKEN_SCOPES, PUBLIC_TOKEN_SCOPES, BASE_URL } = require('../../config.js');

function internalAuthClient(req) {
  const client = new AuthClientThreeLegged(req.session.clientId, req.session.clientSecret, FORGE_CALLBACK_URL, INTERNAL_TOKEN_SCOPES);
  client.basePath = BASE_URL;
  return client;
}

function publicAuthClient(req) {
  const client = new AuthClientThreeLegged(req.session.clientId, req.session.clientSecret, FORGE_CALLBACK_URL, PUBLIC_TOKEN_SCOPES);
  client.basePath = BASE_URL;
  return client;
}

function internal2LOClient(req) {
  const client = new AuthClientTwoLegged(req.session.clientId, req.session.clientSecret, INTERNAL_TOKEN_SCOPES);
  client.basePath = BASE_URL;
  return client;
}

async function get2LO(req) {
  let str = await internal2LOClient(req).authenticate();
  return str.access_token;
}

function getAuthorizationUrl(req) {
    let str = internalAuthClient(req).generateAuthUrl();
    return str;
}

async function authCallbackMiddleware(req, res, next) {
    const internalCredentials = await internalAuthClient(req).getToken(req.query.code);
    const publicCredentials = await publicAuthClient(req).refreshToken(internalCredentials);
    req.session.public_token = publicCredentials.access_token;
    req.session.internal_token = internalCredentials.access_token;
    req.session.refresh_token = publicCredentials.refresh_token;
    req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
    next();
}

async function authRefreshMiddleware(req, res, next) {
    const { refresh_token, expires_at, clientId, clientSecret } = req.session;

    if (!clientId || !clientSecret) {
      res.status(401).end();
      return;
    }

    if (req.url.startsWith("/collections") || req.url.startsWith("/definitions")) {
      // these only require 2-legged authentication
      next();
      return;
    }

    // The rest is about checking for 3-legged token and refresh token

    if (!refresh_token) {
      res.status(401).end();
      return;
    }

    if (expires_at < Date.now()) {
        try { 
          const internalCredentials = await internalAuthClient(req).refreshToken({ refresh_token });
          const publicCredentials = await publicAuthClient.refreshToken(internalCredentials);
          req.session.public_token = publicCredentials.access_token;
          req.session.internal_token = internalCredentials.access_token;
          req.session.refresh_token = publicCredentials.refresh_token;
          req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
        } catch {
          req.session.refresh_token = null;
          res.status(401).end();
          return;
        }
    }
    req.internalOAuthToken = {
        access_token: req.session.internal_token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000)
    };
    req.publicOAuthToken = {
        access_token: req.session.public_token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000)
    };
    next();
}

async function getUserProfile(req, token) {
  const api = new UserProfileApi();
  api.apiClient.basePath = BASE_URL;
  const resp = await api.getUserProfile(internalAuthClient(req), token);
  return resp.body;
}

module.exports = {
    get2LO,
    internalAuthClient,
    getAuthorizationUrl,
    authCallbackMiddleware,
    authRefreshMiddleware,
    getUserProfile
};
