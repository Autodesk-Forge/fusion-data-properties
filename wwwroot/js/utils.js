let _controllers = new Set();
let _useLoadingSymbolCounter = 0;

// Brave has both Safari and Chrome, so if Chrome is there we don't check for others
export let isSafariFirefox = 
  navigator.userAgent.match(/chrome/i) ? 
    false : 
    navigator.userAgent.match(/firefox|fxios|safari/i) !== "";

export function wait(seconds) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, 1000 * seconds);
  });
}

export function formatString(text) {
  // Turn e.g. "DYNAMIC_AT_VERSION" to "Dynamic at version"
  return (text.charAt(0) + text.slice(1).toLowerCase()).replaceAll("_", " ");
}

export function formatNumber(num) {
  if (!num)
    return "";
    
  return num.toFixed(2);
}

export function disableElements(ids, disable) {
  for (let id of ids) {
    const elem = document.getElementById(id);
    elem.toggleAttribute("disabled", disable);
  }
}

export function toYesOrNo(value) {
  return value === true ? "Yes" : "No";
}

export function toNonEmpty(value) {
  return value !== undefined ? value : "-";
}

export async function getJSON(url, verb = "GET", body) {
  const controller = new AbortController();
  const { signal } = controller;
  _controllers.add(controller);

  try {
    const resp = await fetch(url, {
      signal,
      method: verb,
      body: body,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.log(`failed request: ${verb} ${url}`, err);
      throw err;
    }
    return resp.json();
  } finally {
    _controllers.delete(controller);
  }
}

export async function useLoadingSymbol(func) {
  console.log("useLoadingSymbol")
  const element = document.getElementById("loadingSign");
  _useLoadingSymbolCounter++;
  element.classList.toggle("hidden", false);
  try {
    return await func();
  } finally {
    console.log("useLoadingSymbol -> finally")
    _useLoadingSymbolCounter--;
    element.classList.toggle("hidden", _useLoadingSymbolCounter < 1);
  }
}

export function abortJSON() {
  if (_controllers.size < 1)
    return;

  if (_controllers.size > 1) {
    console.log("Multiple JSON requests to abort")
  } else {
    console.log("Single JSON request to abort")
  }

  for (let controller of _controllers) {
    controller.abort();
  }

  _controllers.deleteAll();
}

export function showView(viewId, breadcrumbText, breadcrumbCallback) {
  let oldViewId;
  let views = document.getElementsByClassName("view");
  for (let view of views) {
    if (!view.classList.contains("hidden")) {
      oldViewId = view.id;
      view.classList.toggle("hidden", true);
      break;
    }
  }

  let view = document.getElementById(viewId);
  view.classList.toggle("hidden", false);

  if (oldViewId !== viewId) {
    // if we are chaning view then any data load it triggered should be cancelled
    abortJSON();

    if (view.onload) {
      view.onload();
    }
  }

  if (!breadcrumbText) return;

  const breadCrumb = view.getElementsByClassName("breadcrumb-text")[0];
  breadCrumb.textContent = breadcrumbText;
  breadCrumb.onclick = breadcrumbCallback;
}

// type = 'error', 'success', 'question'
export function showInfoDialog(type, title, text, cancelText, okText, onOk) {
  const icons = {
    'info': 'images/info.svg',
    'question': 'images/info.svg',
    'error': 'images/error.svg',
    'success': 'images/complete.svg'
  }
  const infoDialogImage = document.getElementById("infoDialogImage");
  infoDialogImage.src = icons[type];

  const infoDialogText = document.getElementById("infoDialogText");
  infoDialogText.textContent = text;

  const infoDialogCancel = document.getElementById("infoDialogCancel");
  infoDialogCancel.textContent = cancelText;

  const infoDialogOk = document.getElementById("infoDialogOk");
  infoDialogOk.textContent = okText;

  const infoDialogTitle = document.getElementById("infoDialogTitle");
  infoDialogTitle.textContent = title;

  document.getElementById("infoDialogCancel").toggleAttribute("hidden", type !== 'question')

  document.getElementById("infoDialogOk").onclick = () => {
    if (onOk)
      onOk();
  }

  const infoDialogButton = document.getElementById("infoDialogButton");
  infoDialogButton.click();
}