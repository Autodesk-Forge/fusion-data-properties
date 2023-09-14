const express = require('express');
const { getAuthorizationUrl, authCallbackMiddleware, authRefreshMiddleware, getUserProfile, get2LO, registerClientSecret, unregisterClientSecret } = require('../services/forge/auth.js');
const { APS_CALLBACK_URL, APS_URL, ACCOUNTS_URL } = require('../config.js');

let router = express.Router();

const bodyParser = require('body-parser')
const urlencodedParser = bodyParser.urlencoded({ extended: false })

router.get('/credentials', async function (req, res) {
  let hasValidCredentials = false;
  try {
    // Let's use enableAdminRights=true just to test the credentials 
    await get2LO(req, true);
    hasValidCredentials = true;
  } catch { }

  res.json({
    callbackUrl: APS_CALLBACK_URL,
    apsUrl: APS_URL,
    accountsUrl: ACCOUNTS_URL,
    hasValidCredentials: hasValidCredentials,
    providedCredentials: !!req.session.clientId,
    isAppOwner: !!req.session.clientSecret 
  })
});

router.post('/credentials', urlencodedParser, async function (req, res) {
  req.session.clientId = req.body.clientId;
  req.session.clientSecret = req.body.clientSecret;
  if (req.body.clientSecret) {
    try {
      if (req.body.clientId === '-') {
        unregisterClientSecret(req.session.clientSecret);
      } else {
        // Let's use enableAdminRights=true just to test the credentials
        await get2LO(req, true);
        // Only register valid client id/client secret pairs
        registerClientSecret(req.body.clientId, req.body.clientSecret);
      }
    } catch (err) { 
      console.log(err);
    }
  }

  console.log(req.session.clientId + " / " + req.session.clientSecret);
  res.redirect('/');
});

router.get('/login', function (req, res) {
    res.redirect(getAuthorizationUrl(req));
});

router.get('/logout', function (req, res) {
    req.session = null;
    res.redirect('/');
});

router.get('/callback', authCallbackMiddleware, function (req, res) {
    res.redirect('/');
});

router.get('/token', authRefreshMiddleware, function (req, res) {
    res.json(req.publicOAuthToken);
});

router.get('/profile', authRefreshMiddleware, async function (req, res, next) {
    try {
        const profile = await getUserProfile(req, req.internalOAuthToken);
        res.json({ 
          name: `${profile.firstName} ${profile.lastName}`,
          picture: profile.profileImages.sizeX40
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
