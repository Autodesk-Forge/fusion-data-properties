import { getJSON, abortJSON, useLoadingSymbol, showInfoDialog, formatNumber, wait, isSafariFirefox } from "./utils.js";
import { initTreeControl, updateVersionsList } from "./hubstree.js";
import { showHubCollectionsDialog } from "./hubcollectionsdialog.js";

let _tree;
let _itemId;
let _versionId;
let _itemType;
let _hubUrn;
let _isTipVersion;

const _propertiesView = document.getElementById("propertiesView");

_propertiesView.onload = () => {
  if (!_tree)
    _tree = initTreeControl("#tree", onSelectionChanged, onHubButtonClicked);
};

function clearGeneralProperties() {
  for (let item of document.getElementsByClassName("prop-value")) {
    item.textContent = "";
  }
}

async function showThumbnail() {
  const thumbnail = document.getElementById("thumbnail");
  try {
    while (true) {
      const response = await getJSON(
        `/api/fusiondata/${_itemType}/${_versionId}/thumbnailUrl`,
        "GET"
      );

      if (!['PENDING', 'IN_PROGRESS'].includes(response.status)) {
        if (response.status !== 'SUCCESS')
          throw "Could not generate thumbnail";
  
        thumbnail.src = `/api/fusiondata/thumbnail/${encodeURIComponent(response.largeImageUrl)}`;

        break;
      }

      await wait(1);
    }
  }
  catch (error) {
    console.log(error);
    thumbnail.src = "/images/box-200x200.png";
  }
}

function getInputElements(tbody) {
  return tbody.querySelectorAll("input");
}

function isComponentLevelProperty(propertyBehavior) {
  return (['STANDARD', 'TIMELESS'].includes(propertyBehavior));
}

function getInputValues(input) {
  // We can ignore radio buttons for "NO" - working through "YES" is enough 
  if (input.id.endsWith("_NO"))
    return [null, null];

  const propType = input.getAttribute("propType");
  if (input.type === 'radio') {
    const inputNo = input.nextElementSibling.nextElementSibling;
    return [input.oldValue, (!input.checked && !inputNo.checked) ? "" : input.checked];
  }
  else if (propType === 'int')
    return [input.oldValue, (input.value === "") ? "" : Number.parseInt(input.value)]
  else if (propType === 'float')
    return [input.oldValue, (input.value === "") ? "" : Number.parseFloat(input.value)]
  else
    return [input.oldValue, input.value];
}

function setInputValues(input, value) {
  // We can ignore radio buttons for "NO" - working through "YES" is enough 
  if (input.id.endsWith("_NO"))
    return;

  input.oldValue = value;
  if (input.type === 'radio') {
    input.checked = (value === true);
    const inputNo = input.nextElementSibling.nextElementSibling;
    inputNo.checked = (value === false);
  }
  else
    input.value = value;  
}

function updateView(isComponentLevel) {
  if (isComponentLevel)
    // Since a new version was generated we have to list all the available
    // versions again
    updateVersionsList();
  else
    // Just update the properties
    showVersionProperties();
}

function getCheckboxInputHTML(definitionId, propertyBehavior) {
  const idYes = definitionId + "_YES";
  const idNo = definitionId + "_NO";
  return `<input 
      disabled
      class="form-check-input" 
      type="radio" 
      propType="boolean"
      name="${definitionId}" 
      id="${idYes}" 
      definitionId="${definitionId}" 
      propertyBehavior="${propertyBehavior}" 
    />
    <label class="form-check-label" for="${idYes}">
      Yes&nbsp;&nbsp;
    </label>
  
    <input 
      disabled
      class="form-check-input" 
      type="radio" 
      name="${definitionId}" 
      id="${idNo}" 
    />
    <label class="form-check-label" for="${idNo}">
      No
    </label>
  `    
}

function handleOnInput(input) {
  if (input.type !== 'number')
    return;

  if (isSafariFirefox)
    input.type = "text";  

  input.onkeydown = (event) => {
    if (event.key === "." && (input.getAttribute("propType") !== 'float' || input.value.includes("."))) {
      event.preventDefault();
      return;
    }

    if (!isSafariFirefox)
      return;

    const keys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "Backspace"];
    if (!keys.includes(event.key))
      event.preventDefault();
  }  
}

function getTextInputHTML(definitionId, propertyBehavior) {
  return `<input disabled class="border-0 bg-transparent" 
    type="text" 
    propType="string"
    definitionId="${definitionId}" 
    propertyBehavior="${propertyBehavior}" 
  />`
}

function getNumberInputHTML(inputType, definitionId, propertyBehavior) {
  return `<input disabled class="border-0 bg-transparent" 
    type="number"
    propType="${inputType}" 
    definitionId="${definitionId}" 
    propertyBehavior="${propertyBehavior}" 
  />`
}


function addRowToBody(tbody, definition, versionProperties) {
  let info = '';
  const isComponentLevel = isComponentLevelProperty(definition.propertyBehavior);
  const behaviors = {
    'DYNAMIC': 'D',
    'DYNAMIC_AT_VERSION': 'DV',
    'TIMELESS': 'T',
    'STANDARD': 'S'
  }
  const behaviorSign = `[${behaviors[definition.propertyBehavior]}]`
  /*
  if (definition.propertyBehavior === 'TIMELESS')
    info = `<span class="bi bi-info-circle" title="Applied to the lineage and only one value exists at any given time for ALL versions/revisions" />`
  else if (definition.propertyBehavior === 'DYNAMIC_AT_VERSION')
    info = `<span class="bi bi-info-circle" title="Property value is only applied to this component version" />`
    */

  const property = versionProperties.find(item => item.propertyDefinition.id === definition.id);
  const value = (property) ? property.value : '';

  let inputHTML = "";
  if (definition.type === 'BOOLEAN') {
    inputHTML = getCheckboxInputHTML(definition.id, definition.propertyBehavior);
  }
  else if (definition.type === 'STRING') {
    inputHTML = getTextInputHTML(definition.id, definition.propertyBehavior);
  }
  else if (definition.type === 'INTEGER') {
    inputHTML = getNumberInputHTML("int", definition.id, definition.propertyBehavior);
  } else {
    inputHTML = getNumberInputHTML("float", definition.id, definition.propertyBehavior);
  }

  const row = document.createElement("tr");
  row.innerHTML = `
    <td style="padding-left: 25px;">${definition.name} ${info} ${behaviorSign}</td>
    <td class="prop-value">
     ${inputHTML}
    </td>
    <td>${definition?.units?.name || ""}</td>
    <td><span class="bi bi-eraser clickable" title="Delete property value"></td>`;

  const button = row.querySelector(".bi-eraser.clickable");
  button.onclick = async () => {
    let extendableId = isComponentLevel ? _itemId : _versionId;
    const text = (isComponentLevel) ?
      'Are you sure you want to save these changes? A new file version will be created with this property cleared. This action can’t be undone.' :
      'Are you sure you want to save these changes? The property for this version will be cleared. This action can’t be undone. '
    showInfoDialog('question', 'Save changes?', text, 'Cancel', 'Save', async () => {
      await useLoadingSymbol(async () => {
        return await Promise.allSettled([
          getJSON(`/api/fusiondata/${extendableId}/properties/${definition.id}`, 'DELETE'),
        ])
      }); 

      updateView(isComponentLevel);
    });
  }

  const input = row.querySelector("input");
  setInputValues(input, value);
  handleOnInput(input);

  tbody.appendChild(row); 
}

function addPropertiesToTable(table, collection, versionProperties, collectionName) {
  // Component properties should only be editable when the latest
  // version is selected
  const isPropertyEditable = _isTipVersion;

  const thead = document.createElement("thead");
  thead.innerHTML = ` 
    <tr>
      <th class="name-column" scope="col">
        ${collectionName}
      </th>
      <th colspan="3">
        <span class="bi-pencil clickable ${!isPropertyEditable ? "hidden" : ""}" title="Edit property values"></span>
        <span class="bi-x-circle clickable hidden" title="Cancel changes"></span>
        <span class="bi-floppy clickable hidden" title="Save changes"><img src="images/save.svg" width="16px" height="16px" /></span>
      </th>
    </tr>
    <tr style="border-block-color: transparent;">
      <th class="name-column" scope="col"></th>
      <th>Value</th>
      <th>Units</th>
      <th>Action</th>
    </tr>`
  const tbody = document.createElement("tbody");

  const definitions = collection.propertyDefinitions.results;//.filter(item => isComponentLevel === isComponentLevelProperty(item.propertyBehavior))
  if (definitions.length < 1)
    return;

  for (let definition of definitions) {
    addRowToBody(tbody, definition, versionProperties);
  }

  const saveButton = thead.querySelector(".bi-floppy.clickable");
  saveButton.onclick = async () => {
    // Swap active buttons
    for (const button of saveButton.parentElement.children)   
      button.classList.toggle("hidden");

    let componentProperties = [];
    let versionProperties = [];
    for (const input of getInputElements(tbody)) {
      const [oldValue, value] = getInputValues(input);
      const definitionId = input.getAttribute("definitionId");
      const propertyBehavior = input.getAttribute("propertyBehavior");
      if (value !== oldValue) {
        if (isComponentLevelProperty(propertyBehavior)) {
          componentProperties.push({
            propertyDefinitionId: definitionId,
            value
          })
        } else {
          versionProperties.push({
            propertyDefinitionId: definitionId,
            value
          })
        }
      }

      input.toggleAttribute("disabled", true);
    }

    if (componentProperties.length < 1 && versionProperties.length < 1)
      return;

    const text = (componentProperties.length > 0) ?
      'Are you sure you want to save these changes? A new file version will be created as a result. This action can’t be undone.' :
      'Are you sure you want to save these changes? This action can’t be undone. '

    showInfoDialog('question', 'Save changes?', text, 'Cancel', 'Save', async () => {
      let promises = [];
      if (componentProperties.length > 0)
        promises.push(getJSON(`/api/fusiondata/${_itemId}/properties`, 'PUT', JSON.stringify({properties: componentProperties})));

      if (versionProperties.length > 0)
        promises.push(getJSON(`/api/fusiondata/${_versionId}/properties`, 'PUT', JSON.stringify({properties: versionProperties})));
  
      await useLoadingSymbol(async () => {
        return await Promise.allSettled(promises)
      }); 
      
      updateView(componentProperties.length > 0);
    })
  }
  
  const editButton = thead.querySelector(".bi-pencil.clickable");
  editButton.onclick = async () => {
    // Swap active buttons
    for (const button of editButton.parentElement.children)   
      button.classList.toggle("hidden");

    for (const input of getInputElements(tbody)) {
      input.toggleAttribute("disabled", false);
    }
  }

  const cancelButton = thead.querySelector(".bi-x-circle.clickable");
  cancelButton.onclick = async () => {
    // Clear modifications
    for (const input of getInputElements(tbody)) {
      const [oldValue] = getInputValues(input);
      setInputValues(input, oldValue);
      input.toggleAttribute("disabled", true);
    }

    // Swap active buttons
    for (const button of cancelButton.parentElement.children)   
      button.classList.toggle("hidden");
  }
  
  table.appendChild(thead);
  table.appendChild(tbody);
}

function addCollectionTableToPane(propertiesPane, collection, versionProperties) {
  const table = document.createElement("table");
  table.classList.toggle("table", true);
  /*
  table.innerHTML = `
    <thead>
      <tr>
        <th class="name-column" scope="col" colspan="4" style="font-size: 20px; font-weight: bolder;">
          ${collection.name}
        </th>
      </tr>
    </thead>`;
    */

  addPropertiesToTable(table, collection, versionProperties, collection.name);
  //addPropertiesToTable(table, collection, versionProperties);

  propertiesPane.appendChild(table);
}

function addComponentsTableToPane(componentsPane, componentVersions) {
  const table = document.createElement("table");
  table.classList.toggle("table", true);
  table.innerHTML = `
    <thead>
      <tr>
        <th class="name-column" scope="col">Part Name</th>
        <th>Part Number</th>
        <th>Material - Default</th>
      </tr>
    </thead>
    <tbody></tbody>`;

  const tbody = table.querySelector("tbody");

  const addRow = (indent, componentVersion) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="padding-left: ${indent}px;">${componentVersion.name}</td>
      <td>${componentVersion.partNumber}</td>
      <td>${componentVersion.materialName}</td>`;

    //row.classList = "clickable";
    row.componentId = componentVersion.component.id;
    row.componentVersionId = componentVersion.id

    /*
    row.onclick = () => {
      addSubcomponentToBreadcrumbs(row.children[0].textContent);
      _itemId = row.componentId;
      _versionId = row.componentVersionId;
      _itemType = 'component';
      showVersionProperties();
    }
    */

    tbody.appendChild(row);
  }

  const iterate = (componentVersions, componentVersionId, indent) => {
    let subOccurrences = componentVersions.filter(
      item => item.parentComponentVersion.id === componentVersionId);
    for (let occurrence of subOccurrences) {
      addRow(indent, occurrence.componentVersion);
      iterate(componentVersions, occurrence.componentVersion.id, indent + 20);
    }
  }

  iterate(componentVersions, _versionId, 10);

  componentsPane.appendChild(table);  
}

async function showVersionProperties() {
  showThumbnail();

  try {
    console.log("requesting properties for", _itemId, _versionId);

    const [generalProperties, versionProperties, hubCollections, occurrences] = await useLoadingSymbol(async () => {
      return await Promise.allSettled([
        getJSON(`/api/fusiondata/component/${_versionId}/generalproperties`),
        getJSON(`/api/fusiondata/${_versionId}/properties`),
        getJSON(`/api/fusiondata/${_hubUrn}/collections`),
        getJSON(`/api/fusiondata/${_versionId}/alloccurrences`)
      ])
    });

    console.log(hubCollections.value);
    console.log(versionProperties.value);
    console.log(generalProperties.value);
    console.log(occurrences.value);
 
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
        values.manage.itemNumber;
      managePropertiesTable.children[1].children[1].textContent =
        values.manage.lifecycle;
      managePropertiesTable.children[2].children[1].textContent =
        values.manage.revision;
      managePropertiesTable.children[3].children[1].textContent =
        values.manage.changeOrder;
      managePropertiesTable.children[4].children[1].textContent =
        values.manage.changeOrderURN;

      const physicalPropertiesTable = document.getElementById(
        "physicalPropertiesTable"
      );
      const props = values.physicalProperties;
      physicalPropertiesTable.children[0].children[1].textContent =
        formatNumber(props.mass?.value);
      physicalPropertiesTable.children[0].children[2].textContent =
        props.mass?.propertyDefinition?.units?.name || "";
      physicalPropertiesTable.children[1].children[1].textContent =
        formatNumber(props.volume?.value);
      physicalPropertiesTable.children[1].children[2].textContent =
        props.volume?.propertyDefinition?.units?.name || "";
      physicalPropertiesTable.children[2].children[1].textContent =
        formatNumber(props.density?.value);
      physicalPropertiesTable.children[2].children[2].textContent =
        props.density?.propertyDefinition?.units?.name || "";
      physicalPropertiesTable.children[3].children[1].textContent =
        formatNumber(props.area?.value);
      physicalPropertiesTable.children[3].children[2].textContent =
        props.area?.propertyDefinition?.units?.name || "";
      physicalPropertiesTable.children[4].children[1].textContent = `${formatNumber(props.boundingBox?.width?.value)} x ${formatNumber(props.boundingBox?.length?.value)} x ${formatNumber(props.boundingBox?.height?.value)}`;
      physicalPropertiesTable.children[4].children[2].textContent =
        props.boundingBox?.width?.propertyDefinition?.units.name + " x " + props.boundingBox?.length?.propertyDefinition?.units.name + " x " + props.boundingBox?.height?.propertyDefinition?.units.name;
    }

    // Components

    if (occurrences.value) {
      const componentsPane = document.getElementById("componentsPane");
      componentsPane.innerHTML = '';
      addComponentsTableToPane(componentsPane, occurrences.value);
    }

    // Custom Properties tab

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
  const breadCrumbs = _propertiesView.querySelector(".breadcrumb");
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

function removeSubcomponentFromBreadcrumbs() {
  const breadcrumbs = _propertiesView.querySelector(".breadcrumb");
  let breadcrumb = breadcrumbs.querySelector(".subcomponent");
  if (breadcrumb) {
    breadcrumb.remove();
  }
}

export async function onSelectionChanged(
  node,
  type,
  hubUrn,
  itemId,
  versionId,
  isTipVersion,
  lastModifiedOn
) {
  console.log({lastModifiedOn, isTipVersion, versionId});

  abortJSON();

  updateBreadcrumbs(node);

  document.getElementById("versionInfo").classList.toggle("hidden", true);

  clearGeneralProperties();

  if (type === "component") {
    _hubUrn = hubUrn;
    _itemId = itemId;
    _versionId = versionId;
    _itemType = type;
    _isTipVersion = isTipVersion;


    abortJSON();
    clearGeneralProperties();
    removeSubcomponentFromBreadcrumbs();
    if (lastModifiedOn) {
      document.getElementById("lastModifiedOn").textContent = lastModifiedOn;
      document.getElementById("versionInfo").classList.toggle("hidden", false);
    }
    showVersionProperties();
  } else {
    _itemId = null;
    document.getElementById("thumbnail").src = "/images/box-200x200.png";
  }
}