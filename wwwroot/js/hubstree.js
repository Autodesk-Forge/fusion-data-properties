import { wait } from "./utils.js";

let _tree = null;
let _extendableItemId;
let _extendableVersionId;
let _extendableVersionType;

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

function createTreeNode(id, text, icon, children = false, hidden = false) {
  return { id, text, children, itree: { icon, state: { hidden } } };
}

async function getHubs() {
  const hubs = await getJSON("/api/hubs");
  return hubs.map((hub) =>
    createTreeNode(`hub|${hub.id}`, hub.attributes.name, "icon-hub", true)
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

async function getContents(hubUrn, projectUrn, folderId = null, onSelectionChanged) {
  const contents = await getJSON(
    `/api/hubs/${hubUrn}/projects/${projectUrn}/contents` +
      (folderId ? `?folder_id=${folderId}` : "")
  );
  return contents.map((item) => {
    if (item.type === "folders") {
      return createTreeNode(
        `folder|${hubUrn}|${projectUrn}|${item.id}`,
        item.attributes.displayName,
        "icon-my-folder",
        true
      );
    } else {
      const dataUid = `item|${hubUrn}|${projectUrn}|${item.id}`;

      addVersionDropdown(dataUid, hubUrn, projectUrn, item.id);

      return createTreeNode(
        dataUid,
        item.attributes.displayName,
        "icon-item",
        true,
        true // keep it hidden until the version dropdown is added
      );
    }
  });
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
      `component|${hubUrn}|${projectUrn}|${itemUrn}|${item.componentVersion.component.id}|${item.componentVersion.id}`,
      item.componentVersion.name,
      "icon-item",
      true
    );  
  })  
}

async function addVersionDropdown(dataUid, hubUrn, projectUrn, itemUrn, onSelectionChanged) {
  try {
    const response = await getJSON(
      `/api/fusiondata/${projectUrn}/${encodeURIComponent(
        itemUrn
      )}/itemid`,
      "GET"
    );
    
    const versions = await getJSON(
      `/api/hubs/${hubUrn}/projects/${projectUrn}/contents/${itemUrn}/versions`
    );

    const item = document.querySelector(`a[data-uid="${dataUid}"]`);
    const versionsList = document.createElement("select");
    versionsList.classList = "float-right version-list";
    versionsList.setAttribute("data-uid", dataUid);
    versionsList.itemId = response.id;

    const listItems = versions.map((version) => {
      const lastModifiedOn = version.attributes.lastModifiedTime.split("T")[0];
      return `<option value="${version.id}" lastModifiedOn="${lastModifiedOn}">v${version.attributes.versionNumber}</option>`;
    });
    versionsList.innerHTML = listItems.join();

    versionsList.onchange = async (event) => {
      const selectedVersion = versionsList.selectedOptions[0];
      if (!selectedVersion.versionId) {
        const versionInfo = await getJSON(
          `/api/fusiondata/${projectUrn}/${encodeURIComponent(
            versionsList.value
          )}/versionid`,
          "GET"
        );

        selectedVersion.versionId = versionInfo.versionId;
      }

      //onSelectionChanged("version", )
      console.log("versionsList.onchange: " + selectedVersion.versionId);
    }

    item.appendChild(versionsList);

    versionsList.onchange();
  } finally {
    // Unhide the tree node
    //const node = document.querySelector(`li[data-uid="${dataUid}"]`);
    //node.classList.toggle("hidden", false);
    const node = _tree._tree.node(dataUid);
    node.show();
  }
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

  tree.on("data.loaded", async function (event, node) {
    do {
      await wait(.1);
    } while (document.getElementsByClassName("title icon icon-hub").length < 1)

    for (let item of document.getElementsByClassName("title icon icon-hub")) {
      item.innerHTML +=
        '<span class="bi-link-45deg link-icon hidden" title="Hub has linked property collections"></span><span class="float-right bi-three-dots clickable"></span>';
      item.getElementsByClassName("float-right")[0].onclick = (event) => {
        onHubButtonClicked(event);
      };
    }

    showLinkIconForHubsWithLinkedCollections();
  });

  tree.on("node.click", function (event, node) {
    event.preventTreeDefault();
    const [type, hubUrn, projectUrn, itemUrn, itemId, versionId] = node.id.split("|");
    if (type === "item") {
      const versionsList = document.querySelector(`select[data-uid="${node.id}"]`);
      const isTipVersion = versionsList.options[0].value === versionsList.value;
      const selectedVersion = versionsList.selectedOptions[0];
      console.log(versionsList.value);
      //versionsList.onchange();
      onSelectionChanged(node, "component", hubUrn, versionsList.itemId, selectedVersion.versionId, isTipVersion, "2023-03-03"); 
    } else if (type === "component") {
      //versionsList.onchange();
      const itemNodeId = `item|${hubUrn}|${projectUrn}|${itemUrn}`; 
      const versionsList = document.querySelector(`select[data-uid="${itemNodeId}"]`);
      const isTipVersion = versionsList.options[0].value === versionsList.value;
      onSelectionChanged(node, "component", hubUrn, itemId, versionId, isTipVersion, "2023-03-03"); 
    } else {
      onSelectionChanged(node, type);
    }
  });

  _tree = new InspireTreeDOM(tree, { target: selector });

  return _tree;
}
