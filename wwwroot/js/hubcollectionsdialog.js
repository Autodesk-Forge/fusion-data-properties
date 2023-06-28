import { getJSON, useLoadingSymbol } from './utils.js';

export async function showHubCollectionsDialog(callback, values) {
  const dialogButton =  document.getElementById('collectionsDialogButton');
  dialogButton.click();

  // Fill the list
  const collectionsList =  document.getElementById('collectionsList');
  collectionsList.innerHTML = '';

  let collections = await useLoadingSymbol(async () => {
    return await getJSON(`/api/fusiondata/collections`, 'GET')
  });

  for (let collection of collections) {
    collectionsList.innerHTML += `<li class="list-group-item" collectionId="${collection.id}">${collection.name}<span
    class="bi-link-45deg float-right clickable"></span></li>`
  }
}

