//import { getJSON } from "./utils";

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


function createTreeNode(id, text, icon, children = false) {
  return { id, text, children, itree: { icon } };
}

async function getHubs() {
  const hubs = await getJSON("/api/hubs");
  showHubsWithLinkedCollections(hubs);
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

async function getContents(hubId, projectId, folderId = null) {
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
      return createTreeNode(
        `item|${hubId}|${projectId}|${item.id}`,
        item.attributes.displayName,
        "icon-item",
        false
      );
    }
  });
}

async function showHubsWithLinkedCollections(hubs) {
  for (let hub of hubs) {
    try {
      const collections = await getJSON(`/api/fusiondata/${hub.id}/collections`);
      if (collections.length < 1) continue;

      const node = document.querySelector(`a[data-uid="hub|${hub.id}"]>span.link-icon`);
      if (!node) continue;

      node.classList.remove("hidden");
    } catch (error) {
      console.log(error);
    }
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
            return getContents(tokens[1], tokens[2]);
          case "folder":
            return getContents(tokens[1], tokens[2], tokens[3]);
          default:
            return [];
        }
      }
    },
  });

  tree.on("data.loaded", function (event, node) {
    setTimeout(() => {
      for (let item of document.getElementsByClassName("title icon icon-hub")) {
        item.innerHTML +=
          '<span class="bi-link-45deg link-icon hidden"></span><span class="float-right bi-three-dots clickable"></span>';
        item.getElementsByClassName("float-right")[0].onclick = (event) => {
          onHubButtonClicked(event);
        };
      }
    }, 100);
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
        tokens[3]
      );
    } else if (tokens[0] === "hub") {
      onSelectionChanged(node, tokens[0], tokens[1]);
    } else {
      onSelectionChanged(node, tokens[0]);
    }
  });
  return new InspireTreeDOM(tree, { target: selector });
}
