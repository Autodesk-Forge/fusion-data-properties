import { getJSON, useLoadingSymbol, showView, showInfoDialog } from "./utils.js";
import { showLinkIconForHubsWithLinkedCollections } from "./hubstree.js";

document.getElementById("showCollectionsView").onclick = () => {
  const closeButton = document.getElementById("collectionsDialogClose");
  closeButton.click();
  showView('collectionsView')
}

export async function showHubCollectionsDialog(hubId) {
  const collectionsDialogEmpty = document.getElementById(
    "collectionsDialogEmpty"
  );

  const dialogButton = document.getElementById("collectionsDialogButton");
  dialogButton.click();

  // Fill the list
  const collectionsList = document.getElementById("collectionsList");
  collectionsList.innerHTML = "";

  let [collections, linkedCollections] = await useLoadingSymbol(async () => {
    return await Promise.allSettled([
      getJSON(`/api/fusiondata/collections`, "GET"),
      getJSON(`/api/fusiondata/${hubId}/collections`),
    ]);
  });

  // If getting lkinked collections failed 
  // then you don't have anything linked yet 

  if (collections?.value?.length < 1) {
    collectionsDialogEmpty.classList.toggle("hidden", false);
    return;
  }
 

  const isLinked = (collectionId) => {
    if (!linkedCollections.value)
      return false;

    const result = linkedCollections.value.find(
      (item) => item.id === collectionId
    );

    return !!result;
  };

  collectionsDialogEmpty.classList.toggle("hidden", true);

  if (linkedCollections.value) {
    for (let collection of linkedCollections.value) {
      const linkIcon = `<span class="bi-link-45deg float-right"></span>`;
      collectionsList.innerHTML += `<li class="list-group-item" collectionId="${collection.id}">${collection.name}${linkIcon}</li>`;
    }
  }

  for (let collection of collections.value) {
    if (isLinked(collection.id))
      continue;

    const linkIcon = `<span class="bi-link-45deg float-right clickable dimmed"></span>`;
    collectionsList.innerHTML += `<li class="list-group-item" collectionId="${collection.id}">${collection.name}${linkIcon}</li>`;
  }

  for (let item of collectionsList.getElementsByClassName("bi-link-45deg")) {
    item.onclick = async (event) => {
      if (!item.classList.contains("dimmed")) return;

      const collectionId =
        event.target.parentElement.getAttribute("collectionId");

      showInfoDialog('question', '', 'By selecting “Proceed” below, you will link the selected collection to your hub. ', 'Cancel', 'Proceed', async () => {
        try {
          let result = await useLoadingSymbol(async () => {
            return getJSON(
              `/api/fusiondata/${hubId}/collections`,
              "POST",
              JSON.stringify({ collectionId })
            );
          });
          item.classList.toggle("dimmed", false);
          item.classList.toggle("clickable", false);

          // Update links in tree control
          showInfoDialog('success', '', 'Collection successfully linked to hub.', '', 'Continue', () => {
            showLinkIconForHubsWithLinkedCollections();
          })
        } catch (error) {
          showInfoDialog('error', 'Operation not allowed', 'Only hub administrators are allowed to link collections to a hub.', '', 'OK')
          console.log(error);
        }
      }) 
    };
  }
}
