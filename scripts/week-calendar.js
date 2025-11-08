import { generateWeekDays, isTheSameDay, today } from "./date.js";
import { isEventAllDay, eventStartsBefore, eventEndsBefore, initDynamicEvent, eventCollidesWith, adjustDynamicEventMaxLines } from "./event.js";
import { initEventList } from "./event-list.js";

const calendarTemplateElement = document.querySelector("[data-template='week-calendar']");
const calendarDayOfWeekTemplateElement = document.querySelector("[data-template='week-calendar-day-of-week']");
const calendarAllDayListItemTemplateElement = document.querySelector("[data-template='week-calendar-all-day-list-item']");
const calendarColumnTemplateElement = document.querySelector("[data-template='week-calendar-column']");

const dateFormatter = new Intl.DateTimeFormat("sl-SI", {
  weekday: 'short'
});

export function initWeekCalendar(parent, selectedDate, eventStore, isSingleDay, deviceType) {
  const calendarContent = calendarTemplateElement.content.cloneNode(true);
  const calendarElement = calendarContent.querySelector("[data-week-calendar]");
  const calendarDayOfWeekListElement = calendarElement.querySelector("[data-week-calendar-day-of-week-list]");
  const calendarAllDayListElement = calendarElement.querySelector("[data-week-calendar-all-day-list]");
  const calendarColumnsElement = calendarElement.querySelector("[data-week-calendar-columns]");

  const weekDays = isSingleDay ? [selectedDate] : generateWeekDays(selectedDate);
  
  // Collect all unique events for the week (only if in week view)
  let multiDaySpanningEvents = [];
  if (!isSingleDay && weekDays.length > 0) {
    try {
      const allEventsMap = new Map();
      for (const weekDay of weekDays) {
        const events = eventStore.getEventsByDate(weekDay);
        if (events && Array.isArray(events)) {
          events.forEach(ev => {
            if (ev && ev.id && !allEventsMap.has(ev.id)) {
              allEventsMap.set(ev.id, ev);
            }
          });
        }
      }
      const uniqueWeekEvents = Array.from(allEventsMap.values());
      
      // Separate multi-day all-day spanning events from other events
      // Only all-day events that span multiple days should be rendered as spanning bars
      multiDaySpanningEvents = uniqueWeekEvents.filter(ev => {
        if (!ev || !ev.date) return false;
        try {
          const evStart = new Date(ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate());
          const evEnd = new Date((ev.endDate || ev.date).getFullYear(), (ev.endDate || ev.date).getMonth(), (ev.endDate || ev.date).getDate());
          return evEnd > evStart && isEventAllDay(ev);
        } catch (e) {
          console.error('Error filtering multi-day event:', e, ev);
          return false;
        }
      });
    } catch (e) {
      console.error('Error collecting multi-day events:', e);
      multiDaySpanningEvents = [];
    }
  }

  for (const weekDay of weekDays) {
    const events = eventStore.getEventsByDate(weekDay);
    // normalize events for the specific weekDay so multi-day events render correctly:
    // - events that span multiple days should appear as full-day on intermediate days
    // - on the start day, they run from startTime to end of day; on the end day, from start of day to endTime
    const normalizedEvents = events.map((ev) => {
      const evStart = new Date(ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate());
      const evEnd = new Date((ev.endDate || ev.date).getFullYear(), (ev.endDate || ev.date).getMonth(), (ev.endDate || ev.date).getDate());
      const current = new Date(weekDay.getFullYear(), weekDay.getMonth(), weekDay.getDate());

      // middle days
      if (evStart < current && evEnd > current) {
        return { ...ev, startTime: 0, endTime: 1440 };
      }

      // start day of a multi-day event
      if (evStart.getTime() === current.getTime() && evEnd > current) {
        return { ...ev, endTime: 1440 };
      }

      // end day of a multi-day event
      if (evStart < current && evEnd.getTime() === current.getTime()) {
        return { ...ev, startTime: 0 };
      }

      // same-day event
      return ev;
    });

    // Filter out multi-day events from allDayEvents since they'll be rendered as spanning bars
    const allDayEvents = normalizedEvents.filter((event) => 
      isEventAllDay(event) && !multiDaySpanningEvents.some(mde => mde.id === event.id)
    );
    const nonAllDayEvents = normalizedEvents.filter((event) => !isEventAllDay(event));

    sortEventsByTime(nonAllDayEvents);

    initDayOfWeek(calendarDayOfWeekListElement, selectedDate, weekDay, deviceType);

    if (deviceType === "desktop" || (deviceType === "mobile" && isTheSameDay(weekDay, selectedDate))) {
      initAllDayListItem(calendarAllDayListElement, allDayEvents, weekDay);
      initColumn(calendarColumnsElement, weekDay, nonAllDayEvents);
    }
  }

  if (isSingleDay) {
    calendarElement.classList.add("week-calendar--day");
  }

  parent.appendChild(calendarElement);
  
  // Render multi-day spanning events as continuous bars (after appending to DOM)
  if (!isSingleDay && multiDaySpanningEvents.length > 0) {
    try {
      initMultiDaySpanningEvents(calendarAllDayListElement, multiDaySpanningEvents, weekDays);
    } catch (e) {
      console.error('Error rendering multi-day spanning events:', e);
    }
  }

  // Highlight current hour if today is visible
  const todayDate = today();
  const isTodayVisible = weekDays.some(day => isTheSameDay(day, todayDate));
  if (isTodayVisible) {
    initCurrentTimeIndicator(calendarColumnsElement, weekDays, todayDate);
  }

  const dynamicEventElements = calendarElement.querySelectorAll("[data-event-dynamic]");

  for (const dynamicEventElement of dynamicEventElements) {
    adjustDynamicEventMaxLines(dynamicEventElement);
  }
}

function initDayOfWeek(parent, selectedDate, weekDay, deviceType) {
  const calendarDayOfWeekContent = calendarDayOfWeekTemplateElement.content.cloneNode(true);
  const calendarDayOfWeekElement = calendarDayOfWeekContent.querySelector("[data-week-calendar-day-of-week]");
  const calendarDayOfWeekButtonElement = calendarDayOfWeekElement.querySelector("[data-week-calendar-day-of-week-button]");
  const calendarDayOfWeekDayElement = calendarDayOfWeekElement.querySelector("[data-week-calendar-day-of-week-day]");
  const calendarDayOfWeekNumberElement = calendarDayOfWeekElement.querySelector("[data-week-calendar-day-of-week-number]");

  calendarDayOfWeekNumberElement.textContent = weekDay.getDate();
  calendarDayOfWeekDayElement.textContent = dateFormatter.format(weekDay);

  if (isTheSameDay(weekDay, today())) {
    calendarDayOfWeekButtonElement.classList.add("week-calendar__day-of-week-button--highlight");
  }

  if (isTheSameDay(weekDay, selectedDate)) {
    calendarDayOfWeekButtonElement.classList.add("week-calendar__day-of-week-button--selected");
  }

  calendarDayOfWeekButtonElement.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("date-change", {
      detail: {
        date: weekDay
      },
      bubbles: true
    }));

    if (deviceType !== "mobile") {
      document.dispatchEvent(new CustomEvent("view-change", {
        detail: {
          view: "day"
        },
        bubbles: true
      }));
    }
  });

  parent.appendChild(calendarDayOfWeekElement);
}

function initAllDayListItem(parent, events, weekDay) {
  const calendarAllDayListItemContent = calendarAllDayListItemTemplateElement.content.cloneNode(true);
  const calendarAllDayListItemElement = calendarAllDayListItemContent.querySelector("[data-week-calendar-all-day-list-item]");

  initEventList(calendarAllDayListItemElement, events, weekDay);

  parent.appendChild(calendarAllDayListItemElement);
}

function initColumn(parent, weekDay, events) {
  const calendarColumnContent = calendarColumnTemplateElement.content.cloneNode(true);
  const calendarColumnElement = calendarColumnContent.querySelector("[data-week-calendar-column]");
  const calendarColumnCellElements = calendarColumnElement.querySelectorAll("[data-week-calendar-cell]");

  const eventsWithDynamicStyles = calculateEventsDynamicStyles(events);
  for (const eventWithDynamicStyles of eventsWithDynamicStyles) {
    initDynamicEvent(
      calendarColumnElement,
      eventWithDynamicStyles.event,
      eventWithDynamicStyles.styles
    );
  }

  for (const calendarColumnCellElement of calendarColumnCellElements) {
    const cellStartTime = Number.parseInt(
      calendarColumnCellElement.dataset.weekCalendarCell,
      10
    );
    const cellEndTime = cellStartTime + 60;

    calendarColumnCellElement.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("event-create-request", {
        detail: {
          date: weekDay,
          startTime: cellStartTime,
          endTime: cellEndTime
        },
        bubbles: true
      }));
    });
  }

  parent.appendChild(calendarColumnElement);
}

function calculateEventsDynamicStyles(events) {
  const { eventGroups, totalColumns } = groupEvents(events);
  const columnWidth = 100 / totalColumns;
  const initialEventGroupItems = [];

  for (const eventGroup of eventGroups) {
    for (const eventGroupItem of eventGroup) {
      if (eventGroupItem.isInitial) {
        initialEventGroupItems.push(eventGroupItem);
      }
    }
  }

  return initialEventGroupItems.map((eventGroupItem) => {
    const topPercentage = 100 * (eventGroupItem.event.startTime / 1440);
    const bottomPercentage = 100 - 100 * (eventGroupItem.event.endTime / 1440);
    const leftPercentage = columnWidth * eventGroupItem.columnIndex;
    const rightPercentage = columnWidth * (totalColumns - eventGroupItem.columnIndex - eventGroupItem.columnSpan);

    return {
      event: eventGroupItem.event,
      styles: {
        top: `${topPercentage}%`,
        bottom: `${bottomPercentage}%`,
        left: `${leftPercentage}%`,
        right: `${rightPercentage}%`
      }
    }
  });
}

function groupEvents(events) {
  if (events.length === 0) {
    return { eventGroups: [], totalColumns: 0 };
  }

  const firstEventGroup = [
    {
      event: events[0],
      columnIndex: 0,
      isInitial: true,
      eventIndex: 0
    }
  ];

  const eventGroups = [firstEventGroup];

  for (let i = 1; i < events.length; i += 1) {
    const lastEventGroup = eventGroups[eventGroups.length - 1];
    const loopEvent = events[i];

    const lastEventGroupCollidingItems = lastEventGroup.filter((eventGroupItem) => eventCollidesWith(eventGroupItem.event, loopEvent));

    if (lastEventGroupCollidingItems.length === 0) {
      const newEventGroupItem = {
        event: loopEvent,
        columnIndex: 0,
        isInitial: true,
        eventIndex: i
      };

      const newEventGroup = [newEventGroupItem];
      eventGroups.push(newEventGroup);
      continue;
    }

    if (lastEventGroupCollidingItems.length === lastEventGroup.length) {
      const newEventGroupItem = {
        event: loopEvent,
        columnIndex: lastEventGroup.length,
        isInitial: true,
        eventIndex: i
      };

      lastEventGroup.push(newEventGroupItem);
      continue;
    }

    let newColumnIndex = 0;
    while (true) {
      const isColumnIndexInUse = lastEventGroupCollidingItems.some((eventGroupItem) => eventGroupItem.columnIndex === newColumnIndex);

      if (isColumnIndexInUse) {
        newColumnIndex += 1;
      } else {
        break;
      }
    }

    const newEventGroupItem = {
      event: loopEvent,
      columnIndex: newColumnIndex,
      isInitial: true,
      eventIndex: i
    };

    const newEventGroup = [
      ...lastEventGroupCollidingItems.map((eventGroupItem) => ({
        ...eventGroupItem,
        isInitial: false
      })),
      newEventGroupItem
    ];

    eventGroups.push(newEventGroup);
  }

  let totalColumns = 0;
  for (const eventGroup of eventGroups) {
    for (const eventGroupItem of eventGroup) {
      totalColumns = Math.max(totalColumns, eventGroupItem.columnIndex + 1);
    }
  }

  for (const eventGroup of eventGroups) {
    eventGroup.sort((columnGroupItemA, columnGroupItemB) => {
      return columnGroupItemA.columnIndex < columnGroupItemB.columnIndex ? -1 : 1;
    });

    for (let i = 0; i < eventGroup.length; i += 1) {
      const loopEventGroupItem = eventGroup[i];
      if (i === eventGroup.length - 1) {
        loopEventGroupItem.columnSpan = totalColumns - loopEventGroupItem.columnIndex;
      } else {
        const nextLoopEventGroupItem = eventGroup[i + 1];
        loopEventGroupItem.columnSpan = nextLoopEventGroupItem.columnIndex - loopEventGroupItem.columnIndex;
      }
    }
  }

  for (let i = 0; i < events.length; i += 1) {
    let lowestColumnSpan = Infinity;

    for (const eventGroup of eventGroups) {
      for (const eventGroupItem of eventGroup) {
        if (eventGroupItem.eventIndex === i) {
          lowestColumnSpan = Math.min(lowestColumnSpan, eventGroupItem.columnSpan);
        }
      }
    }

    for (const eventGroup of eventGroups) {
      for (const eventGroupItem of eventGroup) {
        if (eventGroupItem.eventIndex === i) {
          eventGroupItem.columnSpan = lowestColumnSpan;
        }
      }
    }
  }

  return { eventGroups, totalColumns };
}

function sortEventsByTime(events) {
  events.sort((eventA, eventB) => {
    if (eventStartsBefore(eventA, eventB)) {
      return -1;
    }

    if (eventStartsBefore(eventB, eventA)) {
      return 1
    }

    return eventEndsBefore(eventA, eventB) ? 1 : -1;
  });
}

function initMultiDaySpanningEvents(allDayListElement, multiDayEvents, weekDays) {
  if (!multiDayEvents || multiDayEvents.length === 0 || !allDayListElement || !weekDays) return;

  // Create a map of date to column index
  const dateToColumnIndex = new Map();
  weekDays.forEach((day, index) => {
    if (day) {
      const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      dateToColumnIndex.set(dateKey, index);
    }
  });

  // Get the first and last day of the week for clipping
  const weekStart = weekDays[0];
  const weekEnd = weekDays[weekDays.length - 1];
  
  if (!weekStart || !weekEnd) return;

  for (const event of multiDayEvents) {
    if (!event || !event.date) continue;
    
    try {
      const eventStart = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate());
      const eventEnd = new Date((event.endDate || event.date).getFullYear(), (event.endDate || event.date).getMonth(), (event.endDate || event.date).getDate());

      // Clip event to visible week range
      const visibleStart = eventStart < weekStart ? weekStart : eventStart;
      const visibleEnd = eventEnd > weekEnd ? weekEnd : eventEnd;

      const startKey = `${visibleStart.getFullYear()}-${visibleStart.getMonth()}-${visibleStart.getDate()}`;
      const endKey = `${visibleEnd.getFullYear()}-${visibleEnd.getMonth()}-${visibleEnd.getDate()}`;

      const startColumnIndex = dateToColumnIndex.get(startKey);
      const endColumnIndex = dateToColumnIndex.get(endKey);

      if (startColumnIndex === undefined || endColumnIndex === undefined) {
        continue; // Event doesn't overlap with this week
      }

      // Create the spanning bar element
      const spanningBar = document.createElement("div");
      spanningBar.classList.add("week-calendar__all-day-item", "week-calendar__spanning-event");
      spanningBar.style.setProperty("--event-color", event.color || "#3b82f6");
      
      // Calculate positioning
      const totalColumns = weekDays.length;
      const leftPercent = (startColumnIndex / totalColumns) * 100;
      const rightPercent = ((totalColumns - endColumnIndex - 1) / totalColumns) * 100;
      
      // Use CSS custom properties for responsive positioning
      spanningBar.style.setProperty("--span-left", `${leftPercent}%`);
      spanningBar.style.setProperty("--span-right", `${rightPercent}%`);
      
      // Fallback for mobile (no padding-left)
      spanningBar.style.left = `${leftPercent}%`;
      spanningBar.style.right = `${rightPercent}%`;

      // Create event element - use dummy styles since we're positioning the container
      const dummyStyles = { top: '0', left: '0', bottom: 'auto', right: '0' };
      initDynamicEvent(spanningBar, event, dummyStyles);

      allDayListElement.appendChild(spanningBar);
    } catch (e) {
      console.error('Error rendering spanning event:', e, event);
    }
  }
}

function initCurrentTimeIndicator(columnsElement, weekDays, todayDate) {
  // Find today's column index
  const todayColumnIndex = weekDays.findIndex(day => isTheSameDay(day, todayDate));
  if (todayColumnIndex === -1) return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const topPercentage = (currentMinutes / 1440) * 100;

  // Get today's column element
  const columns = columnsElement.querySelectorAll('[data-week-calendar-column]');
  if (!columns[todayColumnIndex]) return;

  const todayColumn = columns[todayColumnIndex];

  // Create current time indicator line
  const indicator = document.createElement('div');
  indicator.classList.add('week-calendar__current-time-indicator');
  indicator.style.top = `${topPercentage}%`;

  todayColumn.appendChild(indicator);
}
