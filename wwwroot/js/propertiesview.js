import { getJSON, useLoadingSymbol } from './utils.js';
import { initTreeControl } from './hubstree.js';
import { showHubCollectionsDialog } from './hubcollectionsdialog.js';

let tree; 
let extendableId;

document.getElementById('propertiesView').onload = () => {
  if (!tree)
    tree = initTreeControl('#tree', onSelectionChanged, onHubButtonClicked);
}

function clearGeneralProperties() {
  for (let item of document.getElementsByClassName("prop-value")) {
    item.textContent = '';
  }
}

document.getElementById("versionList").onchange = () => {
  clearGeneralProperties();

  const versionList = document.getElementById("versionList");
  const versionUrn = versionList.value;
  const selectedVersion = versionList.selectedOptions[0];
  const fileName = versionList.getAttribute("fileName");
  const lastModifiedOn = selectedVersion.getAttribute("lastModifiedOn");
  document.getElementById("lastModifiedOn").textContent = lastModifiedOn;

  const projectId = versionList.getAttribute("projectId");
  showThumbnail(projectId, versionUrn);
  storeId('version', projectId, versionUrn).then(() => {
    showProperties();
  }) 
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

  // Overview tab

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

  // Custom Properties tab


}

function onHubButtonClicked(event) {
  const hubId = event.target.parentElement.getAttribute('data-uid').split('|')[1]
  showHubCollectionsDialog(hubId)
}

function updateBreadcrumbs(node) {
  const propertiesView = document.getElementById('propertiesView');
  const breadCrumbs = propertiesView.getElementsByClassName('breadcrumb')[0];
  breadCrumbs.innerHTML = 
    `<li class="breadcrumb-item">
      <a class="link-body-emphasis" href="#">
        <span class="bi bi-house-door-fill"></span>
        <span class="visually-hidden">Home</span>
      </a>
    </li>`

  let parents = node.getParents().toArray().reverse();
  parents.push(node);
  let listItems = parents.map(parent => {
    return `<li class="breadcrumb-item">
        <a
          class="link-body-emphasis fw-semibold text-decoration-none"
          href="#"
          node-id="${parent.id}"
          >${parent.text}</a
        >
      </li>`
  })

  breadCrumbs.innerHTML += listItems.join('');

  for (let item of breadCrumbs.getElementsByClassName('link-body-emphasis')) {
    item.onclick = (event) => {
      const nodeId = event.target.getAttribute("node-id");
      const node = document.querySelector(`a[data-uid="${nodeId}"]`);
      if (node)
        node.click();
    }
  }
}

async function listVersions(hubId, projectId, fileItemVersionId, fileName) {
  const versionList = document.getElementById("versionList");
  versionList.setAttribute("projectId", projectId);
  versionList.setAttribute("itemUrn", fileItemVersionId);
  versionList.setAttribute("fileName", fileName);

  versionList.innerHTML = '';
  const versions = await getJSON(`/api/hubs/${hubId}/projects/${projectId}/contents/${fileItemVersionId}/versions`);
  const listItems = versions.map(version => {
    const lastModifiedOn = version.attributes.lastModifiedTime.split('T')[0];
    return `<option value="${version.id}" lastModifiedOn="${lastModifiedOn}">v${version.attributes.versionNumber}</option>`;
  })
  versionList.innerHTML = listItems.join();

  versionList.onchange();

  document.getElementById("versioInfo").classList.remove("hidden");
}

export async function onSelectionChanged(node, type, hubId, projectId, fileItemVersionId, fileName) {
   updateBreadcrumbs(node);

   document.getElementById("versioInfo").classList.add("hidden");

   if (type === 'item') {
    listVersions(hubId, projectId, fileItemVersionId, fileName);
   }

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