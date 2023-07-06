import { showView } from "./utils.js";

document.getElementById("menuitemPropertiesView").onclick = () =>
  showView("propertiesView");

document.getElementById("menuitemCollectionsView").onclick = () =>
  showView("collectionsView");

const _avatarImage = document.getElementById("avatarImage");

const _login = document.getElementById("menuitemLogin");
try {
  const resp = await fetch("/api/auth/profile");
  if (resp.ok) {
    const user = await resp.json();
    _avatarImage.src = user.picture;

    _login.innerText = `Log out`;
    _login.onclick = () => {
      // Log the user out (see https://forge.autodesk.com/blog/log-out-forge)
      const iframe = document.createElement("iframe");
      iframe.style.visibility = "hidden";
      iframe.src = "https://accounts.autodesk.com/Authentication/LogOut";
      document.body.appendChild(iframe);
      iframe.onload = () => {
        window.location.replace("/api/auth/logout");
        document.body.removeChild(iframe);
      };
    };

    showView("collectionsView");
  } else {
    _avatarImage.src = "/images/person.svg";
    _login.innerText = "Log in";
    _login.onclick = () => window.location.replace("/api/auth/login");
  }
  _login.style.visibility = "visible";
} catch (err) {
  alert("Could not initialize the application. See console for more details.");
  console.error(err);
}
