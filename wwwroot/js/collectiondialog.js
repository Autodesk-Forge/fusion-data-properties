let _callback;

document.getElementById("collectionDialogOk").onclick = (event) => {
  if (!_callback) return;

  _callback({
    name: document.getElementById("collectionName").value,
    description: document.getElementById("collectionDescription").value,
  });
};

export async function showCollectionDialog(callback, values, isEditing) {
  _callback = callback;

  document.getElementById("collectionName").value = values?.name || "";
  document.getElementById("collectionDescription").value =
    values?.description || "";

  const dialogButton = document.getElementById("collectionDialogButton");
  dialogButton.click();

  document.getElementById("collectionName").focus();
}