import { initDialog } from "./dialog.js";
import { eventTimeToDate } from "./event.js";

const eventDateFormatter = new Intl.DateTimeFormat("sl-SI", {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

const eventTimeFormatter = new Intl.DateTimeFormat("sl-SI", {
  hour: 'numeric',
  minute: 'numeric'
});

export function initEventDetailsDialog() {
  const dialog = initDialog("event-details");

  const deleteButtonElemenet = dialog.dialogElement.querySelector("[data-event-details-delete-button]");

  const editButtonElement = dialog.dialogElement.querySelector("[data-event-details-edit-button]");

  let currentEvent = null;
  let clickedDate = null;

  document.addEventListener("event-click", (event) => {
    currentEvent = event.detail.event;
    clickedDate = event.detail.clickedDate || event.detail.event.date;
    fillEventDetailsDialog(dialog.dialogElement, event.detail.event);
    dialog.open();
  });

  deleteButtonElemenet.addEventListener("click", () => {
    dialog
      .close()
      .then(() => {
        // Pass the event with clickedDate preserved
        const eventWithClickedDate = { ...currentEvent, clickedDate };
        deleteButtonElemenet.dispatchEvent(new CustomEvent("event-delete-request", {
          detail: {
            event: eventWithClickedDate
          },
          bubbles: true
        }));
      });
  });

  editButtonElement.addEventListener("click", () => {
    dialog
      .close()
      .then(() => {
        editButtonElement.dispatchEvent(new CustomEvent("event-edit-request", {
          detail: {
            event: currentEvent
          },
          bubbles: true
        }));
      });
  });
}

function fillEventDetailsDialog(parent, event) {
  const eventDetailsElement = parent.querySelector("[data-event-details]");
  const eventDetailsTitleElement = eventDetailsElement.querySelector("[data-event-details-title]");
  const eventDetailsDateElement = eventDetailsElement.querySelector("[data-event-details-date]");
  const eventDetailsStartTimeElement = eventDetailsElement.querySelector("[data-event-details-start-time]");
  const eventDetailsEndTimeElement = eventDetailsElement.querySelector("[data-event-details-end-time]");

  eventDetailsTitleElement.textContent = event.title;
  // Show date or date range if multi-day
  if (event.endDate && (event.endDate.toDateString() !== event.date.toDateString())) {
    eventDetailsDateElement.textContent = `${eventDateFormatter.format(event.date)} — ${eventDateFormatter.format(event.endDate)}`;
  } else {
    eventDetailsDateElement.textContent = eventDateFormatter.format(event.date);
  }

  eventDetailsStartTimeElement.textContent = eventTimeFormatter.format(
    eventTimeToDate(event, event.startTime, false)
  );
  eventDetailsEndTimeElement.textContent = eventTimeFormatter.format(
    eventTimeToDate(event, event.endTime, true)
  );

  eventDetailsElement.style.setProperty("--event-color", event.color);
}