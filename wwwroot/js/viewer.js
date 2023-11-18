export function showInViewer(versionUrn) {
    console.log("showInViewer", versionUrn);

    const base64 = btoa(versionUrn)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    let viewer;
    let options = {
        env: "AutodeskStaging2",
        api: "streamingV2", // for models uploaded to EMEA change this option to 'streamingV2_EU'
        getAccessToken: async function (onTokenReady) {
            const token = await fetch("/api/auth/token").then((res) =>
                res.json()
            );
            onTokenReady(token.access_token, token.expires_in);
        },
    };

    Autodesk.Viewing.Initializer(options, function () {
        let htmlDiv = document.getElementById("viewer");
        viewer = new Autodesk.Viewing.GuiViewer3D(htmlDiv);
        let startedCode = viewer.start();
        if (startedCode > 0) {
            console.error("Failed to create a Viewer: WebGL not supported.");
            return;
        }

        console.log("Initialization complete, loading a model next...");

        let documentId = "urn:" + base64;
        Autodesk.Viewing.Document.load(
            documentId,
            onDocumentLoadSuccess,
            onDocumentLoadFailure
        );

        function onDocumentLoadSuccess(viewerDocument) {
            // viewerDocument is an instance of Autodesk.Viewing.Document
            let defaultModel = viewerDocument.getRoot().getDefaultGeometry();
            viewer.loadDocumentNode(viewerDocument, defaultModel);
        }

        function onDocumentLoadFailure() {
            console.error("Failed fetching Forge manifest");
        }
    });
}
