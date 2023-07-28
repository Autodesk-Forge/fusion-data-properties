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

    if (response.data.errors) {
      let formatted = JSON.stringify(response.data.errors, null, 2);
      console.log(`API error:\n${formatted}`);

      throw this.getErrorMessage(response.data.errors);
    }

    return response;
  }

  getErrorMessage(errors) {
    const error = errors[0]
    const message = error.message.split("message=")[1]

    return message;
  }

  async getComponentVersionThumbnailUrl(componentVersionId) {  
    let response = await this.sendQuery(
      `query GetThumbnail($componentVersionId: String!) {
        componentVersion(componentVersionId: $componentVersionId) {
          id
          thumbnail {
            status
            largeImageUrl
          }
        }
      }`,
      {
        componentVersionId
      }
    )

    let thumbnail = response.data.data.componentVersion.thumbnail;

    return thumbnail;
  }

  async getDrawingVersionThumbnailUrl(drawingVersionId) {  
    let response = await this.sendQuery(
      `query GetThumbnail($drawingVersionId: String!) {
        drawingVersion(drawingVersionId: $drawingVersionId) {
          id
          thumbnail {
            status
            largeImageUrl
          }
        }
      }`,
      {
        drawingVersionId
      }
    )

    let thumbnail = response.data.data.drawingVersion.thumbnail;

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
      `query GetThumbnail($projectId: String!, $fileVersionId: String!) {
        fileVersion(projectId: $projectId, versionId: $fileVersionId) {
          ... on DesignFileVersion {
            rootComponentVersion {
              id
              thumbnail {
                status
                largeImageUrl
              }
            }
          }
          ... on DrawingFileVersion {
            drawingVersion {
              id
              thumbnail {
                status
                largeImageUrl
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

    let fileVersion = response.data.data.fileVersion;
    let thumbnail = fileVersion.rootComponentVersion ? fileVersion.rootComponentVersion.thumbnail : fileVersion.drawingVersion.thumbnail;
    let id = fileVersion.rootComponentVersion ? fileVersion.rootComponentVersion.id : fileVersion.drawingVersion.id;

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
      `query GetVersionId($projectId: String!, $fileVersionId: String!) {
        fileVersion(projectId: $projectId, versionId: $fileVersionId) {
          ... on DesignFileVersion {
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
          ... on DrawingFileVersion {
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
      }`,
      {
        projectId,
        fileVersionId
      }
    )

    const fileVersion = response.data.data.fileVersion;
    const versionId = fileVersion.rootComponentVersion ? fileVersion.rootComponentVersion.id : fileVersion.drawingVersion.id;
    const tipVersionId = fileVersion.rootComponentVersion ? fileVersion.rootComponentVersion.component.tipVersion.id : fileVersion.drawingVersion.drawing.tipVersion.id;
    const itemId = fileVersion.rootComponentVersion ? fileVersion.rootComponentVersion.component.id : fileVersion.drawingVersion.drawing.id;
    const lastModifiedOn = fileVersion.rootComponentVersion ? fileVersion.rootComponentVersion.lastModifiedOn : fileVersion.drawingVersion.lastModifiedOn;
    const type = fileVersion.rootComponentVersion ? 'component' : 'drawing';

    return { itemId, versionId, tipVersionId, lastModifiedOn, type };
  }

  async getItemId(projectId, fileItemId) {  
    let response = await this.sendQuery(
      `query GetVersionId($projectId: String!, $fileItemId: String!) {
        item(projectId: $projectId, itemId: $fileItemId) {
          ... on DesignFile {
            rootComponent {
              id
            }
          }
        }
      }`,
      {
        projectId,
        fileItemId
      }
    )

    let item = response.data.data.item;
    let id = item.rootComponent.id;

    return { id };
  }

  async getCollections() { 
    let res = [];
    let cursor = null;
    do {
      let response = await this.sendQuery(
        `query propertyDefinitionCollections {
          propertyDefinitionCollections ${cursor ? `(pagination : { cursor: "${cursor}" })` : "" } {
            pagination {
              cursor
              pageSize
            }
            results {
              id
              name
            }
          }
        }`,
        {
        }
      )
      cursor = response?.data?.data?.propertyDefinitionCollections?.pagination?.cursor;
      console.log({cursor});
      cursor = null;

      res = res.concat(response?.data?.data?.propertyDefinitionCollections?.results);
    } while (cursor)

    return res;
  }

  async getCollectionsByHubId(hubId, isMinimal) { 
    let res = [];
    let cursor = null;
    do {
      let response = await this.sendQuery(
        `query propertyDefinitionCollections ($hubId: ID!) {
          propertyDefinitionCollectionsByHubId (hubId: $hubId${cursor ? `, pagination : { cursor: "${cursor}" }` : `${isMinimal ? ', pagination : { limit: 1 }' : ''}` }) {
            pagination {
              cursor
              pageSize
            }
            results {
              id
              name
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
        }`,
        {
          hubId
        }
      )
      cursor = response?.data?.data?.propertyDefinitionCollectionsByHubId?.pagination?.cursor;
      console.log({cursor});
      cursor = null;

      res = res.concat(response?.data?.data?.propertyDefinitionCollectionsByHubId?.results);
    } while (cursor)

    return res;
  }

  async linkCollectionToHub(hubId, collectionId) { 
    let res = [];
    let cursor = null;
    do {
      let response = await this.sendQuery(
        `mutation linkPropertyDefinitionCollection ($propertyDefinitionCollectionId: ID!, $targetHubId: ID!) {
          linkPropertyDefinitionCollection (input: { propertyDefinitionCollectionId: $propertyDefinitionCollectionId, targetHubId: $targetHubId }) {
            hub {
              id
              name
            }
          }
        }`,
        {
          targetHubId: hubId,
          propertyDefinitionCollectionId: collectionId
        }
      )
      cursor = response?.data?.data?.propertyDefinitionCollections?.pagination?.cursor;
      console.log({cursor});
      cursor = null;

      res = res.concat(response?.data?.data?.propertyDefinitionCollectionsByHubId?.results);
    } while (cursor)

    return res;
  }

  async createCollection(name, isPublic) { 

      let response = await this.sendQuery(
        `mutation createPropertyDefinitionCollection($propertyDefinitionCollectionName: String!) {
          createPropertyDefinitionCollection(
            input: {name: $propertyDefinitionCollectionName}
          ) {
            propertyDefinitionCollection {
              id
              name
            }
          }
        }`,
        {
          propertyDefinitionCollectionName: name
        }
      );
      

    return response?.data?.data?.createPropertyDefinitionCollection?.propertyDefinitionCollection;
  }

  async getDefinitions(collectionId) { 
    let res = [];
    let cursor = null;
    do {
      let response = await this.sendQuery(
        `query propertyDefinitions($propertyDefinitionCollectionId: ID!) {
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
              readOnly
              description
              propertyBehavior
            }
          }
        }`,
        {
          propertyDefinitionCollectionId: collectionId
        }
      )
      cursor = response?.data?.data?.propertyDefinitions?.pagination?.cursor;
      console.log({cursor});
      cursor = null;

      res = res.concat(response?.data?.data?.propertyDefinitions?.results);
    } while (cursor)

    return res;
  }


  async createDefinition(collectionId, name, type, description, isHidden, propertyBehavior) { 

    let response = await this.sendQuery(
      `mutation createPropertyDefinition($propertyDefinitionCollectionId: ID!, $propertyDefinitionName: String!, $propertyType: PropertyTypes!, $description: String!, $isHidden: Boolean!, $propertyBehavior: PropertyBehavior!) {
        createPropertyDefinition(
          input: {propertyDefinitionCollectionId: $propertyDefinitionCollectionId, name: $propertyDefinitionName, type: $propertyType, description: $description, isHidden: $isHidden, propertyBehavior: $propertyBehavior}
        ) {
          propertyDefinition {
            id
            name
            type
            isHidden
            isArchived
            description
            readOnly
            propertyBehavior
          }
        }
      }`,
      {
        propertyDefinitionCollectionId: collectionId,
        propertyDefinitionName: name,
        propertyType: type,
        description: description,
        isHidden: isHidden,
        propertyBehavior: propertyBehavior
      }
    );
    
    return response?.data?.data?.createPropertyDefinition?.propertyDefinition;
  }

  async getDefinition(definitionId) { 

    let response = await this.sendQuery(
      `query propertyDefinition($propertyDefinitionId: ID!) {
        propertyDefinition(propertyDefinitionId: $propertyDefinitionId) {
          id
          name
          type
          isArchived
          isHidden
          readOnly
          description
          propertyBehavior
          units {
            name
          }
        }
      }`,
      {
        propertyDefinitionId: definitionId
      }
    );
    
    return response?.data?.data?.propertyDefinition;
  }

  async updateDefinition(definitionId, description, isHidden) { 

    let response = await this.sendQuery(
      `mutation updatePropertyDefinition($propertyDefinitionId: ID!, $description: String!, $isHidden: Boolean!) {
        updatePropertyDefinition(
          input: {propertyDefinitionId: $propertyDefinitionId, description: $description, isHidden: $isHidden}
        ) {
          propertyDefinition {
            id
            description
            isHidden
          }
        }
      }`,
      {
        propertyDefinitionId: definitionId,
        description: description,
        isHidden: isHidden
      }
    );
    
    return response?.data?.data?.updatePropertyDefinition;
  }

  async deleteDefinition(collectionId, name, type) { 

    let response = await this.sendQuery(
      `mutation createPropertyDefinition($propertyDefinitionCollectionId: ID!, $propertyDefinitionName: String!, $propertyType: PropertyTypes!) {
        createPropertyDefinition(
          input: {propertyDefinitionCollectionId: $propertyDefinitionCollectionId, name: $propertyDefinitionName, type: $propertyType, description: "desc", propertyBehavior: DEFAULT}
        ) {
          propertyDefinition {
            id
            name
            type
            isHidden
            isArchived
            description
            readOnly
            propertyBehavior
          }
        }
      }`,
      {
        propertyDefinitionCollectionId: collectionId,
        propertyDefinitionName: name,
        propertyType: type
      }
    );
    
    return response?.data?.data?.createPropertyDefinition?.propertyDefinition;
  }

  async getGeneralProperties(versionId) {  
    let response = await this.sendQuery(
      `query GetProperties($componentVersionId: String!) {
        componentVersion(componentVersionId: $componentVersionId) {
          lastModifiedOn

          partNumber
          name
          partDescription
          materialName

          itemNumber
          lifeCycle
          revision
          changeOrder
          changeOrderURN

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
      }`,
      {
        componentVersionId: versionId
      }
    )

    return response.data.data.componentVersion;
  }

  async getPropertiesForExtendable(extendableId) {  
    let response = await this.sendQuery(
      `query getAllProperties($extendableId: ID!) {
        properties(
          extendableId: $extendableId
        ) {
          results {
              value
              propertyDefinition {
                  id
                  name
                  type
                  isHidden
                  description
                  propertyBehavior
                  units {
                    name
                  }
              }
          }
        }
      }`,
      {
        extendableId
      }
    )

    return response.data.data.properties.results;
  }

  async setProperties(extendableId, properties) {  
    let response = await this.sendQuery(
      `mutation SetProperties($input: SetPropertiesInput!) {
        setProperties(input: $input) {
          extendableId
        }
      }`,
      {
        input: {
          extendableId,
          propertyInputs: properties
        }
      }
    )

    return response.data.data.setProperties;
  }

  async deleteProperty(extendableId, propertyDefinitionId) {  
    let response = await this.sendQuery(
      `mutation DeleteProperty($extendableId: ID!, $propertyDefinitionId: ID!) {
        clearProperty(input: {extendableId: $extendableId, propertyDefinitionId: $propertyDefinitionId}) {
          extendableId
        }
      }`,
      {
        extendableId,
        propertyDefinitionId
      }
    )

    return response.data.data.deleteProperty;
  }

  async getModelOccurrences(componentVersionId) {
    let cursor = null;
    let result = []; 
    while (true) {
      let response = await this.sendQuery(
        `query GetModelOccurrences($componentVersionId: String!${cursor ? ', $cursor: String!' : ''}) {
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
        }`,
        {
          componentVersionId,
          cursor
        }
      )

      result = result.concat(response.data.data.componentVersion.modelOccurrences.results);

      cursor = response.data.data.componentVersion.modelOccurrences.pagination.cursor;
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
        `query GetAllModelOccurrences($componentVersionId: String!${cursor ? ', $cursor: String!' : ''}) {
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
        }`,
        {
          componentVersionId,
          cursor
        }
      )

      result = result.concat(response.data.data.componentVersion.allModelOccurrences.results);

      cursor = response.data.data.componentVersion.allModelOccurrences.pagination.cursor;
      if (!cursor)
        break;
    }

    return result;
  }
}

module.exports = App;
