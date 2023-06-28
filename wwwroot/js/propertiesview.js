import { getJSON, useLoadingSymbol } from './utils.js';
import { initTreeControl } from './hubstree.js';
import { showHubCollectionsDialog } from './hubcollectionsdialog.js';

let tree; 
let extendableId;

document.getElementById('propertiesView').onload = () => {
  if (!tree)
    tree = initTreeControl('#tree', onSelectionChanged, onHubButtonClicked);
}

async function showThumbnail(projectId, fileVersionId) {
  document.getElementById('thumbnail').src = 
    `/api/fusiondata/${projectId}/${encodeURIComponent(fileVersionId)}/thumbnail`;
}

async function storeId(type, projectId, fileItemOrVersionId) {
  const response = await getJSON(
    `/api/fusiondata/${projectId}/${encodeURIComponent(fileItemOrVersionId)}/${type}id`, 'GET');

    extendableId = response.id;
  console.log(`Selected item's ID: ${response.id}`);
}

async function clearId() {
  extendableId = undefined;
}

async function showName(fileVersionId, fileName) {
  const versionNumber = fileVersionId.split('?version=');
  document.getElementById('title').innerHTML = `${fileName} (v${versionNumber[1]})`
}




async function showProperties() {
  const properties = await useLoadingSymbol(async () => {
    return await getJSON(`/api/fusiondata/${extendableId}/generalproperties`);
  }, 'properties');

  const generalPropertiesTable = document.getElementById('generalPropertiesTable');
  generalPropertiesTable.children[0].children[1].textContent = properties.partNumber;
  generalPropertiesTable.children[1].children[1].textContent = properties.name;
  generalPropertiesTable.children[2].children[1].textContent = properties.partDescription;
  generalPropertiesTable.children[3].children[1].textContent = properties.materialName;

  const managePropertiesTable = document.getElementById('managePropertiesTable');
  managePropertiesTable.children[0].children[1].textContent = properties.itemNumber;
  managePropertiesTable.children[1].children[1].textContent = properties.lifecycle;
  managePropertiesTable.children[2].children[1].textContent = properties.revision;
  managePropertiesTable.children[3].children[1].textContent = 'state?';
  managePropertiesTable.children[4].children[1].textContent = properties.changeOrder;
  managePropertiesTable.children[5].children[1].textContent = properties.changeOrderURN;

  const physicalPropertiesTable = document.getElementById('physicalPropertiesTable');
  const props = properties.physicalProperties;
  physicalPropertiesTable.children[0].children[1].textContent = props.mass.value;
  physicalPropertiesTable.children[1].children[1].textContent = props.volume.value;
  physicalPropertiesTable.children[2].children[1].textContent = props.density.value;
  physicalPropertiesTable.children[3].children[1].textContent = props.area.value;
  physicalPropertiesTable.children[4].children[1].textContent = 
    `${props.boundingBox.length.value} x ${props.boundingBox.width.value} x ${props.boundingBox.height.value}`;
}

function onHubButtonClicked(event) {
  let str = "adasd";
  showHubCollectionsDialog(null, )
}

export async function onSelectionChanged(type, hubId, projectId, fileItemVersionId, fileName) {
   

   if (type !== 'version' && type !== 'item') {
    clearId();
    return;
   }

   /*
  document.getElementById('createProperty').onclick = async () => {
    try {
      const definitionId = document.getElementById('definitions').value;
      if (!definitionId) {
        alert('Select a property definition!');
        return;
      }
 
      const propertyValue = document.getElementById('propertyValue').value;
      const extendableId = document.getElementById('properties').attributes['extendableId'];  
      const property = await getJSON(
        `/api/fusiondata/${extendableId}/properties`, 'POST',
        JSON.stringify({ 
          definitionId: definitionId,
          value: propertyValue
      }));

      showProperties();
    } catch {}
  };

  document.getElementById('updateProperty').onclick = async (event) => {
    try {
      if (event.target.selectedOptions.length < 1) {
        alert('Select a property!');
        return;
      }

      const optionElement = event.target.selectedOptions[0];
      const definitionId = optionElement.id;
      const extendableId = document.getElementById('properties').attributes['extendableId'];  
      const propertyValue = document.getElementById('propertyValue').value;  
      const property = await getJSON(
        `/api/fusiondata/${extendableId}/properties/${definitionId}`, 'PUT',
        JSON.stringify({ 
          value: propertyValue
      }));

    } catch {}
  };

  document.getElementById('deleteProperty').onclick =async () => {
    try {
      if (event.target.selectedOptions.length < 1) {
        alert('Select a property!');
        return;
      }

      const optionElement = event.target.selectedOptions[0];
      const definitionId = optionElement.id;
      const extendableId = document.getElementById('properties').attributes['extendableId'];  
      await getJSON(
        `/api/fusiondata/${extendableId}/properties/${definitionId}`, 'DELETE'
      );

      showProperties();  
    } catch {}
  };
  */

  if (type === 'version') {
    showThumbnail(projectId, fileItemVersionId);
    storeId(type, projectId, fileItemVersionId).then(() => {
      showProperties();
    }) 
    showName(fileItemVersionId, fileName);
  } else {
    storeId(type, projectId, fileItemVersionId).then(() => {
      showProperties();
    }) 
  }
}