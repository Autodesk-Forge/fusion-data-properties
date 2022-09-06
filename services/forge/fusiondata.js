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
        }
      }`,
      {
        projectId,
        fileVersionId
      }
    )

    let thumbnail = response.data.data.fileVersion.rootComponentVersion.thumbnail;

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
      }
    }`,
    {
      projectId,
      fileVersionId
    }
  )

  let properties = response.data.data.fileVersion.rootComponentVersion;

  return properties;
}
// </getProperties>

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
    await this.sendQuery(
      `mutation CreateProperty($propertyGroupId: ID!, $name: String!, $value: ${property.type}!) {
        create${property.type}Property(input: {propertyGroupId: $propertyGroupId, name: $name, value: $value}) {
          property {
            name
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
  }
// </createProperty>

// <updateProperty>
  async updateProperty(propertyGroupId, property) {  
    await this.sendQuery(
      `mutation UpdateProperty($propertyGroupId: ID!, $name: String!, $value: ${property.type}!) {
        update${property.type}Property(input: {propertyGroupId: $propertyGroupId, name: $name, value: $value}) {
          property {
            name
          }
        }
      }`,
      {
        propertyGroupId,
        name: property.name,
        value: property.value
      }
    )
  }
// </updateProperty>

// <deleteProperty>
  async deleteProperty(propertyGroupId, property) {  
    await this.sendQuery(
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
  }
// </deleteProperty>
}

module.exports = App;
