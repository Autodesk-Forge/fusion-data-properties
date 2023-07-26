import { showView, showInfoDialog } from "./utils.js";

const _menuitemPropertiesView = document.getElementById("menuitemPropertiesView")
_menuitemPropertiesView.onclick = () => showView("propertiesView");

const _menuitemCollectionsView = document.getElementById("menuitemCollectionsView");
_menuitemCollectionsView.onclick = () => showView("collectionsView");

const _menuitemCredentialsView = document.getElementById("menuitemCredentialsView");
_menuitemCredentialsView.onclick = () => showView("credentialsView");

const _avatarImage = document.getElementById("avatarImage");
const _userName = document.getElementById("userName");

const _login = document.getElementById("menuitemLogin");
try {
  const credentialsResponse = await fetch("/api/auth/credentials");
  const credentials = await credentialsResponse.json();

  const callbackUrl = document.getElementById("callbackUrl");
  callbackUrl.src = callbackUrl.textContent = credentials.callbackUrl;
  const myAppsUrl = document.getElementById("myAppsUrl");
  myAppsUrl.href = myAppsUrl.textContent = `${credentials.apsUrl}/myapps/`;
  const accountsUrl = credentials.accountsUrl;

  if (!credentials.hasCredentials) {
    showView("credentialsView");
    throw "No credentials were provided"
  }
  
  if (!credentials.isValid) {
    showView("credentialsView");
    showInfoDialog('error', "Invalid Credentials", "Please verify that the provided credentials are correct", null, "Close");
    throw "Credentials are not valid"
  }

  _login.classList.toggle('disabled', false);
  _menuitemCollectionsView.classList.toggle('disabled', false);
  showView("collectionsView");

  const resp = await fetch("/api/auth/profile");
  if (resp.ok) {
    _menuitemPropertiesView.classList.toggle('disabled', false);

    const user = await resp.json();
    _userName.textContent = user.name;
    _avatarImage.src = user.picture;

    _login.innerText = `Log out`;
    _login.onclick = () => {
      // Log the user out (see https://aps.autodesk.com/blog/log-out-forge)
      const iframe = document.createElement("iframe");
      iframe.style.visibility = "hidden";
      iframe.src = `${accountsUrl}/Authentication/LogOut`;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        window.location.replace("/api/auth/logout");
        document.body.removeChild(iframe);
      };
    };
  } else {
    throw "Could not get profile / 3-legged tokenn is not valid"
  }
} catch (err) {
  console.error(err);
  _login.innerText = "Log in";
  _login.onclick = () => window.location.replace("/api/auth/login");
}
