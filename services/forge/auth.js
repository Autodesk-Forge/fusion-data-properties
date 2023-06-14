const { AuthClientThreeLegged, UserProfileApi, ApiClient, AuthClientTwoLegged } = require('forge-apis');
const { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_CALLBACK_URL, INTERNAL_TOKEN_SCOPES, PUBLIC_TOKEN_SCOPES, BASE_URL } = require('../../config.js');

const internalAuthClient = new AuthClientThreeLegged(FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_CALLBACK_URL, INTERNAL_TOKEN_SCOPES);
const publicAuthClient = new AuthClientThreeLegged(FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_CALLBACK_URL, PUBLIC_TOKEN_SCOPES);
const internal2LOClient = new AuthClientTwoLegged(FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, INTERNAL_TOKEN_SCOPES)

internal2LOClient.basePath = internalAuthClient.basePath = publicAuthClient.basePath = BASE_URL;

async function get2LO() {
  let str = await internal2LOClient.authenticate();
  return str.access_token;
}

function getAuthorizationUrl() {
    let str = internalAuthClient.generateAuthUrl();
    return str;
}

async function authCallbackMiddleware(req, res, next) {
    const internalCredentials = await internalAuthClient.getToken(req.query.code);
    const publicCredentials = await publicAuthClient.refreshToken(internalCredentials);
    req.session.public_token = publicCredentials.access_token;
    req.session.internal_token = internalCredentials.access_token;
    req.session.refresh_token = publicCredentials.refresh_token;
    req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
    next();
}

async function authRefreshMiddleware(req, res, next) {
    const { refresh_token, expires_at } = req.session;
    if (!refresh_token) {
        res.status(401).end();
        return;
    }

    if (expires_at < Date.now()) {
        try { 
          const internalCredentials = await internalAuthClient.refreshToken({ refresh_token });
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

async function getUserProfile(token) {
  const api = new UserProfileApi();
  api.apiClient.basePath = BASE_URL;
    const resp = await api.getUserProfile(internalAuthClient, token);
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
