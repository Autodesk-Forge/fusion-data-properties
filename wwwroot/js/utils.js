export function wait(seconds) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, 1000 * seconds);
  });
}

export function formatString(text) {
  // Turn e.g. "DYNAMIC_AT_VERSION" to "Dynamic at version"
  return (text.charAt(0) + text.slice(1).toLowerCase()).replaceAll('_', ' ');
}

export function disableElements(ids, disable) {
  for (let id of ids) {
    const elem = document.getElementById(id);
    if (elem.hasAttribute('disabled') && !disable) {
      elem.removeAttribute('disabled');
    } else if (!elem.hasAttribute('disabled') && disable) {
      elem.setAttribute('disabled', '');
    }
  }
}

export function toYesOrNo(value) {
  return value === true ? 'Yes' : 'No';
}

export function toNonEmpty(value) {
  return value !== undefined ? value : '-';
}


export async function getJSON(url, verb = 'GET', body) {
  const resp = await fetch(url, {
    method: verb,
    body: body,
    headers: {
      'Content-Type': 'application/json'
    }
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
  element.style.display = 'block';
  try {
    return await func();
  } finally {
    element.style.display = 'none';
  }
}

export function showView(viewId, breadcrumbText, breadcrumbCallback) {
  let views = document.getElementsByClassName("view");
  for (let view of views) {
    if (view.style.display !== 'none') {
      view.style.display = 'none';
      break;
    }
  }

  let view = document.getElementById(viewId);
  view.style.display = 'block';

  if (!breadcrumbText)
    return;

  const breadCrumb = view.getElementsByClassName('breadcrumb-text')[0];
  breadCrumb.textContent = breadcrumbText;
  breadCrumb.onclick = breadcrumbCallback;
}



