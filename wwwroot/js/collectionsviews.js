import { getJSON, showView, useLoadingSymbol } from './utils.js';
import { showDefinitionsTable } from './definitionsviews.js';
import { showCollectionDialog } from './collectiondialog.js';

document.getElementById('createCollection').onclick =
document.getElementById('newCollection').onclick = (event) => {
  showCollectionDialog(values => {
    console.log(values);
  })
}

function onTableRowClick(event) {
  console.log('onTableRowClick');

  const collectionId = event.currentTarget.getAttribute("collectionId");
  const collectionName = event.currentTarget.text;
  showDefinitionsTable(collectionId, collectionName);

  event.preventDefault();
}

function addRow(collectionsTable, collection) {
  let row = collectionsTable.insertRow();
  row.innerHTML +=
    `<tr>
      <td><a href="${collection.name}" collectionId="${collection.id}">${collection.name}</a></td>
      <td>
        <div class="dropdown">
          <a
            href="#"
            class="d-block link-body-emphasis text-decoration-none"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <span
              class="bi-three-dots-vertical"
              style="position: relative; left: -6px"
            ></span>
          </a>
          <ul class="dropdown-menu text-small">
            <li>
              <a class="dropdown-item" href="#">Add properties</a>
            </li>
            <li><hr class="dropdown-divider" /></li>
            <li>
              <a class="dropdown-item" href="#"
                >Edit collection details</a
              >
            </li>
          </ul>
        </div>
      </td>
    </tr>`

    let link = row.getElementsByTagName("a")[0];
    link.onclick = onTableRowClick;
}

export async function showCollectionsTable() {
  const collectionsTable =  document.getElementById('collectionsTable');
  collectionsTable.innerHTML = '';

  showView("emptyCollectionsView");
  let collections = await useLoadingSymbol(async () => {
    return await getJSON(`/api/fusiondata/collections`, 'GET')
  });
   
  if (collections.length < 1) {
    return;
  }

  showView("collectionsView");
  for (let collection of collections) {
    addRow(collectionsTable, collection);
  }
}

