import { getJSON, abortJSON, useLoadingSymbol } from "./utils.js";
import { initTreeControl } from "./hubstree.js";
import { showHubCollectionsDialog } from "./hubcollectionsdialog.js";

let _tree;
let _extendableId;
let _extendableVersionId;
let _hubId;
let _projectId;

const _propertiesView = document.getElementById("propertiesView");
const _versionList = document.getElementById("versionList");

_propertiesView.onload = () => {
  if (!_tree)
    _tree = initTreeControl("#tree", onSelectionChanged, onHubButtonClicked);
};

function clearGeneralProperties() {
  for (let item of document.getElementsByClassName("prop-value")) {
    item.textContent = "";
  }
}

_versionList.onchange = () => {
  abortJSON();
  clearGeneralProperties();

  const versionUrn = _versionList.value;
  const selectedVersion = _versionList.selectedOptions[0];
  const lastModifiedOn = selectedVersion.getAttribute("lastModifiedOn");
  document.getElementById("lastModifiedOn").textContent = lastModifiedOn;

  showThumbnail(_projectId, versionUrn);
  storeId("version", _projectId, versionUrn).then(() => {
    showVersionProperties();
  });
};

async function showThumbnail(projectId, fileVersionId) {
  document.getElementById(
    "thumbnail"
  ).src = `/api/fusiondata/${projectId}/${encodeURIComponent(
    fileVersionId
  )}/thumbnail`;
}

async function storeId(type, projectId, fileItemOrVersionId) {
  try {
    const response = await getJSON(
      `/api/fusiondata/${projectId}/${encodeURIComponent(
        fileItemOrVersionId
      )}/${type}id`,
      "GET"
    );

    if (type === 'item') {
      _extendableId = response.id;
      console.log(`Selected item's ID: ${response.id}`);
    } else {
      _extendableVersionId = response.id;
      console.log(`Selected version's ID: ${response.id}`);
    }
  } catch (error) {
    console.log(error);
  }
}

async function showVersionProperties() {
  try {
    console.log("requesting properties for", _extendableId, _extendableVersionId);

    const [generalProperties, versionProperties, hubCollections] = await useLoadingSymbol(async () => {
      return await Promise.allSettled([
        getJSON(`/api/fusiondata/${_extendableVersionId}/generalproperties`),
        getJSON(`/api/fusiondata/${_extendableVersionId}/properties`),
        getJSON(`/api/fusiondata/${_hubId}/collections`)
      ])
    });
 
    // Overview tab

    if (generalProperties.value) {
      const values = generalProperties.value;
      const generalPropertiesTable = document.getElementById(
        "generalPropertiesTable"
      );
      generalPropertiesTable.children[0].children[1].textContent =
        values.partNumber;
      generalPropertiesTable.children[1].children[1].textContent = values.name;
      generalPropertiesTable.children[2].children[1].textContent =
        values.partDescription;
      generalPropertiesTable.children[3].children[1].textContent =
        values.materialName;

      const managePropertiesTable = document.getElementById(
        "managePropertiesTable"
      );
      managePropertiesTable.children[0].children[1].textContent =
        values.itemNumber;
      managePropertiesTable.children[1].children[1].textContent =
        values.lifecycle;
      managePropertiesTable.children[2].children[1].textContent =
        values.revision;
      managePropertiesTable.children[3].children[1].textContent = "state?";
      managePropertiesTable.children[4].children[1].textContent =
        values.changeOrder;
      managePropertiesTable.children[5].children[1].textContent =
        values.changeOrderURN;

      const physicalPropertiesTable = document.getElementById(
        "physicalPropertiesTable"
      );
      const props = values.physicalProperties;
      physicalPropertiesTable.children[0].children[1].textContent =
        props.mass.value;
      physicalPropertiesTable.children[1].children[1].textContent =
        props.volume.value;
      physicalPropertiesTable.children[2].children[1].textContent =
        props.density.value;
      physicalPropertiesTable.children[3].children[1].textContent =
        props.area.value;
      physicalPropertiesTable.children[4].children[1].textContent = `${props.boundingBox.length.value} x ${props.boundingBox.width.value} x ${props.boundingBox.height.value}`;
    }

    // Custom Properties tab

    console.log(versionProperties.value);

    if (versionProperties.value) {
     
    }

  } catch (error) {
    console.log(error);
  }
}

function onHubButtonClicked(event) {
  // prevent "node.click" from firing
  event.stopPropagation();

  const hubId = event.target.parentElement
    .getAttribute("data-uid")
    .split("|")[1];
  showHubCollectionsDialog(hubId);
}

function updateBreadcrumbs(node) {
  const breadCrumbs = _propertiesView.getElementsByClassName("breadcrumb")[0];
  breadCrumbs.innerHTML = `<li class="breadcrumb-item">
      <a class="link-body-emphasis" href="#">
        <span class="bi bi-house-door-fill"></span>
        <span class="visually-hidden">Home</span>
      </a>
    </li>`;

  let parents = node.getParents().toArray().reverse();
  parents.push(node);
  let listItems = parents.map((parent) => {
    return `<li class="breadcrumb-item">
        <a
          class="link-body-emphasis fw-semibold text-decoration-none"
          href="#"
          node-id="${parent.id}"
          >${parent.text}</a
        >
      </li>`;
  });

  breadCrumbs.innerHTML += listItems.join("");

  for (let item of breadCrumbs.getElementsByClassName("link-body-emphasis")) {
    item.onclick = (event) => {
      const nodeId = event.target.getAttribute("node-id");
      const node = document.querySelector(`a[data-uid="${nodeId}"]`);
      if (node) node.click();
    };
  }
}

async function listVersions(hubId, projectId, fileItemVersionId) {
  await storeId('item', projectId, fileItemVersionId);

  _hubId = hubId;
  _projectId = projectId;

  _versionList.innerHTML = "";
  const versions = await getJSON(
    `/api/hubs/${hubId}/projects/${projectId}/contents/${fileItemVersionId}/versions`
  );
  const listItems = versions.map((version) => {
    const lastModifiedOn = version.attributes.lastModifiedTime.split("T")[0];
    return `<option value="${version.id}" lastModifiedOn="${lastModifiedOn}">v${version.attributes.versionNumber}</option>`;
  });
  _versionList.innerHTML = listItems.join();

  _versionList.onchange();

  document.getElementById("versioInfo").classList.remove("hidden");
}

export async function onSelectionChanged(
  node,
  type,
  hubId,
  projectId,
  fileItemVersionId
) {
  abortJSON();

  updateBreadcrumbs(node);

  document.getElementById("versioInfo").classList.add("hidden");

  clearGeneralProperties();

  if (type === "item") {
    listVersions(hubId, projectId, fileItemVersionId);
  } else {
    _extendableId = null;
    document.getElementById("thumbnail").src = "/images/box-200x200.png";
  }
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

      showVersionProperties();
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

      showVersionProperties();  
    } catch {}
  };
  

  if (type === 'version') {
    showThumbnail(projectId, fileItemVersionId);
    storeId(type, projectId, fileItemVersionId).then(() => {
      showVersionProperties();
    }) 
    showName(fileItemVersionId, fileName);
  } else {
    storeId(type, projectId, fileItemVersionId).then(() => {
      showVersionProperties();
    }) 
  }
  */

