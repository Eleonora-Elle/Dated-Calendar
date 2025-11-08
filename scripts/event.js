const eventTemplateElement = document.querySelector("[data-template='event']");

const dateFormatter = new Intl.DateTimeFormat("sl-SI", {
  hour: "numeric",
  minute: "numeric"
});

export function initStaticEvent(parent, event) {
  const eventElement = initEvent(event);

  if (isEventAllDay(event)) {
    eventElement.classList.add("event--filled");
  }

  parent.appendChild(eventElement);
}

export function initDynamicEvent(parent, event, dynamicStyles) {
  const eventElement = initEvent(event);

  eventElement.classList.add("event--filled");
  eventElement.classList.add("event--dynamic");

  eventElement.style.top = dynamicStyles.top;
  eventElement.style.left = dynamicStyles.left;
  eventElement.style.bottom = dynamicStyles.bottom;
  eventElement.style.right = dynamicStyles.right;

  eventElement.dataset.eventDynamic = true;

  parent.appendChild(eventElement);
}

function initEvent(event) {
  const eventContent = eventTemplateElement.content.cloneNode(true);
  const eventElement = eventContent.querySelector("[data-event]");
  const eventTitleElement = eventElement.querySelector("[data-event-title]");
  const eventStartTimeElement = eventElement.querySelector("[data-event-start-time]");
  const eventEndTimeElement = eventElement.querySelector("[data-event-end-time]");

  const useEndDateForEnd = event.endDate && (event.endDate.toDateString() !== event.date.toDateString());
  const startDate = eventTimeToDate(event, event.startTime, false);
  const endDate = eventTimeToDate(event, event.endTime, useEndDateForEnd);

  eventElement.style.setProperty("--event-color", event.color);
  eventTitleElement.textContent = event.title;
  eventStartTimeElement.textContent = dateFormatter.format(startDate);
  eventEndTimeElement.textContent = dateFormatter.format(endDate);

  eventElement.addEventListener("click", () => {
    eventElement.dispatchEvent(new CustomEvent("event-click", {
      detail: {
        event,
        clickedDate: event.clickedDate || event.date // Pass along the specific date clicked
      },
      bubbles: true
    }));
  });

  return eventElement;
}

export function isEventAllDay(event) {
  return event.startTime === 0 && event.endTime === 1440;
}

export function eventStartsBefore(eventA, eventB) {
  return eventA.startTime < eventB.startTime;
}

export function eventEndsBefore(eventA, eventB) {
  return eventA.endTime < eventB.eventTime;
}

export function eventCollidesWith(eventA, eventB) {
  const maxStartTime = Math.max(eventA.startTime, eventB.startTime);
  const minEndTime = Math.min(eventA.endTime, eventB.endTime);

  return minEndTime > maxStartTime;
}

export function eventTimeToDate(event, eventTime, useEndDate = false) {
  const baseDate = useEndDate && event.endDate ? event.endDate : event.date;
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    0,
    eventTime
  );
}

export function validateEvent(event) {
  // Ensure end date is not before start date
  if (event.endDate < event.date) {
    return "Event end date must be the same or after the start date";
  }

  // If event is on the same day, ensure end time is after start time
  const sameDay = event.date.getFullYear() === event.endDate.getFullYear() &&
    event.date.getMonth() === event.endDate.getMonth() &&
    event.date.getDate() === event.endDate.getDate();

  if (sameDay && event.startTime >= event.endTime) {
    return "Event end time must be after start time";
  }

  return null;
}

export function adjustDynamicEventMaxLines(dynamicEventElement) {
  const availableHeight = dynamicEventElement.offsetHeight;
  const lineHeight = 16;
  const padding = 8;
  const maxTitleLines = Math.floor((availableHeight - lineHeight - padding) / lineHeight);

  dynamicEventElement.style.setProperty("--event-title-max-lines", maxTitleLines);
}

export function generateEventId() {
  return Date.now();
}

const createTimeFormatter = (locale = 'sl-SI') => {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "numeric"
  });
};