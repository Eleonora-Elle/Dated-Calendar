import { generateMonthCalendarDays, today, isTheSameDay } from "./date.js";
import { isEventAllDay, eventStartsBefore } from "./event.js";
import { initEventList } from "./event-list.js";

const calendarTemplateElemenent = document.querySelector("[data-template='month-calendar']");
const calendarDayTemplateElement = document.querySelector("[data-template='month-calendar-day']");

const calendarWeekClasses = {
  4: "four-week",
  5: "five-week",
  6: "six-week"
};

export function initMonthCalendar(parent, selectedDate, eventStore) {
  const calendarContent = calendarTemplateElemenent.content.cloneNode(true);
  const calendarElement = calendarContent.querySelector("[data-month-calendar]");
  const calendarDayListElement = calendarElement.querySelector("[data-month-calendar-day-list]");

  const calendarDays = generateMonthCalendarDays(selectedDate);
  const calendarWeeks = calendarDays.length / 7;

  const calendarWeekClass = calendarWeekClasses[calendarWeeks];
  calendarElement.classList.add(calendarWeekClass);

  for (const calendarDay of calendarDays) {
    const events = eventStore.getEventsByDate(calendarDay);
    
    // Normalize multi-day events so they appear as all-day on each day they span
    const normalizedEvents = events.map((ev) => {
      // Only normalize if event has an endDate different from startDate
      if (!ev.endDate || ev.endDate.toDateString() === ev.date.toDateString()) {
        return ev;
      }
      
      const evStart = new Date(ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate());
      const evEnd = new Date(ev.endDate.getFullYear(), ev.endDate.getMonth(), ev.endDate.getDate());
      const current = new Date(calendarDay.getFullYear(), calendarDay.getMonth(), calendarDay.getDate());

      // For middle days of a multi-day event, show as all-day
      if (evStart < current && evEnd > current) {
        return { ...ev, startTime: 0, endTime: 1440 };
      }

      // For start day of a multi-day event, extend to end of day
      if (evStart.getTime() === current.getTime() && evEnd > current) {
        return { ...ev, endTime: 1440 };
      }

      // For end day of a multi-day event, start from beginning of day
      if (evStart < current && evEnd.getTime() === current.getTime()) {
        return { ...ev, startTime: 0 };
      }

      // Same-day event, no changes needed
      return ev;
    });
    
    sortCalendarDayEvents(normalizedEvents);

  initCalendarDay(calendarDayListElement, calendarDay, normalizedEvents, selectedDate);
  }

  parent.appendChild(calendarElement);
}

function initCalendarDay(parent, calendarDay, events, selectedDate) {
  const calendarDayContent = calendarDayTemplateElement.content.cloneNode(true);
  const calendarDayElemenent = calendarDayContent.querySelector("[data-month-calendar-day]");
  const calendarDayLabelElemenent = calendarDayContent.querySelector("[data-month-calendar-day-label]");
  const calendarEventListWrapper = calendarDayElemenent.querySelector("[data-month-calendar-event-list-wrapper]");

  const todayDate = today();
  if (selectedDate.getFullYear() === todayDate.getFullYear() &&
      selectedDate.getMonth() === todayDate.getMonth() &&
      isTheSameDay(todayDate, calendarDay) &&
      calendarDay.getMonth() === selectedDate.getMonth()) {
    calendarDayElemenent.classList.add("month-calendar__day--highlight");
  }

  calendarDayLabelElemenent.textContent = calendarDay.getDate();

  calendarDayLabelElemenent.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("date-change", {
      detail: {
        date: calendarDay
      },
      bubbles: true
    }));

    document.dispatchEvent(new CustomEvent("view-change", {
      detail: {
        view: 'day'
      },
      bubbles: true
    }));
  });

  calendarEventListWrapper.addEventListener("click", () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    // Start time: current time + 1 hour, rounded to nearest 30 min
    const startTime = Math.ceil((currentMinutes + 60) / 30) * 30;
    // End time: start time + 30 minutes
    const endTime = startTime + 30;
    
    document.dispatchEvent(new CustomEvent("event-create-request", {
      detail: {
        date: calendarDay,
        startTime: startTime,
        endTime: endTime
      },
      bubbles: true
    }));
  });

  initEventList(calendarDayElemenent, events, calendarDay);

  parent.appendChild(calendarDayElemenent);
}

function sortCalendarDayEvents(events) {
  events.sort((eventA, eventB) => {
    if (isEventAllDay(eventA)) {
      return -1;
    }

    if (isEventAllDay(eventB)) {
      return 1;
    }

    return eventStartsBefore(eventA, eventB) ? -1 : 1;
  });
}