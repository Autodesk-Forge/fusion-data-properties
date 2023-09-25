// Axios is a promise-based HTTP client for the browser and node.js. 
const axios = require("axios");
const { GRAPHQL_URL } = require('../../config.js');

// Application constructor 
class App {
  constructor(accessToken) {
    this.graphAPI = GRAPHQL_URL;
    this.accessToken = accessToken;
    console.log(accessToken);
  }

  getRequestHeaders() {
    return {
      "Content-type": "application/json",
      "Authorization": "Bearer " + this.accessToken,
    };
  }

  async sendQuery(query, variables) {
    let response = await axios({
      method: 'POST',
      url: `${this.graphAPI}`,
      headers: this.getRequestHeaders(),
      data: { 
        query,
        variables
      }
    })

    if (response.data.errors && !query.includes('GetPropertyDefinitionCollectionsByHubId')) {
      let formatted = JSON.stringify(response.data.errors, null, 2);
      console.log(`API error:\n${formatted}`);

      throw this.getErrorMessage(response.data.errors);
    }

    return response;
  }

  getErrorMessage(errors) {
    const error = errors[0]
    let message = error.message.split("message=")[1]

    if (message)
      return message; 

    message = error.message;

    return message;
  }

  async getComponentVersionThumbnailUrl(componentVersionId) {  
    let response = await this.sendQuery(
      `query GetThumbnail($componentVersionId: ID!) {
        mfg {
          componentVersion(componentVersionId: $componentVersionId) {
            id
            thumbnail {
              status
              largeImageUrl
            }
          }
        }
      }`,
      {
        componentVersionId
      }
    )

    let thumbnail = response.data.data.mfg.componentVersion.thumbnail;

    return thumbnail;
  }

  async getDrawingVersionThumbnailUrl(drawingVersionId) {  
    let response = await this.sendQuery(
      `query GetThumbnail($drawingVersionId: ID!) {
        mfg {
          drawingVersion(drawingVersionId: $drawingVersionId) {
            id
            thumbnail {
              status
              largeImageUrl
            }
          }
        }
      }`,
      {
        drawingVersionId
      }
    )

    let thumbnail = response.data.data.mfg.drawingVersion.thumbnail;

    return thumbnail;
  }

  async getThumbnailForUrl(thumbnailUrl) {  
    let resp = await axios({
      method: 'GET',
      url: thumbnailUrl,
      headers: this.getRequestHeaders(),
      responseType: 'arraybuffer',
      responseEncoding: 'binary'
    })

    return resp.data;
  }

  async getThumbnail(projectId, fileVersionId) {  
    let response = await this.sendQuery(
      `query GetThumbnail($projectId: ID!, $fileVersionId: ID!) {
        nav {
          itemVersion(projectId: $projectId, versionId: $fileVersionId) {
            ... on MFGDesignItemVersion {
              rootComponentVersion {
                id
                thumbnail {
                  status
                  largeImageUrl
                }
              }
            }
            ... on MFGDrawingItemVersion {
              drawingVersion {
                id
                thumbnail {
                  status
                  largeImageUrl
                }
              }
            }
          }
        }
      }`,
      {
        projectId,
        fileVersionId
      }
    )

    let itemVersion = response.data.data.nav.itemVersion;
    let thumbnail = itemVersion.rootComponentVersion ? itemVersion.rootComponentVersion.thumbnail : itemVersion.drawingVersion.thumbnail;
    let id = itemVersion.rootComponentVersion ? itemVersion.rootComponentVersion.id : itemVersion.drawingVersion.id;

    let resp = await axios({
      method: 'GET',
      url: thumbnail.largeImageUrl,
      headers: this.getRequestHeaders(),
      responseType: 'arraybuffer',
      responseEncoding: 'binary'
    })

    return resp.data;
  }

  async getVersionId(projectId, fileVersionId) {  
    let response = await this.sendQuery(
      `query GetVersionId($projectId: ID!, $fileVersionId: ID!) {
        nav {
          itemVersion(projectId: $projectId, versionId: $fileVersionId) {
            ... on MFGDesignItemVersion {
              rootComponentVersion {
                id
                lastModifiedOn
                component {
                  id
                  tipVersion {
                    id
                  }
                }
              }
            }
            ... on MFGDrawingItemVersion {
              drawingVersion {
                id
                lastModifiedOn
                drawing {
                  id
                  tipVersion {
                    id
                  }
                }
              }
            }
          }
        }
      }`,
      {
        projectId,
        fileVersionId
      }
    )

    const itemVersion = response.data.data.nav.itemVersion;
    const versionId = itemVersion.rootComponentVersion ? itemVersion.rootComponentVersion.id : itemVersion.drawingVersion.id;
    const tipVersionId = itemVersion.rootComponentVersion ? itemVersion.rootComponentVersion.component.tipVersion.id : itemVersion.drawingVersion.drawing.tipVersion.id;
    const itemId = itemVersion.rootComponentVersion ? itemVersion.rootComponentVersion.component.id : itemVersion.drawingVersion.drawing.id;
    const lastModifiedOn = itemVersion.rootComponentVersion ? itemVersion.rootComponentVersion.lastModifiedOn : itemVersion.drawingVersion.lastModifiedOn;
    const type = itemVersion.rootComponentVersion ? 'component' : 'drawing';

    return { itemId, versionId, tipVersionId, lastModifiedOn, type };
  }

  async getItemId(projectId, fileItemId) {  
    let response = await this.sendQuery(
      `query GetItemId($projectId: ID!, $fileItemId: ID!) {
        nav {
          item(projectId: $projectId, itemId: $fileItemId) {
            ... on MFGDesignItem {
              rootComponent {
                id
              }
            }
            ... on MFGDrawingItem {
              drawing {
                id
              }
            }
          }
        }
      }`,
      {
        projectId,
        fileItemId
      }
    )

    const item = response.data.data.nav.item;
    const id = item.rootComponent ? item.rootComponent.id : item.drawing.id;
    const type = item.rootComponent ? 'component' : 'drawing';

    return { id, type };
  }

  async getCollections() { 
    let res = [];
    let cursor = null;
    do {
      let response = await this.sendQuery(
        `query GetPropertyDefinitionCollections {
          mfg {
            propertyDefinitionCollections ${cursor ? `(pagination : { cursor: "${cursor}" })` : "" } {
              pagination {
                cursor
                pageSize
              }
              results {
                id
                name
                description
              }
            }
          }
        }`,
        {
        }
      )
      cursor = response?.data?.data?.mfg?.propertyDefinitionCollections?.pagination?.cursor;
      console.log({cursor});
      cursor = null;

      res = res.concat(response.data.data.mfg.propertyDefinitionCollections.results);
    } while (cursor)

    return res;
  }

  async getCollectionsByHubId(hubId, isMinimal) { 
    let res = [];
    let cursor = null;
    do {
      let response = await this.sendQuery(
        `query GetPropertyDefinitionCollectionsByHubId ($hubId: ID!) {
          mfg {
            propertyDefinitionCollectionsByHubId (hubId: $hubId${cursor ? `, pagination : { cursor: "${cursor}" }` : `${isMinimal ? ', pagination : { limit: 1 }' : ''}` }) {
              pagination {
                cursor
                pageSize
              }
              results {
                id
                name
                description
                propertyDefinitions {
                  results {
                    id
                    name
                    propertyBehavior
                    isArchived
                    readOnly
                    type
                    units {
                      name
                    }
                  }
                }
              }
            }
          }
        }`,
        {
          hubId
        }
      )
      cursor = response?.data?.data?.mfg?.propertyDefinitionCollectionsByHubId?.pagination?.cursor;
      console.log({cursor});
      cursor = null;

      res = res.concat(response.data.data.mfg.propertyDefinitionCollectionsByHubId.results);
    } while (cursor)

    return res;
  }

  async linkCollectionToHub(hubId, collectionId) { 
    let response = await this.sendQuery(
      `mutation LinkPropertyDefinitionCollectionToHub ($propertyDefinitionCollectionId: ID!, $targetHubId: ID!) {
        mfg {
          linkPropertyDefinitionCollection (input: { propertyDefinitionCollectionId: $propertyDefinitionCollectionId, targetHubId: $targetHubId }) {
            hub {
              id
              name
            }
          }
        }
      }`,
      {
        targetHubId: hubId,
        propertyDefinitionCollectionId: collectionId
      }
    )
      
    return response.data.data.mfg.linkPropertyDefinitionCollection.hub.id;  
  }

  async createCollection(name, collectionDescription) { 
      let response = await this.sendQuery(
        `mutation CreatePropertyDefinitionCollection($name: String!, $description: String!) {
          mfg {
            createPropertyDefinitionCollection(
              input: {name: $name, description: $description}
            ) {
              propertyDefinitionCollection {
                id
                name
                description
              }
            }
          }
        }`,
        {
          name: name,
          description: collectionDescription
        }
      );
      

    return response.data.data.mfg.createPropertyDefinitionCollection.propertyDefinitionCollection;
  }

  async updateCollection(collectionId, collectionDescription) { 
    let response = await this.sendQuery(
      `mutation UpdatePropertyDefinitionCollection($propertyDefinitionCollectionId: ID!, $description: String!) {
        mfg {
          updatePropertyDefinitionCollection(
            input: {propertyDefinitionCollectionId: $propertyDefinitionCollectionId, description: $description}
          ) {
            propertyDefinitionCollection {
              id
              name
              description
            }
          }
        }
      }`,
      {
        propertyDefinitionCollectionId: collectionId,
        description: collectionDescription
      }
    );

    return response.data.data.mfg.updatePropertyDefinitionCollection.propertyDefinitionCollection;
  }

  async getDefinitions(collectionId) { 
    let res = [];
    let cursor = null;
    do {
      let response = await this.sendQuery(
        `query GetPropertyDefinitions($propertyDefinitionCollectionId: ID!) {
          mfg {
            propertyDefinitions(
              propertyDefinitionCollectionId: $propertyDefinitionCollectionId
            ) {
              pagination {
                cursor
                pageSize
              }
              results {
                id
                name
                type
                units {
                  id
                  name
                }
                isArchived
                isHidden
                shouldCopy
                readOnly
                description
                propertyBehavior
              }
            }
          }
        }`,
        {
          propertyDefinitionCollectionId: collectionId
        }
      )
      cursor = response?.data?.data?.mfg?.propertyDefinitions?.pagination?.cursor;
      console.log({cursor});
      cursor = null;

      res = res.concat(response.data.data.mfg.propertyDefinitions.results);
    } while (cursor)

    return res;
  }


  async createDefinition(collectionId, name, type, description, isHidden, shouldCopy, readOnly, propertyBehavior) { 

    let response = await this.sendQuery(
      `mutation CreatePropertyDefinition($propertyDefinitionCollectionId: ID!, $propertyDefinitionName: String!, $propertyType: PropertyTypes!, $description: String!, $isHidden: Boolean!, $shouldCopy: Boolean!, $readOnly: Boolean!, $propertyBehavior: PropertyBehavior!) {
        mfg {
          createPropertyDefinition(
            input: {propertyDefinitionCollectionId: $propertyDefinitionCollectionId, name: $propertyDefinitionName, type: $propertyType, description: $description, isHidden: $isHidden, shouldCopy: $shouldCopy, readOnly: $readOnly, propertyBehavior: $propertyBehavior}
          ) {
            propertyDefinition {
              id
              name
              type
              units {
                id
                name
              }
              isArchived
              isHidden
              shouldCopy
              readOnly
              description
              propertyBehavior
            }
          }
        }
      }`,
      {
        propertyDefinitionCollectionId: collectionId,
        propertyDefinitionName: name,
        propertyType: type,
        description: description,
        isHidden: isHidden,
        readOnly: readOnly,
        shouldCopy: shouldCopy,
        propertyBehavior: propertyBehavior
      }
    );
    
    return response.data.data.mfg.createPropertyDefinition.propertyDefinition;
  }

  async getDefinition(definitionId) { 

    let response = await this.sendQuery(
      `query GetPropertyDefinition($propertyDefinitionId: ID!) {
        mfg {
          propertyDefinition(propertyDefinitionId: $propertyDefinitionId) {
            id
            name
            type
            units {
              id
              name
            }
            isArchived
            isHidden
            shouldCopy
            readOnly
            description
            propertyBehavior
          }
        }
      }`,
      {
        propertyDefinitionId: definitionId
      }
    );
    
    return response.data.data.mfg.propertyDefinition;
  }

  async updateDefinition(definitionId, description, isHidden) { 

    let response = await this.sendQuery(
      `mutation UpdatePropertyDefinition($propertyDefinitionId: ID!, $description: String!, $isHidden: Boolean!) {
        mfg {
          updatePropertyDefinition(
            input: {propertyDefinitionId: $propertyDefinitionId, description: $description, isHidden: $isHidden}
          ) {
            propertyDefinition {
              id
              name
              type
              units {
                id
                name
              }
              isArchived
              isHidden
              shouldCopy
              readOnly
              description
              propertyBehavior
            }
          }
        }
      }`,
      {
        propertyDefinitionId: definitionId,
        description: description,
        isHidden: isHidden
      }
    );
    
    return response.data.data.mfg.updatePropertyDefinition.propertyDefinition;
  }

  async archiveDefinition(definitionId) { 

    let response = await this.sendQuery(
      `mutation UpdatePropertyDefinition($propertyDefinitionId: ID!) {
        mfg {
          archivePropertyDefinition(
            input: {propertyDefinitionId: $propertyDefinitionId}
          ) {
            propertyDefinition {
              id
              name
              type
              units {
                id
                name
              }
              isArchived
              isHidden
              shouldCopy
              readOnly
              description
              propertyBehavior
            }
          }
        }
      }`,
      {
        propertyDefinitionId: definitionId
      }
    );
    
    return response.data.data.mfg.archivePropertyDefinition.propertyDefinition;
  }

  async getGeneralPropertiesForComponentVersion(versionId) {  
    let response = await this.sendQuery(
      `query GetProperties($componentVersionId: ID!) {
        mfg {
          componentVersion(componentVersionId: $componentVersionId) {
            lastModifiedOn

            partNumber
            name
            partDescription
            materialName

            manage {
              itemNumber
              lifeCycle
              revision
              changeOrder
              changeOrderURN
            }

            physicalProperties {
              mass {
                value
                propertyDefinition {
                  units {
                    name
                  }
                }
              }
              volume {
                value
                propertyDefinition {
                  units {
                    name
                  }
                }
              }
              density {
                value
                propertyDefinition {
                  units {
                    name
                  }
                }
              }
              area {
                value
                propertyDefinition {
                  units {
                    name
                  }
                }
              }
              boundingBox {
                length {
                  value
                  propertyDefinition {
                    units {
                      name
                    }
                  }
                }
                width {
                  value
                  propertyDefinition {
                    units {
                      name
                    }
                  }
                }
                height {
                  value
                  propertyDefinition {
                    units {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      {
        componentVersionId: versionId
      }
    )

    return response.data.data.mfg.componentVersion;
  }

  async getGeneralPropertiesForDrawingVersion(versionId) {  
    let response = await this.sendQuery(
      `query GetProperties($drawingVersionId: ID!) {
        mfg {
          drawingVersion(drawingVersionId: $drawingVersionId) {
            lastModifiedOn

            partNumber
            name
            partDescription

            manage {
              itemNumber
              lifeCycle
              revision
              changeOrder
              changeOrderURN
            }
          }
        }
      }`,
      {
        drawingVersionId: versionId
      }
    )

    return response.data.data.mfg.drawingVersion;
  }

  async getPropertiesForComponentVersion(componentVersionId) {  
    let response = await this.sendQuery(
      `query GetAllProperties($componentVersionId: ID!) {
        mfg {
          componentVersion(componentVersionId: $componentVersionId) {
            customProperties {
              results {
                value
                propertyDefinition {
                  id
                  name
                  type
                  isHidden
                  shouldCopy
                  description
                  propertyBehavior
                  units {
                    name
                  }
                }
              }
            }
          }
        }
      }`,
      {
        componentVersionId
      }
    )

    return response.data.data.mfg.componentVersion.customProperties.results;
  }

  async getPropertiesForDrawingVersion(drawingVersionId) {  
    let response = await this.sendQuery(
      `query GetAllProperties($drawingVersionId: ID!) {
        mfg {
          drawingVersion(drawingVersionId: $drawingVersionId) {
            customProperties {
              results {
                value
                propertyDefinition {
                  id
                  name
                  type
                  isHidden
                  shouldCopy
                  description
                  propertyBehavior
                  units {
                    name
                  }
                }
              }
            }
          }
        }
      }`,
      {
        drawingVersionId
      }
    )

    return response.data.data.mfg.drawingVersion.customProperties.results;
  }

  async setProperties(extendableId, properties) {  
    let response = await this.sendQuery(
      `mutation SetProperties($input: SetPropertiesInput!) {
        mfg {
          setProperties(input: $input) {
            extendableId
          }
        }
      }`,
      {
        input: {
          extendableId,
          propertyInputs: properties
        }
      }
    )

    return response.data.data.mfg.setProperties;
  }

  async deleteProperty(extendableId, propertyDefinitionId) {  
    let response = await this.sendQuery(
      `mutation DeleteProperty($extendableId: ID!, $propertyDefinitionId: ID!) {
        mfg {
          clearProperty(input: {extendableId: $extendableId, propertyDefinitionId: $propertyDefinitionId}) {
            extendableId
          }
        }
      }`,
      {
        extendableId,
        propertyDefinitionId
      }
    )

    return response.data.data.mfg.deleteProperty;
  }

  async getModelOccurrences(componentVersionId) {
    let cursor = null;
    let result = []; 
    while (true) {
      let response = await this.sendQuery(
        `query GetModelOccurrences($componentVersionId: ID!${cursor ? ', $cursor: String!' : ''}) {
          mfg {
            componentVersion(componentVersionId: $componentVersionId) {
              modelOccurrences${cursor ? '(pagination: {cursor: $cursor})' : ''} {
                results {
                  componentVersion {
                    id
                    name
                    lastModifiedOn
                    component {
                      id
                      tipVersion {
                        id
                      }
                    }
                  }
                }
                pagination {
                  cursor
                }
              }
            }
          }
        }`,
        {
          componentVersionId,
          cursor
        }
      )

      result = result.concat(response.data.data.mfg.componentVersion.modelOccurrences.results);

      cursor = response.data.data.mfg.componentVersion.modelOccurrences.pagination.cursor;
      if (!cursor)
        break;
    }

    return result;
  }

  async getAllModelOccurrences(componentVersionId) {
    let cursor = null;
    let result = []; 
    while (true) {
      let response = await this.sendQuery(
        `query GetAllModelOccurrences($componentVersionId: ID!${cursor ? ', $cursor: String!' : ''}) {
          mfg {
            componentVersion(componentVersionId: $componentVersionId) {
              allModelOccurrences${cursor ? '(pagination: {cursor: $cursor})' : ''} {
                results {
                  parentComponentVersion {
                    id 
                  }
                  componentVersion {
                    id
                    name
                    partNumber
                    materialName
                    component {
                      id
                    }
                  }
                }
                pagination {
                  cursor
                }
              }
            }
          }
        }`,
        {
          componentVersionId,
          cursor
        }
      )

      result = result.concat(response.data.data.mfg.componentVersion.allModelOccurrences.results);

      cursor = response.data.data.mfg.componentVersion.allModelOccurrences.pagination.cursor;
      if (!cursor)
        break;
    }

    return result;
  }
}

module.exports = App;
