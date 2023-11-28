import {
  getJSON,
  showView,
  useLoadingSymbol,
  toYesOrNo,
  toNonEmpty,
  formatString,
  showInfoDialog,
  wait
} from "./utils.js";
import { showDefinitionDialog } from "./definitiondialog.js";

document.getElementById("createDefinition").onclick = () => callShowDefinitionDialog(null, false, true);

document.getElementById("newDefinition").onclick = () => callShowDefinitionDialog(null, false);

function callShowDefinitionDialog(inputValues, isEditing, isCollectionEmpty) {
  showDefinitionDialog(async (values) => {
    console.log(values);

    const collectionId = definitionsTable.getAttribute("collectionId");
    const collectionName = definitionsTable.getAttribute("collectionName");

    try {
      const definition = await useLoadingSymbol(async () => {
        if (isEditing)
          return await getJSON(
            `/api/fusiondata/definitions/${inputValues.id}`,
            "PUT",
            JSON.stringify({
              definitionDescription: values.description,
              isHidden: values.isHidden,
            })
          );
        else
          return await getJSON(
            `/api/fusiondata/collections/${collectionId}/definitions`,
            "POST",
            JSON.stringify({
              definitionName: values.name,
              definitionType: values.specification,
              definitionDescription: values.description,
              isHidden: values.isHidden,
              shouldCopy: values.shouldCopy,
              readOnly: values.readOnly,
              propertyBehavior: values.propertyBehavior,
            })
          );
      });

      if (isCollectionEmpty) {
        showDefinitionsTable(collectionId, collectionName, false, [definition]);
        return;
      }

      if (isEditing) {
        const definitionsTable = document.getElementById("definitionsTable");
        updateRow(definitionsTable, definition)
      } else {
        const definitionsTable = document.getElementById("definitionsTable");
        addRow(definitionsTable, definition)
      }
    } catch (error) {
      showInfoDialog("error", null, error, null, "OK", () => {
        callShowDefinitionDialog(values, isEditing, isCollectionEmpty)
      });
    }
  }, inputValues, isEditing);
}

function onEdit(event) {
  console.log("onEdit");
  event.preventDefault();

  const currentValues = event.target.parentElement.parentElement.definition;

  callShowDefinitionDialog(currentValues, true, false);
}

async function onArchive(event) {
  console.log("onArchive");
  event.preventDefault();

  const currentValues = event.target.parentElement.parentElement.definition;

  showInfoDialog('question', "", "Are you sure you want to archive this property? This process can't be undone.", 'Cancel', 'Archive property', async () => {
    try {
      await useLoadingSymbol(async () => {
        return await getJSON(
          `/api/fusiondata/definitions/${currentValues.id}`,
          "DELETE"
        );
      });

      const definitionsTable = document.getElementById("definitionsTable");
      const numOfRows = definitionsTable.rows.length;
      if (numOfRows < 2) {
        const collectionId = definitionsTable.getAttribute("collectionId");
        const collectionName = definitionsTable.getAttribute("collectionName");
        showDefinitionsTable(collectionId, collectionName, false, []);
        return;
      } else {
        removeRow(definitionsTable, currentValues);
      }
    } catch (error) {
      showInfoDialog("error", null, error, null, "OK", () => {});
    }
  })
}

function addRow(definitionsTable, definition) {
  const showArchive = true;

  let row = definitionsTable.insertRow();
  row.definition = definition;
  row.setAttribute("definitionId", definition.id);
  row.innerHTML += `
    <td class="definition-name">${definition.name}</td>
    <td class="definition-type">${formatString(definition.specification)}</td>
    <td class="definition-units">${toNonEmpty(definition.units?.name)}</td>
    <td class="definition-behavior">${formatString(toNonEmpty(definition.propertyBehavior))}</td>
    <td class="definition-description">${definition.description}</td>
    <td class="definition-hidden">${toYesOrNo(definition.isHidden)}</td>
    <td class="definition-readonly">${toYesOrNo(definition.readOnly)}</td>
    <td>
      <span href="" class="bi bi-pencil clickable" title="Edit property definition">&nbsp;</span>
      ${showArchive ? '<span href="" class="bi bi-archive clickable" title="Archive property">&nbsp;</span>' : ''}
    </td>`;

  let [edit, archive] = row.getElementsByTagName("span");
  edit.onclick = onEdit;
  if (showArchive)
    archive.onclick = onArchive;
}

function updateRow(definitionsTable, definition) {
  const row = definitionsTable.querySelector(`tr[definitionId="${definition.id}"]`);
  const description = row.querySelector(".definition-description");
  description.textContent = definition.description;
  row.definition.description = definition.description;
  const isHidden = row.querySelector(".definition-hidden");
  isHidden.textContent = toYesOrNo(definition.isHidden);
  row.definition.isHidden = definition.isHidden;
}

function removeRow(definitionsTable, definition) {
  const row = definitionsTable.querySelector(`tr[definitionId="${definition.id}"]`);
  row.remove();
}

export async function showDefinitionsTable(collectionId, collectionName, showDialog = false, definitions = null) {
  const definitionsTable = document.getElementById("definitionsTable");
  definitionsTable.setAttribute("collectionId", collectionId);
  definitionsTable.setAttribute("collectionName", collectionName);

  try {
    if (!definitions) 
      definitions = await useLoadingSymbol(async () => {
        return await getJSON(
          `/api/fusiondata/collections/${collectionId}/definitions`,
          "GET"
        );
      });

    if (definitions.length < 1) {
      showView("emptyDefinitionsView", ` ${collectionName} Property Definitions`, () => {
        showView("collectionsView");
      });

      if (showDialog) {
        callShowDefinitionDialog(null, false, true);
      }

      return;
    }

    showView("definitionsView", ` ${collectionName} Property Definitions`, () => {
      showView("collectionsView");
    });

    definitionsTable.innerHTML = "";
    for (let definition of definitions) {
      addRow(definitionsTable, definition);
    }

    if (showDialog) {
      callShowDefinitionDialog(null, false, false);
    }
  } catch (error) {
    showInfoDialog("error", null, error, null, "OK");
  }
}
