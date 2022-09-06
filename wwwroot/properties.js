async function getJSON(url, verb = 'GET', body) {
  const resp = await fetch(url, {
    method: verb,
    body: body,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!resp.ok) {
      alert('Could not load tree data. See console for more details.');
      console.error(await resp.text());
      throw "getJSON failed";
  }
  return resp.json();
}

async function showThumbnail(projectId, fileVersionId) {
  document.getElementById('thumbnail').src = 
    `/api/fusiondata/${projectId}/${encodeURIComponent(fileVersionId)}/thumbnail`;
}

async function showName(fileVersionId, fileName) {
  const versionNumber = fileVersionId.split('?version=');
  document.getElementById('title').innerHTML = `${fileName} (v${versionNumber[1]})`
}

export async function showProperties(projectId, fileVersionId, fileName) {
  showThumbnail(projectId, fileVersionId);
  showName(fileVersionId, fileName);

  document.getElementById('createGroup').onclick = async () => {
    const extendableId = document.getElementById('properties').attributes['extendableId'];
    const propertyGroupName = document.getElementById('propertyName').value; 
    const group = await getJSON(
      `/api/fusiondata/${extendableId}/propertygroups`, 'POST',
      JSON.stringify({ propertyGroupName }));
    group.text = propertyGroupName;
    const node = tree.addNode(group);
    node.focus();
  };

  document.getElementById('createProperty').onclick = async () => {
    if (tree.node) {

    }

    const extendableId = document.getElementById('properties').attributes['extendableId'];
    const propertyGroupName = document.getElementById('propertyName').value; 
    const group = await getJSON(
      `/api/fusiondata/${extendableId}/propertygroups`, 'POST',
      JSON.stringify({ propertyGroupName }));
    group.text = propertyGroupName;
    tree.addNode(group);
  };
  document.getElementById('updateProperty').onclick =
  document.getElementById('deleteProperty').onclick =
  (evnt) => {
    alert("hello");
  };

  // See http://inspire-tree.com
  const tree = new InspireTree({
      data: async function (node) {
          if (!node || !node.id) {
            const propertyGroups = await getJSON(`/api/fusiondata/${projectId}/${encodeURIComponent(fileVersionId)}/properties`);
            console.log(propertyGroups);
            for (let group of propertyGroups.propertyGroups.results) {
              for (let property of group.properties) {
                property.text = `${property.name} = ${property.displayValue}`;
              }
              group.children = group.properties ? group.properties : undefined;
              group.text = group.name;
              group.itree = {
                state: {
                  collapsed: group.children.length === 0
                }
              };
            }

            document.getElementById('properties').attributes['extendableId'] = propertyGroups.id;
            
            return propertyGroups.propertyGroups.results;
          } 
      }
  });
  tree.on('node.click', function (event, node) {
    event.preventTreeDefault();
    document.getElementById('propertyName').value = node.text ? node.text : "";
    document.getElementById('propertyValue').value = node.displayValue ? node.displayValue : "";
    document.getElementById('propertyType').value = node.__typename === "PropertyGroup" ? "" : node.__typename.replace("Property", "");
  });
  return new InspireTreeDOM(tree, { target: '#properties' });
}