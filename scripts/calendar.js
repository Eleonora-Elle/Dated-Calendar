import { initMonthCalendar } from "./month-calendar.js";
import { initWeekCalendar } from "./week-calendar.js";
import { currentDeviceType } from "./responsive.js";
import { getUrlDate, getUrlView } from "./url.js";

export function initCalendar(eventStore) {
  const calendarElement = document.querySelector("[data-calendar]");

  if (!calendarElement) {
    console.error("Calendar element not found!");
    return;
  }

  let selectedView = getUrlView();
  let selectedDate = getUrlDate();
  let deviceType = currentDeviceType();
  let isRefreshing = false; // Prevent multiple simultaneous refreshes

  function refreshCalendar() {
    if (isRefreshing) return;
    isRefreshing = true;
    
    try {
      const calendarScrollableElement = calendarElement.querySelector("[data-calendar-scrollable]");

      const scrollTop = calendarScrollableElement === null ? 0 : calendarScrollableElement.scrollTop;

      calendarElement.replaceChildren();

      if (selectedView === "month") {
        initMonthCalendar(calendarElement, selectedDate, eventStore);
      } else if (selectedView === "week") {
        initWeekCalendar(calendarElement, selectedDate, eventStore, false, deviceType);
      } else {
        initWeekCalendar(calendarElement, selectedDate, eventStore, true, deviceType);
      }

      // Restore scroll position after a brief delay to ensure DOM is ready
      setTimeout(() => {
        const newScrollableElement = calendarElement.querySelector("[data-calendar-scrollable]");
        if (newScrollableElement) {
          newScrollableElement.scrollTo({ top: scrollTop });
        }
        isRefreshing = false;
      }, 0);
    } catch (error) {
      console.error("Error refreshing calendar:", error);
      isRefreshing = false;
    }
  }

  document.addEventListener("view-change", (event) => {
    selectedView = event.detail.view;
    refreshCalendar();
  });

  document.addEventListener("date-change", (event) => {
    selectedDate = event.detail.date;
    refreshCalendar();
  });

  document.addEventListener("device-type-change", (event) => {
    deviceType = event.detail.deviceType;
    refreshCalendar();
  });

  document.addEventListener("events-change", () => {
    refreshCalendar();
  });

  refreshCalendar();
}