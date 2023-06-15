import { getJSON, showView, useLoadingSymbol } from './utils.js';
import { showDefinitionDialog } from './definitiondialog.js';

document.getElementById('createDefinition').onclick =
document.getElementById('newDefinition').onclick = (event) => {
  showDefinitionDialog(values => {
    console.log(values);
  })
}

function onEdit(event) {
  console.log('onEdit');
  event.preventDefault();
}

function onArchive(event) {
  console.log('onArchive');
  event.preventDefault();
}

function toYesOrNo(value) {
  return value === true ? 'Yes' : 'No';
}

function toNonEmpty(value) {
  return value !== undefined ? value : '-';
}

function addRow(definitionsTable, definition) {
  let row = definitionsTable.insertRow();
  row.innerHTML +=
    `<tr>
      <td definitionId="${definition.id}">${definition.name}</td>
      <td>${definition.type}</td>
      <td>${toNonEmpty(definition.units?.name)}</td>
      <td>${toNonEmpty(definition.propertyBehaviour)}</td>
      <td>${definition.description}</td>
      <td>${toYesOrNo(definition.isHidden)}</td>
      <td>${toYesOrNo(definition.readOnly)}</td>
      <td>
        <span href="" class="bi bi-pencil clickable" title="Edit property">&nbsp;</span>
        <span href="" class="bi bi-archive clickable" title="Archive property">&nbsp;</span>
      </td>
    </tr>`

    let [edit, archive] = row.getElementsByTagName("span");
    edit.onclick = onEdit;
    archive.onclick = onArchive;
}

export async function showDefinitionsTable(collectionId, collectionName) {
  const definitionsTable =  document.getElementById('definitionsTable');
  definitionsTable.innerHTML = '';

  showView("emptyDefinitionsView", ` ${collectionName} properties`, () => {
    showView('collectionsView');
  });
  let definitions = await useLoadingSymbol(async () => {
    return await getJSON(`/api/fusiondata/collections/${collectionId}/definitions`, 'GET')
  });
   
  if (definitions.length < 1) {
    return;
  }

  showView("definitionsView", ` ${collectionName} properties`, () => {
    showView('collectionsView');
  });
  for (let definition of definitions) {
    addRow(definitionsTable, definition);
  }
}

