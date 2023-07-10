import { getJSON, abortJSON, useLoadingSymbol, showInfoDialog } from "./utils.js";
import { initTreeControl } from "./hubstree.js";
import { showHubCollectionsDialog } from "./hubcollectionsdialog.js";

let _tree;
let _extendableItemId;
let _extendableVersionId;
let _hubId;
let _projectId;
let _itemUrn;

const _propertiesView = document.getElementById("propertiesView");
const _versionList = document.getElementById("versionList");

_propertiesView.onload = () => {
  if (!_tree)
    _tree = initTreeControl("#tree", onSelectionChanged, onHubButtonClicked);
};

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

function clearGeneralProperties() {
  for (let item of document.getElementsByClassName("prop-value")) {
    item.textContent = "";
  }
}

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
      _extendableItemId = response.id;
      console.log(`Selected item's ID: ${response.id}`);
    } else {
      _extendableVersionId = response.id;
      console.log(`Selected version's ID: ${response.id}`);
    }
  } catch (error) {
    console.log(error);
  }
}

function getInputElements(span) {
  const tbody = span.parentElement.parentElement.parentElement.nextElementSibling;
  return tbody.querySelectorAll("input");
}

function isComponentLevelProperty(propertyBehavior) {
  return (propertyBehavior === 'STANDARD' || propertyBehavior === 'TIMELESS');
}

function getInputValues(input) {
  if (input.type === 'checkbox') 
    return [input.oldValue, (input.indeterminate) ? "" : input.checked];
  else if (input.type === 'number')
    return [input.oldValue, (input.value === "") ? "" : Number.parseFloat(input.value)]
  else
    return [input.oldValue, input.value];
}

function setInputValues(input, value) {
  input.oldValue = value;
  if (input.type === 'checkbox') {
    input.indeterminate = (value === "");
    input.checked = value;
  }
  else
    input.value = value;  
}

function updateView(isComponentLevel) {
  if (isComponentLevel)
    // Since a new vrsoni was generated we have to list all th available
    // versions again
    listVersions();
  else
    // Just update the properties
    showVersionProperties();
}

function addRowToBody(tbody, definition, versionProperties, isComponentLevel) {
  let info = '';
  if (definition.propertyBehavior === 'TIMELESS')
    info = `<span class="bi bi-info-circle" title="Applied to the lineage and only one value exists at any given time for ALL versions/revisions" />`
  else if (definition.propertyBehavior === 'DYNAMIC_AT_VERSION')
    info = `<span class="bi bi-info-circle" title="Property value is only applied to this component version" />`

  const property = versionProperties.find(item => item.propertyDefinition.id === definition.id);
  const value = (property) ? property.value : '';

  let inputType = "number";
  if (definition.type === 'BOOLEAN')
    inputType = "checkbox";
  else if (definition.type === 'STRING')
    inputType = "text";

  const row = document.createElement("tr");
  row.innerHTML = `
    <td style="padding-left: 25px;">${definition.name} ${info}</td>
    <td class="prop-value"><input disabled class="border-0 bg-transparent" type="${inputType}" definitionId="${definition.id}" /></td>
    <td>unit</td>
    <td><span class="bi bi-eraser clickable" title="Delete property value"></td>`;

  const button = row.querySelector(".bi-eraser.clickable");
  button.onclick = async () => {
    let extendableId = isComponentLevel ? _extendableItemId : _extendableVersionId;
    await useLoadingSymbol(async () => {
      return await Promise.allSettled([
        getJSON(`/api/fusiondata/${extendableId}/properties/${definition.id}`, 'DELETE'),
      ])
    }); 
    
    updateView(isComponentLevel);
  }

  const input = row.querySelector("input");
  setInputValues(input, value);

  tbody.appendChild(row); 
}

function addPropertiesToTable(table, collection, versionProperties, isComponentLevel, title) {
  const thead = document.createElement("thead");
  thead.innerHTML = ` 
    <tr>
      <th class="name-column" scope="col">
        ${title}
      </th>
      <th colspan="3">
        <span class="bi-pencil clickable" title="Edit property values"></span>
        <span class="bi-x-circle clickable hidden" title="Cancel changes"></span>
        <span class="bi-save clickable hidden" title="Save changes"></span>
      </th>
    </tr>
    <tr style="border-block-color: transparent;">
      <th class="name-column" scope="col"></th>
      <th>Value</th>
      <th>Units</th>
      <th>Action</th>
    </tr>`
  const tbody = document.createElement("tbody");

  const definitions = collection.propertyDefinitions.results.filter(item => isComponentLevel === isComponentLevelProperty(item.propertyBehavior))
  if (definitions.length < 1)
    return;

  for (let definition of definitions) {
    addRowToBody(tbody, definition, versionProperties, isComponentLevel);
  }

  for (let item of thead.getElementsByClassName("bi-save clickable")) {
    item.onclick = async (event) => {
      showInfoDialog('question', 'Save changes?', 'Are you sure you want to save these changes? This action can’t be undone. ', 'Cancel', 'Save', async () => {
        // Swap active buttons
        for (const button of event.target.parentElement.children)   
          button.classList.toggle("hidden");

        let properties = [];
        for (const input of getInputElements(event.target)) {
          const [oldValue, value] = getInputValues(input);
          const definitionId = input.getAttribute("definitionId");
          if (value !== oldValue) 
            properties.push({
              propertyDefinitionId: definitionId,
              value
            })

          input.toggleAttribute("disabled");
        }

        if (properties.length < 1)
          return;

        let extendableId = isComponentLevel ? _extendableItemId : _extendableVersionId;
        await useLoadingSymbol(async () => {
          return await Promise.allSettled([
            getJSON(`/api/fusiondata/${extendableId}/properties`, 'PUT', JSON.stringify({properties})),
          ])
        }); 
        
        updateView(isComponentLevel);
      })
      
    }
  }

  for (let item of thead.getElementsByClassName("bi-pencil clickable")) {
    item.onclick = async (event) => {
      // Swap active buttons
      for (const button of event.target.parentElement.children)   
        button.classList.toggle("hidden");

      for (const input of getInputElements(event.target)) {
        input.toggleAttribute("disabled");
      }
    }
  }

  for (let item of thead.getElementsByClassName("bi-x-circle clickable")) {
    item.onclick = async (event) => {
      // Clear modifications
      for (const input of getInputElements(event.target)) {
        const [oldValue] = getInputValues(input);
        setInputValues(input, oldValue);
        input.toggleAttribute("disabled");
      }

      // Swap active buttons
      for (const button of event.target.parentElement.children)   
        button.classList.toggle("hidden");
    }
  }

  table.appendChild(thead);
  table.appendChild(tbody);
}

function addCollectionTableToPane(propertiesPane, collection, versionProperties) {
  const table = document.createElement("table");
  table.classList.add("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th class="name-column" scope="col" colspan="4" style="font-size: 20px; font-weight: bolder;">
          ${collection.name}
        </th>
      </tr>
    </thead>`;

  addPropertiesToTable(table, collection, versionProperties, true, 'Component level properties');
  addPropertiesToTable(table, collection, versionProperties, false, 'Component version properties');

  propertiesPane.appendChild(table);
}

async function showVersionProperties() {
  try {
    console.log("requesting properties for", _extendableItemId, _extendableVersionId);

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
      generalPropertiesTable.children[1].children[1].textContent = 
        values.name;
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
      managePropertiesTable.children[3].children[1].textContent =
        values.changeOrder;
      managePropertiesTable.children[4].children[1].textContent =
        values.changeOrderURN;

      const physicalPropertiesTable = document.getElementById(
        "physicalPropertiesTable"
      );
      const props = values.physicalProperties;
      physicalPropertiesTable.children[0].children[1].textContent =
        props.mass?.value;
      physicalPropertiesTable.children[1].children[1].textContent =
        props.volume?.value;
      physicalPropertiesTable.children[2].children[1].textContent =
        props.density?.value;
      physicalPropertiesTable.children[3].children[1].textContent =
        props.area?.value;
      physicalPropertiesTable.children[4].children[1].textContent = `${props.boundingBox?.length?.value} x ${props.boundingBox?.width?.value} x ${props.boundingBox?.height?.value}`;
    }

    // Custom Properties tab

    console.log(hubCollections.value);
    console.log(versionProperties.value);
    if (!Array.isArray(versionProperties.value))
      versionProperties.value = [];

    if (hubCollections.value) {
      const propertiesPane = document.getElementById("propertiesPane");
      propertiesPane.innerHTML = '';
      for (let collection of hubCollections.value) {
        addCollectionTableToPane(propertiesPane, collection, versionProperties.value);
      }
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

async function listVersions() {
  await storeId('item', _projectId, _itemUrn);

  _versionList.innerHTML = "";
  const versions = await getJSON(
    `/api/hubs/${_hubId}/projects/${_projectId}/contents/${_itemUrn}/versions`
  );
  const listItems = versions.map((version) => {
    const lastModifiedOn = version.attributes.lastModifiedTime.split("T")[0];
    return `<option value="${version.id}" lastModifiedOn="${lastModifiedOn}">v${version.attributes.versionNumber}</option>`;
  });
  _versionList.innerHTML = listItems.join();

  _versionList.onchange();

  document.getElementById("versionInfo").classList.remove("hidden");
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

  document.getElementById("versionInfo").classList.add("hidden");

  clearGeneralProperties();

  if (type === "item") {
    _itemUrn = fileItemVersionId;
    _hubId = hubId;
    _projectId = projectId;
    listVersions();
  } else {
    _extendableItemId = null;
    document.getElementById("thumbnail").src = "/images/box-200x200.png";
  }
}