import { showProperties } from './properties.js';

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

export async function showOccurrences(componentVersionId) {
  // See http://inspire-tree.com
  const tree = new InspireTree({
      data: async function (node) {
          if (node && node.id) 
            componentVersionId = node.id;

          const occurrences = await getJSON(`/api/fusiondata/${componentVersionId}/occurrences`);
          console.log(occurrences);

          let results = occurrences.map(item => { return {
            id: item.componentVersion.id,
            text: item.componentVersion.name,
            children: true
          }})
          
          //document.getElementById('properties').attributes['extendableId'] = propertyGroups.id;
          document.getElementById('occurrences').classList.remove("loading");

          return results;
      }
  });
  
  tree.on('node.click', function (event, node) {
    event.preventTreeDefault();
    //selectNode(node);
    showProperties(null, null, null, node.id);
  });

  document.getElementById('occurrences').classList.add("loading");

  return new InspireTreeDOM(tree, { target: '#occurrences' });
}