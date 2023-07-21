import { wait } from "./utils.js";

let _tree = null;

async function getJSON(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.log(await resp.text());
      return [];
    }
    return resp.json();
  } catch (err) {
    console.log(err);
    return [];
  }
}

function createTreeNode(id, text, icon, children = false, hidden = false, data = null) {
  let node = { id, text, children, itree: { icon, state: { hidden } } };

  if (data) {
    node = {
      ...node,
      ...data
    }
  }

  return node;
}

async function getHubs() {
  const hubs = await getJSON("/api/hubs");
  return hubs.map((hub) =>
    createTreeNode(`hub|${hub.id}`, hub.attributes.name, "icon-hub", true, false, { customData: "blabla" })
  );
}

async function getProjects(hubUrn) {
  const projects = await getJSON(`/api/hubs/${hubUrn}/projects`);
  return projects.map((project) =>
    createTreeNode(
      `project|${hubUrn}|${project.id}`,
      project.attributes.name,
      "icon-project",
      true
    )
  );
}

async function fetchDataForItemNode(item, hubUrn, projectUrn) {
  return new Promise(async (resolve) => {
    if (item.type === "folders") {
      resolve(createTreeNode(
        `folder|${hubUrn}|${projectUrn}|${item.id}`,
        item.attributes.displayName,
        "icon-my-folder",
        true
      ));
      return;
    } 

    const [itemJson, versionsJson] = await Promise.all([
      getJSON(
        `/api/fusiondata/${projectUrn}/${encodeURIComponent(
          item.id
        )}/itemid`,
        "GET"
      ),
      getJSON(
        `/api/hubs/${hubUrn}/projects/${projectUrn}/contents/${item.id}/versions`
      )
    ]);

    resolve(createTreeNode(
      `item|${hubUrn}|${projectUrn}|${item.id}`,
      item.attributes.displayName,
      "icon-item",
      true,
      false, //true // keep it hidden until the version dropdown is added
      {
        itemId: itemJson.id,
        versions: versionsJson
      }
    ));
  })
}

async function getContents(hubUrn, projectUrn, folderUrn = null, onSelectionChanged) {
  const contents = await getJSON(
    `/api/hubs/${hubUrn}/projects/${projectUrn}/contents` +
      (folderUrn ? `?folder_id=${folderUrn}` : "")
  );

  const res = await Promise.all(contents.map((item) => {
    return fetchDataForItemNode(item, hubUrn, projectUrn);
  }));

  return res;
}

async function getComponents(hubUrn, projectUrn, itemUrn, dataUid) {
  // which version is selected
  const versionsList = document.querySelector(`select[data-uid="${dataUid}"]`);
  const selectedVersion = versionsList.selectedOptions[0];

  return getSubComponents(hubUrn, projectUrn, itemUrn, selectedVersion.versionId);
}

async function getSubComponents(hubUrn, projectUrn, itemUrn, versionId) {
  const response = await getJSON(
    `/api/fusiondata/${versionId}/occurrences`,
    "GET"
  );

  return response.map(item => {
    return createTreeNode(
      `component|${hubUrn}|${projectUrn}|${itemUrn}|${item.componentVersion.component.id}|${item.componentVersion.id}|${item.componentVersion.component.tipVersion.id}`,
      item.componentVersion.name,
      "icon-item",
      true,
      false,
      {
        lastModifiedOn: item.componentVersion.lastModifiedOn
      }
    );  
  })  
}

async function preventSelection(node, callback) {
  try {
    node.state('selectable', false);
    await callback();
  } finally {
    node.state('selectable', true);
  }
}

async function addVersionDropdown(dataUid, hubUrn, projectUrn, itemUrn, onSelectionChanged) {

  const item = document.querySelector(`a[data-uid="${dataUid}"]`);
  const itemNode = _tree._tree.node(dataUid);

  const versionsList = document.createElement("select");
  versionsList.classList = "float-right version-list";
  versionsList.setAttribute("data-uid", dataUid);
  versionsList.itemId = itemNode.itemId;
  versionsList.onSelectionChanged = onSelectionChanged;

  const listItems = itemNode.versions.map((version) => {
    const lastModifiedOn = version.attributes.lastModifiedTime.split("T")[0];
    return `<option value="${version.id}" lastModifiedOn="${lastModifiedOn}">v${version.attributes.versionNumber}</option>`;
  });
  versionsList.innerHTML = listItems.join();

  versionsList.onclick = async (event) => {
    console.log("versionsList.onclick")

    event.stopPropagation();
  }

  versionsList.onchange = async (event) => {
    console.log("versionsList.onchange")

    const selectedNode = _tree._tree.selected()[0];
    const selectedVersion = versionsList.selectedOptions[0];
    if (!selectedVersion.versionId) {
      console.log("fetching versionId");

      await preventSelection(itemNode, async () => {
        const versionInfo = await getJSON(
          `/api/fusiondata/${projectUrn}/${encodeURIComponent(
            versionsList.value
          )}/versionid`,
          "GET"
        );

        selectedVersion.versionId = versionInfo.versionId;
        selectedVersion.tipVersionId = versionInfo.tipVersionId;
      })
    }

    console.log("versionsList.onchange: " + selectedVersion.versionId);

    // Reload if it already has children
    if (itemNode.hasChildren())
      await itemNode.reload();

    // Have we changed the version on the selected node or its "item" parent?
    if (!selectedNode)
      return;

    const [selType, , , selItemUrn, selItemId] = selectedNode?.id?.split("|");
    if (itemUrn === selItemUrn) {
      // If the selected node is a component
      if (selType === 'component') {
        //const newSelectedNode = await _tree._tree.search(`/|${selItemId}|/g`);
        let s = "sadd";
      }

      // Notify properties page 
      const isTipVersion = (selectedVersion.versionId === selectedVersion.tipVersionId);  //versionsList.options[0].value === versionsList.value;
      const lastModifiedOn = selectedVersion.getAttribute("lastModifiedOn");
      onSelectionChanged(selectedNode, "component", hubUrn, versionsList.itemId, selectedVersion.versionId, isTipVersion, lastModifiedOn); 
    }
  }

  item.appendChild(versionsList);

  versionsList.onchange();
}

export async function updateVersionsList() {
  const selectedNode = _tree._tree.selected()[0];
  let itemNode = selectedNode;
  const [, hubUrn, projectUrn, itemUrn] = selectedNode.id.split("|");
  let dataUid = selectedNode.id;

  if (selectedNode.id.startsWith("component")) {
    dataUid = `item|${hubUrn}|${projectUrn}|${itemUrn}`;
    itemNode = _tree._tree.node(dataUid);
  }

  itemNode.versions = await getJSON(
    `/api/hubs/${hubUrn}/projects/${projectUrn}/contents/${itemUrn}/versions`
  );

  const versionsList = document.querySelector(`select[data-uid="${dataUid}"]`);
  const onSelectionChanged = versionsList.onSelectionChanged;
  versionsList.remove();

  addVersionDropdown(dataUid, hubUrn, projectUrn, itemUrn, onSelectionChanged);
} 

export async function showLinkIconForHubsWithLinkedCollections() {
    try {
      const hubs = document.querySelectorAll(`a.icon-hub`);
      for (let hub of hubs) {
        const hubUrn = hub.getAttribute('data-uid').split('|')[1];
        const collections = await getJSON(`/api/fusiondata/${hubUrn}/collections?minimal=true`);

        const link = hub.querySelector(`span.link-icon`);
        if (collections.length < 1) {
          link.classList.toggle("hidden", true);
          continue;
        }
  
        link.classList.toggle("hidden", false);
      }
    } catch (error) {
      console.log(error);
    }
}

export function initTreeControl(
  selector,
  onSelectionChanged,
  onHubButtonClicked
) {
  // Waiting for the hubs to appear to we can add button and link icon to them
  const observer = new MutationObserver((mutationList, observer) => {
    console.log("observer")

    const hubNodes = document.getElementsByClassName("title icon icon-hub");

    if (hubNodes.length > 1) {
      for (let item of hubNodes) {
        item.innerHTML +=
          '<span class="bi-link-45deg link-icon hidden" title="Hub has linked property collections"></span><span class="float-right bi-three-dots clickable"></span>';
        item.getElementsByClassName("float-right")[0].onclick = (event) => {
          onHubButtonClicked(event);
        };
      }
  
      showLinkIconForHubsWithLinkedCollections();
  
      observer.disconnect();
    }
  });

  const treeElement = document.querySelector(selector);
  observer.observe(treeElement, {
    childList: true, 
    subtree: true
  })



  // See http://inspire-tree.com
  const tree = new InspireTree({
    data: function (node) {
      if (!node || !node.id) {
        return getHubs();
      } else {
        const [type, hubUrn, projectUrn, itemUrn, itemId, versionId] = node.id.split("|");
        switch (type) {
          case "hub":
            return getProjects(hubUrn);
          case "project":
            return getContents(hubUrn, projectUrn, null, onSelectionChanged);
          case "folder":
            return getContents(hubUrn, projectUrn, itemUrn, onSelectionChanged);
          case "item":
              return getComponents(hubUrn, projectUrn, itemUrn, node.id);
          case "component":
              return getSubComponents(hubUrn, projectUrn, itemUrn, versionId);
          default:
            return [];
        }
      }
    },
  });

  tree.on("children.loaded", async function (node) {
    console.log("children.loaded")
    for (let child of node.children) {
      if (!child.id.startsWith("item"))
        continue;

      const [, hubUrn, projectUrn, itemUrn] = child.id.split("|");
      addVersionDropdown(child.id, hubUrn, projectUrn, itemUrn, onSelectionChanged);  
    }

  })

  tree.on("node.click", function (event, node) {
    if (!node.itree.state.selectable)
      return;

    node.select();

    event.preventTreeDefault();
    const [type, hubUrn, projectUrn, itemUrn, itemId, versionId, tipVersionId] = node.id.split("|");
    if (type === "item") {
      const versionsList = document.querySelector(`select[data-uid="${node.id}"]`);
      const isTipVersion = versionsList.options[0].value === versionsList.value;
      const selectedVersion = versionsList.selectedOptions[0];
      const lastModifiedOn = selectedVersion.getAttribute("lastModifiedOn");
      console.log(versionsList.value);
      onSelectionChanged(node, "component", hubUrn, versionsList.itemId, selectedVersion.versionId, isTipVersion, lastModifiedOn); 
    } else if (type === "component") {
      const isTipVersion = (versionId === tipVersionId);
      const lastModifiedOn = null;
      onSelectionChanged(node, "component", hubUrn, itemId, versionId, isTipVersion, lastModifiedOn); 
    } else {
      onSelectionChanged(node, type);
    }
  });

  _tree = new InspireTreeDOM(tree, { target: selector });

  return _tree;
}
