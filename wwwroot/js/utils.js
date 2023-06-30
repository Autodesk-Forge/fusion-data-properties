let _controller;

export function wait(seconds) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, 1000 * seconds);
  });
}

export function formatString(text) {
  // Turn e.g. "DYNAMIC_AT_VERSION" to "Dynamic at version"
  return (text.charAt(0) + text.slice(1).toLowerCase()).replaceAll("_", " ");
}

export function disableElements(ids, disable) {
  for (let id of ids) {
    const elem = document.getElementById(id);
    if (elem.hasAttribute("disabled") && !disable) {
      elem.removeAttribute("disabled");
    } else if (!elem.hasAttribute("disabled") && disable) {
      elem.setAttribute("disabled", "");
    }
  }
}

export function toYesOrNo(value) {
  return value === true ? "Yes" : "No";
}

export function toNonEmpty(value) {
  return value !== undefined ? value : "-";
}

export async function getJSON(url, verb = "GET", body) {
  _controller = new AbortController();
  const { signal } = _controller;

  const resp = await fetch(url, {
    signal,
    method: verb,
    body: body,
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const err = await resp.json();
    console.error(err);
    throw err;
  }
  return resp.json();
}

export async function useLoadingSymbol(func) {
  const element = document.getElementById("loadingSign");
  element.classList.remove("hidden");
  try {
    return await func();
  } finally {
    element.classList.add("hidden");
  }
}

export function showView(viewId, breadcrumbText, breadcrumbCallback) {
  let oldViewId;
  let views = document.getElementsByClassName("view");
  for (let view of views) {
    if (!view.classList.contains("hidden")) {
      oldViewId = view.id;
      view.classList.add("hidden");
      break;
    }
  }

  let view = document.getElementById(viewId);
  view.classList.remove("hidden");

  if (oldViewId !== viewId) {
    // if we are chaning view then any data load it triggered should be cancelled
    if (_controller) {
      _controller.abort();
      _controller = null;
    }

    if (view.onload) {
      view.onload();
    }
  }

  if (!breadcrumbText) return;

  const breadCrumb = view.getElementsByClassName("breadcrumb-text")[0];
  breadCrumb.textContent = breadcrumbText;
  breadCrumb.onclick = breadcrumbCallback;
}
