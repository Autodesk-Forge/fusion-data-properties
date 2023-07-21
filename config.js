let { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_CALLBACK_URL, SERVER_SESSION_SECRET, BASE_URL, GRAPHQL_URL, PORT } = process.env;
if (!FORGE_CLIENT_ID || !FORGE_CLIENT_SECRET || !FORGE_CALLBACK_URL || !SERVER_SESSION_SECRET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
const INTERNAL_TOKEN_SCOPES = ['data:read', 'data:create', 'data:write', 'data:search'];
const PUBLIC_TOKEN_SCOPES = ['viewables:read'];
PORT = PORT || 3000;

module.exports = {
    FORGE_CLIENT_ID,
    FORGE_CLIENT_SECRET,
    FORGE_CALLBACK_URL,
    SERVER_SESSION_SECRET,
    INTERNAL_TOKEN_SCOPES,
    PUBLIC_TOKEN_SCOPES,
    BASE_URL,
    GRAPHQL_URL,
    PORT
};
