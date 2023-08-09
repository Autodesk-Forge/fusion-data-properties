import { disableElements } from "./utils.js";

let _callback;

document.getElementById("definitionDialogOk").onclick = (event) => {
  if (!_callback) return;

  _callback({
    name: document.getElementById("definitionName").value,
    description: document.getElementById("definitionDescription").value,
    type: document.getElementById("definitionType").value,
    propertyBehavior: document.getElementById("definitionBehaviour").value,
    readOnly: document.getElementById("definitionReadonlyYes").checked,
    isHidden: document.getElementById("definitionHiddenYes").checked,
  });
};

export async function showDefinitionDialog(callback, values, isEditing) {
  _callback = callback;

  // You can only edit 'description' and 'isHidden'
  disableElements(
    [
      "definitionName",
      "definitionType",
      "definitionBehaviour",
      "definitionReadonlyYes",
      "definitionReadonlyNo",
    ],
    isEditing
  );

  document.getElementById("definitionDialogTitle").textContent = isEditing
    ? "Edit Property Definition"
    : "New Property Definition";
  document.getElementById("definitionDialogOk").textContent = isEditing
    ? "Save Changes"
    : "Add Property Definition";
  document.getElementById("definitionName").value = values?.name || "";
  document.getElementById("definitionType").value = values?.type || "STRING";
  document.getElementById("definitionDescription").value =
    values?.description || "";
  document.getElementById("definitionBehaviour").value =
    values?.propertyBehavior || "DYNAMIC";
  document.getElementById("definitionReadonlyYes").checked = values?.readOnly;
  document.getElementById("definitionReadonlyNo").checked = !values?.readOnly;
  document.getElementById("definitionHiddenYes").checked = values?.isHidden;
  document.getElementById("definitionHiddenNo").checked = !values?.isHidden;

  const dialogButton = document.getElementById("definitionDialogButton");
  dialogButton.click();

  if (isEditing)
    document.getElementById("definitionDescription").focus();
  else 
    document.getElementById("definitionName").focus();
}
