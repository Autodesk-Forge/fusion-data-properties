import { disableElements } from "./utils.js";

let _callback;

document.getElementById("definitionDialogOk").onclick = (event) => {
  if (!_callback) return;

  _callback({
    id: document.getElementById("definitionDialog").definitionId,
    name: document.getElementById("definitionName").value,
    description: document.getElementById("definitionDescription").value,
    specification: document.getElementById("definitionType").value,
    propertyBehavior: document.getElementById("definitionBehaviour").value,
    readOnly: document.getElementById("definitionReadonlyYes").checked,
    isHidden: document.getElementById("definitionHiddenYes").checked,
    shouldCopy: document.getElementById("definitionIncludeYes").checked,
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
      "definitionIncludeYes",
      "definitionIncludeNo",
    ],
    isEditing
  );

  document.getElementById("definitionDialog").definitionId = values?.id;
  document.getElementById("definitionDialogTitle").textContent = isEditing
    ? "Edit Property Definition"
    : "Add Property Definition";
  document.getElementById("definitionDialogOk").textContent = isEditing
    ? "Save Changes"
    : "Add Property Definition";
  document.getElementById("definitionName").value = values?.name || "";
  document.getElementById("definitionType").value = values?.specification || "STRING";
  document.getElementById("definitionDescription").value =
    values?.description || "";
  document.getElementById("definitionBehaviour").value =
    values?.propertyBehavior || "DYNAMIC";
  document.getElementById("definitionReadonlyYes").checked = values?.readOnly;
  document.getElementById("definitionReadonlyNo").checked = !values?.readOnly;
  document.getElementById("definitionHiddenYes").checked = values?.isHidden;
  document.getElementById("definitionHiddenNo").checked = !values?.isHidden;
  document.getElementById("definitionIncludeYes").checked = values?.shouldCopy;
  document.getElementById("definitionIncludeNo").checked = !values?.shouldCopy;

  const dialogButton = document.getElementById("definitionDialogButton");
  dialogButton.click();

  if (isEditing)
    document.getElementById("definitionDescription").focus();
  else 
    document.getElementById("definitionName").focus();
}
