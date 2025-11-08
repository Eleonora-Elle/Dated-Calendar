import { getUrlDate } from "./url.js";

export function initEventCreateButtons() {
  const buttonElements = document.querySelectorAll("[data-event-create-button]");

  for (const buttonElement of buttonElements) {
    initEventCreateButton(buttonElement);
  }
}

function initEventCreateButton(buttonElement) {
  let selectedDate = getUrlDate();

  buttonElement.addEventListener("click", () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    // Start time: current time + 1 hour, rounded to nearest 30 min
    const startTime = Math.ceil((currentMinutes + 60) / 30) * 30;
    // End time: start time + 30 minutes
    const endTime = startTime + 30;
    
    buttonElement.dispatchEvent(new CustomEvent("event-create-request", {
      detail: {
        date: selectedDate,
        startTime: startTime,
        endTime: endTime
      },
      bubbles: true
    }));
  });

  document.addEventListener("date-change", (event) => {
    selectedDate = event.detail.date;
  });
}