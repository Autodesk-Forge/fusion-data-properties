import { disableElements } from "./utils.js";

let _callback;

document.getElementById("collectionDialogOk").onclick = (event) => {
  if (!_callback) return;

  _callback({
    id: document.getElementById("collectionDialog").collectionId,
    name: document.getElementById("collectionName").value,
    description: document.getElementById("collectionDescription").value,
  });
};

export async function showCollectionDialog(callback, values, isEditing) {
  _callback = callback;

  disableElements(["collectionName"], isEditing);

  document.getElementById("collectionDialog").collectionId = values?.id;
  document.getElementById("collectionDialogTitle").textContent = isEditing
    ? "Edit Property Definition Collection"
    : "Add Property Definition Collection";
  document.getElementById("collectionDialogOk").textContent = isEditing
    ? "Save Changes"
    : "Create Collection";

  document.getElementById("collectionName").value = values?.name || "";
  document.getElementById("collectionDescription").value =
    values?.description || "";

  const dialogButton = document.getElementById("collectionDialogButton");
  dialogButton.click();

  if (isEditing)
    document.getElementById("collectionDescription").focus();
  else
    document.getElementById("collectionName").focus();
}