export function initEventStore() {
  document.addEventListener("event-create", (event) => {
    const createdEvent = event.detail.event;
    const events = getEventsFromLocalStorage();
    events.push(createdEvent)
    saveEventsIntoLocalStorage(events);

    document.dispatchEvent(new CustomEvent("events-change", {
      bubbles: true
    }));
  });

  document.addEventListener("event-delete", (event) => {
    const deletedEvent = event.detail.event;
    const events = getEventsFromLocalStorage().filter((event) => {
      return event.id !== deletedEvent.id;
    })
    saveEventsIntoLocalStorage(events);

    document.dispatchEvent(new CustomEvent("events-change", {
      bubbles: true
    }));
  });

  document.addEventListener("event-edit", (event) => {
    const editedEvent = event.detail.event;
    const events = getEventsFromLocalStorage().map((event) => {
      return event.id === editedEvent.id ? editedEvent : event;
    });
    saveEventsIntoLocalStorage(events);

    document.dispatchEvent(new CustomEvent("events-change", {
      bubbles: true
    }));
  });

  return {
    getEventsByDate(date) {
      const events = getEventsFromLocalStorage();
      // Return events that overlap the requested date (start..end inclusive)
      const filteredEvents = events.filter((event) => {
        const start = event.date;
        const end = event.endDate || event.date;
        // normalize times to date-only comparison
        const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        return target >= s && target <= e;
      });

      return filteredEvents;
    }
  };
}

function saveEventsIntoLocalStorage(events) {
  const safeToStringifyEvents = events.map((event) => ({
    ...event,
    date: event.date.toISOString(),
    endDate: event.endDate ? event.endDate.toISOString() : null
  }));

  let stringifiedEvents;
  try {
    stringifiedEvents = JSON.stringify(safeToStringifyEvents);
  } catch (error) {
    console.error("Stringify events failed", error);
  }

  localStorage.setItem("events", stringifiedEvents);
}

function getEventsFromLocalStorage() {
  const localStorageEvents = localStorage.getItem("events");
  if (localStorageEvents === null) {
    return [];
  }

  let parsedEvents;
  try {
    parsedEvents = JSON.parse(localStorageEvents);
  } catch (error) {
    console.error("Parse events failed", error);
    return [];
  }

  const events = parsedEvents.map((event) => ({
    ...event,
    date: new Date(event.date),
    endDate: event.endDate ? new Date(event.endDate) : new Date(event.date)
  }));

  return events;
}