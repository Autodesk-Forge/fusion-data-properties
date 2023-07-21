const express = require('express');
const { authRefreshMiddleware, get2LO } = require('../services/forge/auth.js');
const fusionData = require('../services/forge/fusiondata.js');

let router = express.Router();

router.use(authRefreshMiddleware);

// Collection functions

router.get('/collections', async function (req, res, next) {
  try {
    let token = await get2LO(req);
    let fd = new fusionData(token);
    const response = await fd.getCollections();
    res.json(response);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.post('/collections', async function (req, res, next) {
  try {
    let fd = new fusionData(await get2LO(req));
    const response = await fd.createCollection(req.body.collectionName, true);
    res.json(response);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.get('/:hub_id/collections', async function (req, res, next) {
  try {
    let hubId = req.params.hub_id;
    let token = req.internalOAuthToken.access_token;
    let fd = new fusionData(token);
    const isMinimal = req.query.minimal;
    const response = await fd.getCollectionsByHubId(hubId, isMinimal);
    res.json(response);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.post('/:hub_id/collections', async function (req, res, next) {
  try {
    let hubId = req.params.hub_id;
    let token = req.internalOAuthToken.access_token;
    let fd = new fusionData(token);
    const response = await fd.linkCollectionToHub(hubId, req.body.collectionId);
    res.json(response);
  } catch (err) {
    res.status(400).json(err);
  }
});

// Definition functions

router.get('/collections/:collection_id/definitions', async function (req, res, next) {
  try {
    let fd = new fusionData(await get2LO(req));// req.internalOAuthToken.access_token);
    const response = await fd.getDefinitions(req.params.collection_id);
    res.json(response);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.post('/collections/:collection_id/definitions', async function (req, res) {
  try {
    let fd = new fusionData(await get2LO(req));//req.internalOAuthToken.access_token);
    const response = await fd.createDefinition(
      req.params.collection_id, req.body.definitionName, req.body.definitionType,
      req.body.definitionDescription, req.body.isHidden, req.body.propertyBehavior 
    );
    res.json(response);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.get('/definitions/:definition_id', async function (req, res) {
  try {
    let fd = new fusionData(await get2LO(req));//req.internalOAuthToken.access_token);
    const response = await fd.getDefinition(req.params.definition_id);
    res.json(response);
  } catch (err) {
    res.status(400).json(err);
  }
});


router.put('/definitions/:definition_id', async function (req, res) {
  try {
    let fd = new fusionData(await get2LO(req));//req.internalOAuthToken.access_token);
    const response = await fd.updateDefinition(req.params.definition_id, req.body.definitionDescription, req.body.isHidden);
    res.json(response);
  } catch (err) {
    res.status(400).json(err);
  }
});

// ComponentVersion / DrawingVersion functions

router.get('/component/:version_id/generalproperties', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const props = await fd.getGeneralProperties(req.params.version_id);
      
    res.json(props);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.get('/component/:version_id/thumbnailUrl', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const thumbnailUrl = await fd.getComponentVersionThumbnailUrl(req.params.version_id);
      
    res.json(thumbnailUrl);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.get('/drawing/:version_id/thumbnailUrl', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const thumbnailUrl = await fd.getDrawingVersionThumbnailUrl(req.params.version_id);
      
    res.json(thumbnailUrl);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.get('/:version_id/occurrences', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const occurrences = await fd.getModelOccurrences(req.params.version_id);
    res.json(occurrences);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.get('/:version_id/alloccurrences', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const occurrences = await fd.getAllModelOccurrences(req.params.version_id);
    res.json(occurrences);
  } catch (err) {
    res.status(400).json(err);
  }
});

// Extendable functions related to properties 

router.get('/:extendable_id/properties', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const occurrences = await fd.getPropertiesForExtendable(req.params.extendable_id);
    res.json(occurrences);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.put('/:extendable_id/properties', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const properties = await fd.setProperties(req.params.extendable_id, req.body.properties);
      
    res.json(properties);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.put('/:extendable_id/properties/:definition_id', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const property = await fd.setProperty(req.params.extendable_id, req.body.value);
      
    res.json(property);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.delete('/:extendable_id/properties/:definition_id', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const property = await fd.deleteProperty(req.params.extendable_id, req.params.definition_id);
      
    res.json(property);
  } catch (err) {
    res.status(400).json(err);
  }
});

// CoponentVersion / DrawingVersion id based on file version urn

router.get('/:project_id/:file_version_id/versionid', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const idAndType = await fd.getVersionId(req.params.project_id, req.params.file_version_id);
      
    res.json(idAndType);
  } catch (err) {
    res.status(400).json(err);
  }
});

// Component / Drawing id based on file item urn

router.get('/:project_id/:file_item_id/itemid', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const id = await fd.getItemId(req.params.project_id, req.params.file_item_id);
      
    res.json(id);
  } catch (err) {
    res.status(400).json(err);
  }
});

// Helper - fetch thumbnail from derivativ by providing access token in header

router.get('/thumbnail/:url', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const thumbnail = await fd.getThumbnailForUrl(req.params.url);
      
    res.end(thumbnail);
  } catch (err) {
    res.status(400).json(err);
  }
});

// Thumbnail for non-Fusion files

router.get('/:project_id/:file_version_id/thumbnailUrl', async function (req, res) {
  try {
    let fd = new fusionData(req.internalOAuthToken.access_token);
    const thumbnailUrl = await fd.getThumbnailUrl(req.params.project_id, req.params.file_version_id);
      
    res.json(thumbnailUrl);
  } catch (err) {
    res.redirect('/images/box-200x200.png');
  }
});

module.exports = router;
