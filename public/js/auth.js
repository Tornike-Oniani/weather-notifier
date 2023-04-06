const form = document.getElementById("signin-form");
const button = form.querySelector("button");

button.addEventListener("click", async (event) => {
  event.preventDefault();

  try {
    const response = await fetch("/select-account", {
      method: "GET",
      mode: "no-cors",
    });
    const result = await response.text();
    console.log(result); // "Successfully authenticated!"
  } catch (err) {
    console.error(err);
  }
});
