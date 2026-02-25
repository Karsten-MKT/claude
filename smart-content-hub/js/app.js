const messagesContainer = document.getElementById("messages");
const inputForm = document.getElementById("input-form");
const userInput = document.getElementById("user-input");

function addMessage(text, role) {
  const div = document.createElement("div");
  div.classList.add("message", role);
  div.textContent = text;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

addMessage(
  "Willkommen beim Smart Content Hub! Stellen Sie mir eine Frage zu den Inhalten dieser Website.",
  "assistant"
);

inputForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";

  // Placeholder – hier wird später die KI-Anbindung integriert
  setTimeout(() => {
    addMessage(
      "Diese Funktion wird bald mit einer KI-Schnittstelle verbunden. Bitte haben Sie noch etwas Geduld!",
      "assistant"
    );
  }, 500);
});
