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

async function getProjects(hubId) {
  const projects = await getJSON(`/api/hubs/${hubId}/projects`);
  return projects.map((project) =>
    createTreeNode(
      `project|${hubId}|${project.id}`,
      project.attributes.name,
      "icon-project",
      true
    )
  );
}

async function getContents(hubId, projectId, folderId = null, onSelectionChanged) {
  const contents = await getJSON(
    `/api/hubs/${hubId}/projects/${projectId}/contents` +
      (folderId ? `?folder_id=${folderId}` : "")
  );
  return contents.map((item) => {
    if (item.type === "folders") {
      return createTreeNode(
        `folder|${hubId}|${projectId}|${item.id}`,
        item.attributes.displayName,
        "icon-my-folder",
        true
      );
    } else {
      const dataUid = `item|${hubId}|${projectId}|${item.id}`;

      addVersionDropdown(dataUid, hubId, projectId, item.id);

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

async function getComponents(hubId, projectId, itemId, dataUid) {
  // which version is selected
  const versionsList = document.querySelector(`select[data-uid="${dataUid}"]`);
  const versionUrn = versionsList.value;

  const versionInfo = await getJSON(
    `/api/fusiondata/${projectId}/${encodeURIComponent(
      versionUrn
    )}/versionid`,
    "GET"
  );

  _extendableItemId = versionInfo.itemId;
  _extendableVersionId = versionInfo.versionId;
  _extendableVersionType = versionInfo.type;

  return getSubComponents(_extendableVersionId);
}

async function getSubComponents(versionId) {
  const response = await getJSON(
    `/api/fusiondata/${versionId}/occurrences`,
    "GET"
  );

  return response.map(item => {
    return createTreeNode(
      `component|${item.componentVersion.id}`,
      item.componentVersion.name,
      "icon-item",
      true
    );  
  })  
}

async function addVersionDropdown(dataUid, hubId, projectId, itemId, onSelectionChanged) {
  try {
    const response = await getJSON(
      `/api/fusiondata/${projectId}/${encodeURIComponent(
        itemId
      )}/itemid`,
      "GET"
    );
    
    const versions = await getJSON(
      `/api/hubs/${hubId}/projects/${projectId}/contents/${itemId}/versions`
    );

    const item = document.querySelector(`a[data-uid="${dataUid}"]`);
    const versionsList = document.createElement("select");
    versionsList.classList = "float-right version-list";
    versionsList.setAttribute("data-uid", dataUid);
    versionsList.componentId = response.id;

    const listItems = versions.map((version) => {
      const lastModifiedOn = version.attributes.lastModifiedTime.split("T")[0];
      return `<option value="${version.id}" lastModifiedOn="${lastModifiedOn}">v${version.attributes.versionNumber}</option>`;
    });
    versionsList.innerHTML = listItems.join();

    versionsList.onchange = (event) => {
      //onSelectionChanged("version", )
      console.log("versionsList.onchange: " + versionsList.value);
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
        const hubId = hub.getAttribute('data-uid').split('|')[1];
        const collections = await getJSON(`/api/fusiondata/${hubId}/collections?minimal=true`);

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
        const tokens = node.id.split("|");
        switch (tokens[0]) {
          case "hub":
            return getProjects(tokens[1]);
          case "project":
            return getContents(tokens[1], tokens[2], null, onSelectionChanged);
          case "folder":
            return getContents(tokens[1], tokens[2], tokens[3], onSelectionChanged);
          case "item":
              return getComponents(tokens[1], tokens[2], tokens[3], node.id);
          case "component":
              return getSubComponents(tokens[1]);
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
    const tokens = node.id.split("|");
    if (tokens[0] === "version") {
      for (
        var projectNode = node;
        !projectNode.id.startsWith("project");
        projectNode = projectNode.itree.parent
      ) {}
      const tokens2 = projectNode.id.split("|");
      onSelectionChanged(
        node,
        tokens[0],
        tokens2[1],
        tokens2[2],
        tokens[1]
      );
    } else if (tokens[0] === "item") {
      const versionList = document.querySelector(`select[data-uid="${node.id}"]`);
      console.log(versionList.value);
      //versionList.onchange();
      /*
      for (
        var projectNode = node;
        !projectNode.id.startsWith("project");
        projectNode = projectNode.itree.parent
      );
      const tokens2 = projectNode.id.split("|");
      onSelectionChanged(
        node,
        tokens[0],
        tokens2[1],
        tokens2[2],
        tokens[3]
      );
      */
    } else if (tokens[0] === "hub") {
      onSelectionChanged(node, tokens[0], tokens[1]);
    } else {
      onSelectionChanged(node, tokens[0]);
    }
  });

  _tree = new InspireTreeDOM(tree, { target: selector });

  return _tree;
}
