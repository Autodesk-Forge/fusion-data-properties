let viewer;

function selectComponent(componentName) {
    if (!componentName) {
        viewer.select([]);
        return;
    }

    viewer.search(componentName, (dbIds) => {
        if (dbIds.length < 1) {
            viewer.select([]);
            return;
        }

        viewer.model.getBulkProperties(
            dbIds,
            null,
            (elements) => {
                const components = elements.filter(
                    (component) =>
                        component.name === componentName ||
                        component.name.startsWith(componentName + ":")
                );

                const dbIds = components.map((component) => component.dbId);
                viewer.select(dbIds);
                viewer.fitToView(dbIds);
            },
            (error) => {
                viewer.select([]);
                console.error(error);
            }
        );
    });
}

function loadModel(versionUrn) {
    return new Promise((resolve, reject) => {
        const options = {
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
            if (!viewer) {
                const htmlDiv = document.getElementById("viewer");
                viewer = new Autodesk.Viewing.GuiViewer3D(htmlDiv);
                const startedCode = viewer.start();
                if (startedCode > 0) {
                    console.error(
                        "Failed to create a Viewer: WebGL not supported."
                    );
                    reject();
                    return;
                }

                console.log("Initialization complete, loading a model next...");
            }

            if (viewer.model && viewer.model.loader.svfUrn === versionUrn) {
                resolve();
                return;
            }

            const documentId = "urn:" + versionUrn;
            Autodesk.Viewing.Document.load(
                documentId,
                onDocumentLoadSuccess,
                onDocumentLoadFailure
            );

            async function onDocumentLoadSuccess(viewerDocument) {
                const defaultModel = viewerDocument
                    .getRoot()
                    .getDefaultGeometry();
                await viewer.loadDocumentNode(viewerDocument, defaultModel);
                resolve();
            }

            function onDocumentLoadFailure() {
                console.error("Failed fetching Forge manifest");
                reject();
            }
        });
    });
}

export async function showInViewer(versionUrn, componentName) {
    console.log("showInViewer", versionUrn);

    const viewerPane = document.getElementById("viewerPane");
    if (!viewerPane.classList.contains("active")) return;

    const base64 = btoa(versionUrn)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    await loadModel(base64);

    selectComponent(componentName);
}
