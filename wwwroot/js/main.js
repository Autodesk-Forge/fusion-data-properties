import { showView } from "./utils.js";

document.getElementById("menuitemPropertiesView").onclick = () =>
  showView("propertiesView");

document.getElementById("menuitemCollectionsView").onclick = () =>
  showView("collectionsView");

const login = document.getElementById("menuitemLogin");
try {
  const resp = await fetch("/api/auth/profile");
  if (resp.ok) {
    const user = await resp.json();
    login.innerText = `Log out`;
    login.onclick = () => {
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
    login.innerText = "Log in";
    login.onclick = () => window.location.replace("/api/auth/login");
  }
  login.style.visibility = "visible";
} catch (err) {
  alert("Could not initialize the application. See console for more details.");
  console.error(err);
}
