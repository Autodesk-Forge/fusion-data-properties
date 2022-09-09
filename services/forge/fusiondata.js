// Axios is a promise-based HTTP client for the browser and node.js. 
const axios = require("axios");

// Application constructor 
class App {
  constructor(accessToken) {
    this.graphAPI = 'https://developer.api.autodesk.com/fusiondata/2022-04/graphql';
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
              thumbnail {
                status
                mediumImageUrl
              }
            }
          }
          ... on DrawingFileVersion {
            drawingVersion {
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

// <getProperties>
async getProperties(projectId, fileVersionId) {  
  let response = await this.sendQuery(
    `query GetProperties($projectId: String!, $fileVersionId: String!) {
      fileVersion(projectId: $projectId, versionId: $fileVersionId) {
        ... on DesignFileVersion {
          rootComponentVersion {
            id
            propertyGroups {
              results {
                __typename
                id
                name
                properties {
                  name
                  displayValue
                  __typename
                }
              }
            }
          }
        }
        ... on DrawingFileVersion {
          drawingVersion {
            id
            propertyGroups {
              results {
                __typename
                id
                name
                properties {
                  name
                  displayValue
                  __typename
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

  let fileVersion = response.data.data.fileVersion;
  let properties = fileVersion.rootComponentVersion ? fileVersion.rootComponentVersion : fileVersion.drawingVersion;

  return properties;
}
// </getProperties>

// <getPropertiesForExtandable>
async getPropertiesForExtandable(extendableId) {  
  let response = await this.sendQuery(
    `query GetProperties($extendableId: ID!) {
      propertyGroups(extendableId: $extendableId) {
        results {
          __typename
          id
          name
          properties {
            name
            displayValue
            __typename
          }
        }
      }
    }`,
    {
      extendableId
    }
  )

  return {
    id: extendableId,
    propertyGroups: response.data.data.propertyGroups
  };
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

// <createPropertyGroup>
  async createPropertyGroup(extendableId, propertyGroupName) {  
    let response = await this.sendQuery(
      `mutation CreatePropertyGroup($extendableId: ID!, $propertyGroupName: String!) {
        createPropertyGroup(input: {extendableId: $extendableId, name: $propertyGroupName}) {
          propertyGroup {
            id
            __typename
          }
        }
      }`,
      {
        extendableId,
        propertyGroupName
      }
    )

    return response.data.data.createPropertyGroup.propertyGroup;
  }
// </createPropertyGroup>

// <deletePropertyGroup>
  async deletePropertyGroup(propertyGroupId) {  
    await this.sendQuery(
      `mutation DeletePropertyGroup($propertyGroupId: ID!) {
        deletePropertyGroup(input: {propertyGroupId: $propertyGroupId}) {
          id
        }
      }`,
      {
        propertyGroupId
      }
    )
  }
// </deletePropertyGroup>

// <createProperty>
  async createProperty(propertyGroupId, property) {  
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
      `mutation CreateProperty($propertyGroupId: ID!, $name: String!, $value: ${valueTypes[property.type]}!) {
        create${property.type}Property(input: {propertyGroupId: $propertyGroupId, name: $name, value: $value}) {
          property {
            name
            displayValue
            __typename
          }
        }
      }`,
      {
        propertyGroupId,
        name: property.name,
        value: property.value
      }
    )

    return response.data.data[`create${property.type}Property`].property;
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
