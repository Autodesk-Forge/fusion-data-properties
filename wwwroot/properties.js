import { showOccurrences } from './occurrences.js';

async function getJSON(url, verb = 'GET', body) {
  const resp = await fetch(url, {
    method: verb,
    body: body,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!resp.ok) {
      const err = await resp.json();
      alert(err[0].message);
      console.error(err);
      throw err;
  }
  return resp.json();
}

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

async function showName(fileVersionId, fileName) {
  const versionNumber = fileVersionId.split('?version=');
  document.getElementById('title').innerHTML = `${fileName} (v${versionNumber[1]})`
}

function selectNode(node) {
  const tree = node.tree();
  tree.selectedNode = node;
  tree.selectedNode.focus();
  document.getElementById('propertyName').value = node.name ? node.name : "";
  document.getElementById('propertyValue').value = node.displayValue ? node.displayValue : "";
  document.getElementById('propertyType').value = getPropertyType(node.__typename);
}

export async function showCollections(hubId) {
  const collectionsElem =  document.getElementById('collections');
  const definitionsElem =  document.getElementById('definitions');
  collectionsElem.innerHTML = definitionsElem.innerHTML = '';
  collectionsElem.classList.add("loading");
    const collections = await getJSON(`/api/fusiondata/collections${hubId ? `?hub_id=${encodeURIComponent(hubId)}` : ''}`, 'GET');
  collectionsElem.classList.remove("loading");
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
      //const extendableId = document.getElementById('properties').attributes['extendableId'];
      const collectionName = document.getElementById('propertyName').value; 
      const collection = await getJSON(
        `/api/fusiondata/collections`, 'POST',
        JSON.stringify({ collectionName }));
      group.text = propertyGroupName;
      selectNode(tree.addNode(collection));
    } catch {}
  };

  document.getElementById('createDefinition').onclick = async () => {
    try {
      //const extendableId = document.getElementById('properties').attributes['extendableId'];
      const collectionId = document.getElementById('collections').value
      const definitionName = document.getElementById('propertyName').value; 
      const definitionType = document.getElementById('propertyType').value;
      const definitionDescription = document.getElementById('propertyDescription').value;
      const isHidden = document.getElementById('isHidden').checked;
      const definition = await getJSON(
        `/api/fusiondata/collections/${collectionId}/definitions`, 'POST',
        JSON.stringify({ definitionName, definitionType, definitionDescription, isHidden }));
      
    } catch {}
  };

  document.getElementById('updateDefinition').onclick = async () => {
    try {
      //const extendableId = document.getElementById('properties').attributes['extendableId'];
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
  const definitionsElem =  document.getElementById('definitions');
  definitionsElem.innerHTML = '';
  definitionsElem.classList.add("loading");
    const definitions = await getJSON(`/api/fusiondata/collections/${collectionId}/definitions`, 'GET');
  definitionsElem.classList.remove("loading");
  for (let definition of definitions) {
    definitionsElem.innerHTML += `<option value="${definition.id}">${definition.name}</option>`
  }
}

async function showDefinition() {
  const definitionsElem =  document.getElementById('definitions');
  const definition = await getJSON(`/api/fusiondata/definitions/${definitionsElem.value}`, 'GET');
  
  // show values
  document.getElementById('propertyName').value = definition.name; 
  document.getElementById('propertyType').value = definition.type;
  document.getElementById('propertyDescription').value = definition.description;
  document.getElementById('isHidden').checked = definition.isHidden;
}

export async function showProperties(hubId, projectId, fileVersionId, fileName, extendableId) {
  if (!projectId) {
    showCollections(hubId);
    return;
  }


  if (projectId && fileVersionId) {
    showThumbnail(projectId, fileVersionId);
    showName(fileVersionId, fileName);
  }

  

  document.getElementById('createProperty').onclick = async () => {
    try {
      if (!tree.selectedNode) {
        alert('Select a property or property group!');
        return;
      }

      let groupNode = tree.selectedNode; 
      if (tree.selectedNode.__typename !== NodeType.PropertyGroup) {
        groupNode = groupNode.itree.parent;
      }

      const propertyName = document.getElementById('propertyName').value; 
      const propertyValue = document.getElementById('propertyValue').value; 
      const propertyType = document.getElementById('propertyType').value; 
      const property = await getJSON(
        `/api/fusiondata/${groupNode.id}/properties`, 'POST',
        JSON.stringify({ 
          propertyGroupId: groupNode.id,
          name: propertyName, 
          value: propertyValue,
          type: propertyType
      }));
      groupNode.itree.state.collapsed = false;
      property.text = getPropertyText(property);
      selectNode(groupNode.children.addNode(property));
    } catch {}
  };

  document.getElementById('updateProperty').onclick = async () => {
    try {
      if (!tree.selectedNode || tree.selectedNode.__typename === NodeType.PropertyGroup) {
        alert('Select a property!');
        return;
      }

      let groupNode = tree.selectedNode.itree.parent;
      const propertyName = document.getElementById('propertyName').value; 
      const propertyValue = document.getElementById('propertyValue').value; 
      const propertyType = document.getElementById('propertyType').value; 
      const property = await getJSON(
        `/api/fusiondata/${groupNode.id}/properties/${propertyName}`, 'PUT',
        JSON.stringify({ 
          value: propertyValue,
          type: propertyType
      }));
      tree.selectedNode.value = property.value;
      tree.selectedNode.text = getPropertyText(property);
      tree.selectedNode.focus();
    } catch {}
  };

  document.getElementById('deleteProperty').onclick =async () => {
    try {
      if (!tree.selectedNode || tree.selectedNode.__typename === NodeType.PropertyGroup) {
        alert('Select a property!');
        return;
      }

      let groupNode = tree.selectedNode.itree.parent;
      const propertyName = document.getElementById('propertyName').value; 
      await getJSON(
        `/api/fusiondata/${groupNode.id}/properties/${propertyName}`, 'DELETE'
      );
      let prevVisibleNode = tree.selectedNode.previousVisibleNode();
      tree.selectedNode.remove();
      if (groupNode.children.length < 1) {
        groupNode.collapse();
      } 
      selectNode(prevVisibleNode);
    } catch {}
  };

  // See http://inspire-tree.com
  const tree = new InspireTree({
      data: async function (node) {
          if (!node || !node.id) {
            const propertyGroups = extendableId ?
              await getJSON(`/api/fusiondata/${extendableId}/properties`)
              :
              await getJSON(`/api/fusiondata/${projectId}/${encodeURIComponent(fileVersionId)}/properties`);
            console.log(propertyGroups);
            /*
            for (let group of propertyGroups.propertyGroups.results) {
              for (let property of group.properties) {
                property.text = getPropertyText(property);
              }
              if (group.properties) {
                group.children = group.properties;
                group.itree = {
                  state: {
                    collapsed: group.children.length === 0
                  }
                };
              }
              group.text = group.name;
            }

            document.getElementById('properties').attributes['extendableId'] = propertyGroups.id;
            document.getElementById('properties').classList.remove("loading");
            */

            if (!extendableId)
              showOccurrences(propertyGroups.id);

            return propertyGroups.propertyGroups.results;
          } 
      }
  });
  
  tree.on('node.click', function (event, node) {
    event.preventTreeDefault();
    selectNode(node);
  });

  document.getElementById('properties').classList.add("loading");

  return new InspireTreeDOM(tree, { target: '#properties' });
}