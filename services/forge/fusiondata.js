// Axios is a promise-based HTTP client for the browser and node.js. 
const axios = require("axios");
const { BASE_URL } = require('../../config.js');

// Application constructor 
class App {
  constructor(accessToken) {
    this.graphAPI = `${BASE_URL}/fusiondata/2022-04/graphql`;
    this.accessToken = accessToken;
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
      throw response.data.errors;
    }

    return response;
  }

// <getThumbnail>
  async getThumbnail(projectId, fileVersionId) {  
    let response = await this.sendQuery(
      `query GetThumbnail($projectId: String!, $fileVersionId: String!) {
        fileVersion(projectId: $projectId, versionId: $fileVersionId) {
          ... on DesignFileVersion {
            rootComponentVersion {
              id
              thumbnail {
                status
                mediumImageUrl
              }
            }
          }
          ... on DrawingFileVersion {
            drawingVersion {
              id
              thumbnail {
                status
                mediumImageUrl
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
      url: thumbnail.mediumImageUrl,
      headers: this.getRequestHeaders(),
      responseType: 'arraybuffer',
      responseEncoding: 'binary'
    })

    return resp.data;
  }
// </getThumbnail>

async getVersionId(projectId, fileVersionId) {  
  let response = await this.sendQuery(
    `query GetVersionId($projectId: String!, $fileVersionId: String!) {
      fileVersion(projectId: $projectId, versionId: $fileVersionId) {
        ... on DesignFileVersion {
          rootComponentVersion {
            id
          }
        }
        ... on DrawingFileVersion {
          drawingVersion {
            id
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
  let id = fileVersion.rootComponentVersion ? fileVersion.rootComponentVersion.id : fileVersion.drawingVersion.id;

  return { id };
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
            propertyDefinitions {
              results {
                id
                name
              }
            }
          }
        }
      }`,
      {
      }
    )
    //cursor = response?.data?.data?.propertyDefinitionCollections?.pagination?.cursor;
    res = res.concat(response?.data?.data?.propertyDefinitionCollections?.results);
  } while (cursor)

  return res;
}

async getCollectionsByHubId(hubId) { 
  let res = [];
  let cursor = null;
  do {
    let response = await this.sendQuery(
      `query propertyDefinitionCollections ($hubId: ID!) {
        propertyDefinitionCollectionsByHubId (hubId: $hubId${cursor ? `, pagination : { cursor: "${cursor}" }` : "" }) {
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
              }
            }
          }
        }
      }`,
      {
        hubId
      }
    )
    //cursor = response?.data?.data?.propertyDefinitionCollections?.pagination?.cursor;
    res = res.concat(response?.data?.data?.propertyDefinitionCollectionsByHubId?.results);
  } while (cursor)

  return res;
}

async createCollection(name, isPublic) { 

    let response = await this.sendQuery(
      `mutation createPropertyDefinitionCollection($propertyDefinitionCollectionName: String!, $propertyDefinitionCollectionIsPublic: Boolean!) {
        createPropertyDefinitionCollection(
          input: {name: $propertyDefinitionCollectionName, isPublic: $propertyDefinitionCollectionIsPublic}
        ) {
          propertyDefinitionCollection {
            id
            name
          }
        }
      }`,
      {
        propertyDefinitionCollectionName: name,
        propertyDefinitionCollectionIsPublic: isPublic
      }
    );
    

  return response;
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
    //cursor = response?.data?.data?.propertyDefinitions?.pagination?.cursor;
    res = res.concat(response?.data?.data?.propertyDefinitions?.results);
  } while (cursor)

  return res;
}


async createDefinition(collectionId, name, type, description, isHidden) { 

  let response = await this.sendQuery(
    `mutation createPropertyDefinition($propertyDefinitionCollectionId: ID!, $propertyDefinitionName: String!, $propertyType: PropertyTypes!, $description: String!, $isHidden: Boolean!) {
      createPropertyDefinition(
        input: {propertyDefinitionCollectionId: $propertyDefinitionCollectionId, name: $propertyDefinitionName, type: $propertyType, description: $description, isHidden: $isHidden, propertyBehavior: DEFAULT}
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
      isHidden: isHidden
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
        propertyDefinitionId
        description
        isHidden
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


// <getProperties>
async getProperties(projectId, fileVersionId) {  
  let response = await this.sendQuery(
    `query GetProperties($projectId: String!, $fileVersionId: String!) {
      fileVersion(projectId: $projectId, versionId: $fileVersionId) {
        ... on DesignFileVersion {
          rootComponentVersion {
            id
            __typename
            properties {
              results {
                __typename
                value
                propertyDefinition {
                  name
                }
              }
            }
          }
        }
        ... on DrawingFileVersion {
          drawingVersion {
            id
            __typename
            
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
  let properties = fileVersion.rootComponentVersion ? fileVersion.rootComponentVersion : fileVersion.drawingVersion;

  return properties;
}
// </getProperties>

// <getPropertiesForExtandable>
async getPropertiesForExtandable(extendableId) {  
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
// </getPropertiesForExtandable>

// <getModelOccurrences>
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
// </getModelOccurrences>

// <createProperty>
  async createProperty(extendableId, definitionId, value) {  

    let response = await this.sendQuery(
      `mutation setProperty($extendableId: ID!, $propertyDefinitionId: ID!, $value: PropertyValue!) {
        setProperty(
          input: {extendableId: $extendableId, propertyDefinitionId: $propertyDefinitionId, value: $value}
        ) {
          property {
            value
          }
        }
      }`,
      {
        extendableId: extendableId,
        propertyDefinitionId: definitionId,
        value: value
      }
    )

    return response.data.data.setProperty.property;
  }
// </createProperty>

// <updateProperty>
  async updateProperty(propertyGroupId, property) {  
    const valueTypes = {
      'Integer': 'Int',
      'Cost': 'Float',
      'Length': 'Float',
      'String': 'String',
      'Boolean': 'Boolean'
    }
    if (['Integer', 'Cost', 'Length'].includes(property.type)) {
      property.value = parseFloat(property.value);
    }

    let response = await this.sendQuery(
      `mutation UpdateProperty($propertyGroupId: ID!, $name: String!, $value: ${valueTypes[property.type]}!) {
        update${property.type}Property(input: {propertyGroupId: $propertyGroupId, name: $name, value: $value}) {
          property {
            name
            value
            displayValue
          }
        }
      }`,
      {
        propertyGroupId,
        name: property.name,
        value: property.value
      }
    )

    return response.data.data[`update${property.type}Property`].property;
  }
// </updateProperty>

// <deleteProperty>
  async deleteProperty(propertyGroupId, property) {  
    let response = await this.sendQuery(
      `mutation DeleteProperty($propertyGroupId: ID!, $name: String!) {
        deleteProperty(input: {propertyGroupId: $propertyGroupId, name: $name}) {
          name
        }
      }`,
      {
        propertyGroupId,
        name: property.name
      }
    )

    return response.data.data.deleteProperty;
  }
// </deleteProperty>
}

module.exports = App;
