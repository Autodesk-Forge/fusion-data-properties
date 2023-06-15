import { showOccurrences } from './_occurrences.js';
import { getJSON, useLoadingSymbol } from './utils.js';

const NodeType = {
  PropertyGroup: 'PropertyGroup',
  Property: 'Property'
}

function getPropertyText(property) {
  return `${property.name} = ${property.displayValue}`
}

function getPropertyType(typename) {
  if (typename === NodeType.PropertyGroup)
    return "";

  return typename.replace(NodeType.Property, "");
}

async function showThumbnail(projectId, fileVersionId) {
  document.getElementById('thumbnail').src = 
    `/api/fusiondata/${projectId}/${encodeURIComponent(fileVersionId)}/thumbnail`;
}

async function storeId(type, projectId, fileItemOrVersionId) {
  const response = await getJSON(
    `/api/fusiondata/${projectId}/${encodeURIComponent(fileItemOrVersionId)}/${type}id`, 'GET');

  document.getElementById('properties').attributes['extendableId'] = response.id;
  console.log(`Selected item's ID: ${response.id}`);
}

async function clearId() {
  document.getElementById('properties').attributes['extendableId'] = undefined;
}

async function showName(fileVersionId, fileName) {
  const versionNumber = fileVersionId.split('?version=');
  document.getElementById('title').innerHTML = `${fileName} (v${versionNumber[1]})`
}

export async function showCollections(hubId) {
  const collectionsElem =  document.getElementById('collections');
  const definitionsElem =  document.getElementById('definitions');
  collectionsElem.innerHTML = definitionsElem.innerHTML = '';
  const collections = await useLoadingSymbol(async () => {
    return await getJSON(`/api/fusiondata/collections${hubId ? `?hub_id=${encodeURIComponent(hubId)}` : ''}`, 'GET')
  }, 'collections'); 
  for (let collection of collections) {
    collectionsElem.innerHTML += `<option value="${collection.id}">${collection.name}</option>`
  }

  collectionsElem.onchange = (event) => {
    showDefinitions(event.target.value);
  }

  definitionsElem.onchange = (event) => {
    showDefinition(event.target.value);
  }

  document.getElementById('createCollection').onclick = async () => {
    try {
      const collectionName = document.getElementById('propertyName').value; 
      const collection = await getJSON(
        `/api/fusiondata/collections`, 'POST',
        JSON.stringify({ collectionName }));

      showCollections(hubId);
    } catch {}
  };

  document.getElementById('createDefinition').onclick = async () => {
    try {
      const collectionId = document.getElementById('collections').value
      const definitionName = document.getElementById('propertyName').value; 
      const definitionType = document.getElementById('propertyType').value;
      const definitionDescription = document.getElementById('propertyDescription').value;
      const isHidden = document.getElementById('isHidden').checked;
      const definition = await getJSON(
        `/api/fusiondata/collections/${collectionId}/definitions`, 'POST',
        JSON.stringify({ definitionName, definitionType, definitionDescription, isHidden }));
      
       showDefinitions(collectionId); 

    } catch {}
  };

  document.getElementById('updateDefinition').onclick = async () => {
    try {
      const definitionId = document.getElementById('definitions').value
      const definitionDescription = document.getElementById('propertyDescription').value;
      const isHidden = document.getElementById('isHidden').checked;
      const definition = await getJSON(
        `/api/fusiondata/definitions/${definitionId}`, 'PUT',
        JSON.stringify({ definitionDescription, isHidden }));
      
    } catch {}
  };
}

async function showDefinitions(collectionId) {
  console.log(`Selected collection's ID: ${collectionId}`);

  const definitionsElem =  document.getElementById('definitions');
  definitionsElem.innerHTML = '';
  const definitions = await useLoadingSymbol(async () => {
    return await getJSON(`/api/fusiondata/collections/${collectionId}/definitions`, 'GET')
  }, 'definitions');
  for (let definition of definitions) {
    definitionsElem.innerHTML += `<option value="${definition.id}">${definition.name}</option>`
  }
}

async function showDefinition() {
  const definitionsElem =  document.getElementById('definitions');
  console.log(`Selected definition's ID: ${definitionsElem.value}`);

  const definition = await getJSON(`/api/fusiondata/definitions/${definitionsElem.value}`, 'GET');
  
  // show values
  document.getElementById('propertyName').value = definition.name; 
  document.getElementById('propertyType').value = definition.type;
  document.getElementById('propertyDescription').value = definition.description;
  document.getElementById('isHidden').checked = definition.isHidden;
}

async function showProperties() {
  const propertiesElem =  document.getElementById('properties');
  propertiesElem.innerHTML = '';
  const properties = await useLoadingSymbol(async () => {
    const extendableId = propertiesElem.attributes['extendableId'];
    return await getJSON(`/api/fusiondata/${extendableId}/properties`);
  }, 'properties');

  for (let property of properties) {
    propertiesElem.innerHTML += 
      `<option 
        id="${property.propertyDefinition.id}" 
        value="${property.value}" 
        type="${property.propertyDefinition.type}" 
        isHidden="${property.propertyDefinition.isHidden}" 
        description="${property.propertyDefinition.description}">${property.propertyDefinition.name}
      </option>`
  }

  propertiesElem.onchange = (event) => {
    showProperty(event.target.selectedOptions[0]);
  }
}

async function showProperty(propertyElem) {
  const definitionId = propertyElem.getAttribute('id');
  console.log(`Selected property's definition ID: ${definitionId}`);

  document.getElementById('propertyName').value = propertyElem.text;
  document.getElementById('propertyValue').value = propertyElem.getAttribute('value');
  document.getElementById('propertyType').value = propertyElem.getAttribute('type');
  document.getElementById('propertyDescription').value = propertyElem.getAttribute('description');
  document.getElementById('isHidden').checked = propertyElem.getAttribute('isHidden') === 'true';
}

export async function initPropertiesControl(type, hubId, projectId, fileItemVersionId, fileName) {
   if (type === 'hub') {
    showCollections(hubId);
    return;
   }

   if (type !== 'version' && type !== 'item') {
    clearId();
    return;
   }

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

  // // See http://inspire-tree.com
  // const tree = new InspireTree({
  //     data: async function (node) {
  //         if (!node || !node.id) {
  //           const propertyGroups = extendableId ?
  //             await getJSON(`/api/fusiondata/${extendableId}/properties`)
  //             :
  //             await getJSON(`/api/fusiondata/${projectId}/${encodeURIComponent(fileVersionId)}/properties`);
  //           console.log(propertyGroups);
  //           /*
  //           for (let group of propertyGroups.propertyGroups.results) {
  //             for (let property of group.properties) {
  //               property.text = getPropertyText(property);
  //             }
  //             if (group.properties) {
  //               group.children = group.properties;
  //               group.itree = {
  //                 state: {
  //                   collapsed: group.children.length === 0
  //                 }
  //               };
  //             }
  //             group.text = group.name;
  //           }

  //           document.getElementById('properties').attributes['extendableId'] = propertyGroups.id;
  //           document.getElementById('properties').classList.remove("loading");
  //           */

  //           if (!extendableId)
  //             showOccurrences(propertyGroups.id);

  //           return propertyGroups.propertyGroups.results;
  //         } 
  //     }
  // });
  
  // tree.on('node.click', function (event, node) {
  //   event.preventTreeDefault();
  //   selectNode(node);
  // });

  // document.getElementById('properties').classList.add("loading");

  // return new InspireTreeDOM(tree, { target: '#properties' });
}