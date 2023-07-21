const express = require('express');
const { getAuthorizationUrl, authCallbackMiddleware, authRefreshMiddleware, getUserProfile, get2LO } = require('../services/forge/auth.js');
const { FORGE_CALLBACK_URL } = require('../config.js');

let router = express.Router();

const bodyParser = require('body-parser')
const urlencodedParser = bodyParser.urlencoded({ extended: false })

router.get('/credentials', async function (req, res) {
  let isValid = false;
  try {
    await get2LO(req);
    isValid = true;
  } catch { }

  res.json({
    callbackUrl: FORGE_CALLBACK_URL,
    hasCredentials: !!(req.session.clientId && req.session.clientSecret),
    isValid: isValid 
  })
});

router.post('/credentials', urlencodedParser, function (req, res) {
  req.session.clientId = req.body.clientId;
  req.session.clientSecret = req.body.clientSecret;
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
