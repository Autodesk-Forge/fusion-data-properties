import {
  getJSON,
  showView,
  useLoadingSymbol,
  toYesOrNo,
  toNonEmpty,
  formatString
} from "./utils.js";
import { showDefinitionDialog } from "./definitiondialog.js";

document.getElementById("createDefinition").onclick = document.getElementById(
  "newDefinition"
).onclick = (event) => {
  showDefinitionDialog(async (values) => {
    console.log(values);

    const collectionId = definitionsTable.getAttribute("collectionId");
    const collectionName = definitionsTable.getAttribute("collectionName");

    try {
      const definition = await useLoadingSymbol(async () => {
        return await getJSON(
          `/api/fusiondata/collections/${collectionId}/definitions`,
          "POST",
          JSON.stringify({
            definitionName: values.name,
            definitionType: values.type,
            definitionDescription: values.description,
            isHidden: values.isHidden,
            propertyBehavior: values.propertyBehavior,
          })
        );
      });

      showDefinitionsTable(collectionId, collectionName);
    } catch (error) {
      //alert("Could not add new property");
      showInfoDialog("error", null, error, null, "OK");
    }
  });
};

function onEdit(event) {
  console.log("onEdit");
  event.preventDefault();

  const currentValues = event.target.parentElement.parentElement.definition;
  const collectionId = definitionsTable.getAttribute("collectionId");
  const collectionName = definitionsTable.getAttribute("collectionName");

  showDefinitionDialog(async (values) => {
    console.log(values);

    try {
      const definition = await useLoadingSymbol(async () => {
        const res = await getJSON(
          `/api/fusiondata/definitions/${currentValues.id}`,
          "PUT",
          JSON.stringify({
            definitionDescription: values.description,
            isHidden: values.isHidden,
          })
        );

        return res;
      });

      showDefinitionsTable(collectionId, collectionName);
    } catch (error) {
      //alert("Could not add new property");
      showInfoDialog("error", null, error, null, "OK");
    }
  }, currentValues);
}

function onArchive(event) {
  console.log("onArchive");
  event.preventDefault();
}

function addRow(definitionsTable, definition) {
  let row = definitionsTable.insertRow();
  row.definition = definition;
  row.innerHTML += `<tr>
      <td definitionId="${definition.id}">${definition.name}</td>
      <td>${formatString(definition.type)}</td>
      <td>${toNonEmpty(definition.units?.name)}</td>
      <td>${formatString(toNonEmpty(definition.propertyBehavior))}</td>
      <td>${definition.description}</td>
      <td>${toYesOrNo(definition.isHidden)}</td>
      <td>${toYesOrNo(definition.readOnly)}</td>
      <td>
        <span href="" class="bi bi-pencil clickable" title="Edit property">&nbsp;</span>
        ${false ? '<span href="" class="bi bi-archive clickable" title="Archive property">&nbsp;</span>' : ''}
      </td>
    </tr>`;

  let [edit, archive] = row.getElementsByTagName("span");
  edit.onclick = onEdit;
  archive.onclick = onArchive;
}

export async function showDefinitionsTable(collectionId, collectionName) {
  const definitionsTable = document.getElementById("definitionsTable");
  definitionsTable.setAttribute("collectionId", collectionId);
  definitionsTable.setAttribute("collectionName", collectionName);

  try {
    let definitions = await useLoadingSymbol(async () => {
      return await getJSON(
        `/api/fusiondata/collections/${collectionId}/definitions`,
        "GET"
      );
    });

    if (definitions.length < 1) {
      showView("emptyDefinitionsView", ` ${collectionName} properties`, () => {
        showView("collectionsView");
      });
      return;
    }

    showView("definitionsView", ` ${collectionName} properties`, () => {
      showView("collectionsView");
    });

    definitionsTable.innerHTML = "";
    for (let definition of definitions) {
      addRow(definitionsTable, definition);
    }
  } catch {}
}
