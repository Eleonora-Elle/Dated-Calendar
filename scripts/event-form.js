import { validateEvent, generateEventId } from "./event.js";

export function initEventForm(toaster) {
  const formElement = document.querySelector("[data-event-form]");

  let mode = "create";

  formElement.addEventListener("submit", (event) => {
    event.preventDefault();
    const formEvent = formIntoEvent(formElement);
    const validationError = validateEvent(formEvent);
    if (validationError !== null) {
      toaster.error(validationError);
      return;
    }

    if (mode === "create") {
      formElement.dispatchEvent(new CustomEvent("event-create", {
        detail: {
          event: formEvent
        },
        bubbles: true
      }));
    }

    if (mode === "edit") {
      formElement.dispatchEvent(new CustomEvent("event-edit", {
        detail: {
          event: formEvent
        },
        bubbles: true
      }));
    }
  });

  return {
    formElement,
    switchToCreateMode(date, startTime, endTime) {
      mode = "create";
      fillFormWithDate(formElement, date, startTime, endTime);
      // reset checkboxes state each time dialog opens in create mode
      const allDayCheckbox = document.getElementById('all-day-checkbox');
      const sameDateCheckbox = document.getElementById('same-date-checkbox');
      const startTimeSelect = document.getElementById('start-time');
      const endTimeSelect = document.getElementById('end-time');
      const endDateInput = document.getElementById('end-date');
      
      if (allDayCheckbox) {
        allDayCheckbox.checked = false;
        if (startTimeSelect) startTimeSelect.disabled = false;
        if (endTimeSelect) endTimeSelect.disabled = false;
      }
      if (sameDateCheckbox) {
        sameDateCheckbox.checked = false;
        if (endDateInput) endDateInput.disabled = false;
      }
    },
    switchToEditMode(event) {
      mode = "edit";
      fillFormWithEvent(formElement, event);
    },
    reset() {
      formElement.querySelector("#id").value = null;
      formElement.reset();
    }
  };
}

function fillFormWithDate(formElement, date, startTime, endTime) {
  const dateInputElement = formElement.querySelector("#date");
  const startTimeSelectElement = formElement.querySelector("#start-time");
  const endTimeSelectElement = formElement.querySelector("#end-time");
  const endDateInputElement = formElement.querySelector("#end-date");

  dateInputElement.value = date.toISOString().substr(0, 10);
  // default end date is the same as start date
  if (endDateInputElement) endDateInputElement.value = date.toISOString().substr(0, 10);
  startTimeSelectElement.value = startTime;
  endTimeSelectElement.value = endTime;
}

function fillFormWithEvent(formElement, event) {
  const idInputElement = formElement.querySelector("#id");
  const titleInputElement = formElement.querySelector("#title");
  const dateInputElement = formElement.querySelector("#date");
  const endDateInputElement = formElement.querySelector("#end-date");
  const startTimeSelectElement = formElement.querySelector("#start-time");
  const endTimeSelectElement = formElement.querySelector("#end-time");
  const colorInputElement = formElement.querySelector(`[value='${event.color}']`);

  idInputElement.value = event.id;
  titleInputElement.value = event.title;
  dateInputElement.value = event.date.toISOString().substr(0, 10);
  if (endDateInputElement && event.endDate) endDateInputElement.value = event.endDate.toISOString().substr(0, 10);
  startTimeSelectElement.value = event.startTime;
  endTimeSelectElement.value = event.endTime;
  colorInputElement.checked = true;
}

function formIntoEvent(formElement) {
  const formData = new FormData(formElement);
  const id = formData.get("id");
  const title = formData.get("title");
  const date = formData.get("date");
  const endDate = formData.get("end-date");
  const startTime = formData.get("start-time");
  const endTime = formData.get("end-time");
  const color = formData.get("color");
  const allDayChecked = document.getElementById('all-day-checkbox')?.checked;

  const event = {
    id: id ? Number.parseInt(id, 10) : generateEventId(),
    title,
    date: new Date(date),
    endDate: endDate ? new Date(endDate) : new Date(date),
    startTime: allDayChecked ? 0 : Number.parseInt(startTime, 10),
    endTime: allDayChecked ? 1440 : Number.parseInt(endTime, 10),
    color
  };

  return event;
}

// Checkbox behaviors (keep outside initEventForm so listeners attach once on module load)
const allDayCheckbox = document.getElementById('all-day-checkbox');
const sameDateCheckbox = document.getElementById('same-date-checkbox');
const startTimeSelect = document.getElementById('start-time');
const endTimeSelect = document.getElementById('end-time');
const startDateInput = document.getElementById('date');
const endDateInput = document.getElementById('end-date');

// Checkbox behaviors (keep outside so listeners attach once)
if (allDayCheckbox && startTimeSelect && endTimeSelect) {
  allDayCheckbox.addEventListener('change', function() {
    if (this.checked) {
      startTimeSelect.value = '0';
      endTimeSelect.value = '1440';
      startTimeSelect.disabled = true;
      endTimeSelect.disabled = true;
    } else {
      startTimeSelect.disabled = false;
      endTimeSelect.disabled = false;
    }
  });
}

if (sameDateCheckbox && startDateInput && endDateInput) {
  function syncEndDate() {
    if (sameDateCheckbox.checked) {
      endDateInput.value = startDateInput.value;
      endDateInput.disabled = true;
    } else {
      endDateInput.disabled = false;
    }
  }
  sameDateCheckbox.addEventListener('change', syncEndDate);
  startDateInput.addEventListener('input', function() {
    if (sameDateCheckbox.checked) {
      endDateInput.value = startDateInput.value;
    }
  });
}

// ...existing code...

