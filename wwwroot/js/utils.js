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



