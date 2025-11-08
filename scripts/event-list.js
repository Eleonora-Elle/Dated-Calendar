import { initStaticEvent } from "./event.js";

const eventListItemTemplateElement = document.querySelector("[data-template='event-list-item']");

export function initEventList(parent, events, clickedDate) {
  const eventListElement = parent.querySelector("[data-event-list]");

  if (!eventListElement) {
    console.error("Event list element not found in parent:", parent);
    return;
  }

  eventListElement.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  for (const event of events) {
    const eventListItemContent = eventListItemTemplateElement.content.cloneNode(true);
    const eventListItemElement = eventListItemContent.querySelector("[data-event-list-item]");

    // Add the clicked date to the event so we know which day of a multi-day event was clicked
    const eventWithClickedDate = clickedDate ? { ...event, clickedDate } : event;
    initStaticEvent(eventListItemElement, eventWithClickedDate);

    eventListElement.appendChild(eventListItemElement);
  }
}