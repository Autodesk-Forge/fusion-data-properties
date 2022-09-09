const express = require('express');
const { authRefreshMiddleware } = require('../services/forge/auth.js');
const fusionData = require('../services/forge/fusiondata.js');

let router = express.Router();

router.use(authRefreshMiddleware);

router.get('/:version_id/occurrences', async function (req, res, next) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const occurrences = await fd.getModelOccurrences(req.params.version_id);
    res.json(occurrences);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.get('/:extendable_id/properties', async function (req, res, next) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const occurrences = await fd.getPropertiesForExtandable(req.params.extendable_id);
    res.json(occurrences);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.get('/:project_id/:version_id/properties', async function (req, res, next) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const properties = await fd.getProperties(req.params.project_id, req.params.version_id);
    res.json(properties);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.get('/:project_id/:version_id/thumbnail', async function (req, res, next) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const thumbnail = await fd.getThumbnail(req.params.project_id, req.params.version_id);
      
    res.end(thumbnail);
  } catch (err) {
    res.redirect('/box-200x200.png');
  }
});

router.post('/:version_id/propertygroups', async function (req, res, next) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const propertyGroup = await fd.createPropertyGroup(req.params.version_id, req.body.propertyGroupName);
      
    res.json(propertyGroup);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.post('/:propertygroup_id/properties', async function (req, res, next) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const property = await fd.createProperty(req.params.propertygroup_id, req.body);
      
    res.json(property);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.put('/:propertygroup_id/properties/:property_name', async function (req, res, next) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const property = await fd.updateProperty(req.params.propertygroup_id, 
      { 
        name: req.params.property_name,
        value: req.body.value,
        type: req.body.type
      }
    );
      
    res.json(property);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.delete('/:propertygroup_id/properties/:property_name', async function (req, res, next) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const property = await fd.deleteProperty(req.params.propertygroup_id, { name: req.params.property_name });
      
    res.json(property);
  } catch (err) {
    res.status(400).json(err);
  }
});

module.exports = router;
