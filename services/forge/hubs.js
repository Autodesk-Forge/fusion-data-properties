const { HubsApi, ProjectsApi, FoldersApi, ItemsApi } = require('forge-apis');
const { internalAuthClient } = require('./auth.js');

async function getHubs(req, token) {
    const resp = await new HubsApi().getHubs(null, internalAuthClient(req), token);
    return resp.body.data;
}

async function getProjects(req, hubId, token) {
    const resp = await new ProjectsApi().getHubProjects(hubId, null, internalAuthClient(req), token);
    return resp.body.data;
}

async function getProjectContents(req, hubId, projectId, folderId, token) {
    if (!folderId) {
        const resp = await new ProjectsApi().getProjectTopFolders(hubId, projectId, internalAuthClient(req), token);
        return resp.body.data;
    } else {
        const resp = await new FoldersApi().getFolderContents(projectId, folderId, null, internalAuthClient(req), token);
        return resp.body.data;
    }
}

async function getItemVersions(req, projectId, itemId, token) {
    const resp = await new ItemsApi().getItemVersions(projectId, itemId, null, internalAuthClient(req), token);
    return resp.body.data;
}

module.exports = {
    getHubs,
    getProjects,
    getProjectContents,
    getItemVersions
};
