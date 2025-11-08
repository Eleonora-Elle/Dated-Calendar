import { initDialog } from "./dialog.js";

export function initEventDeleteDialog() {
  const dialog = initDialog("event-delete");

  const deleteButtonElement = dialog.dialogElement.querySelector("[data-event-delete-button]");
  const optionAllElement = dialog.dialogElement.querySelector("[data-delete-option-all]");
  const optionDayElement = dialog.dialogElement.querySelector("[data-delete-option-day]");
  const optionRangeElement = dialog.dialogElement.querySelector("[data-delete-option-range]");
  const rangeFieldsElement = dialog.dialogElement.querySelector("[data-delete-range-fields]");
  const rangeStartInput = dialog.dialogElement.querySelector("[data-delete-range-start]");
  const rangeEndInput = dialog.dialogElement.querySelector("[data-delete-range-end]");
  const clickedDateLabelElement = dialog.dialogElement.querySelector("[data-delete-clicked-date-label]");
  const deleteFieldsContainer = dialog.dialogElement.querySelector("[data-delete-option-all]")?.closest(".form__fields");

  let currentEvent = null;
  let clickedDate = null;

  document.addEventListener("event-delete-request", (event) => {
    currentEvent = event.detail.event;
    clickedDate = event.detail.event.clickedDate || event.detail.event.date;
    fillEventDeleteDialog(dialog.dialogElement, event.detail.event, clickedDate);
    setupDeleteOptionsUI(currentEvent, clickedDate, {
      optionAllElement,
      optionDayElement,
      optionRangeElement,
      rangeFieldsElement,
      rangeStartInput,
      rangeEndInput,
      clickedDateLabelElement,
      deleteButtonElement,
      deleteFieldsContainer
    });
    dialog.open();
  });

  deleteButtonElement.addEventListener("click", () => {
    const isMultiDay = currentEvent.endDate && 
      (currentEvent.endDate.toDateString() !== currentEvent.date.toDateString());
    dialog.close().then(() => {
      // Determine selected option
      const selectedOption = getSelectedDeleteOption({ optionAllElement, optionDayElement, optionRangeElement });
      if (!isMultiDay || selectedOption === "all") {
        // Always delete entire event if single-day or 'all' selected
        dispatchDelete(deleteButtonElement, currentEvent);
        return;
      }

      if (selectedOption === "day" && clickedDate) {
        handleMultiDayEventDelete(currentEvent, clickedDate, deleteButtonElement);
        return;
      }

      if (selectedOption === "range") {
        const rangeStart = parseDateInput(rangeStartInput.value);
        const rangeEnd = parseDateInput(rangeEndInput.value);
        if (rangeStart && rangeEnd) {
          handleMultiDayRangeDelete(currentEvent, rangeStart, rangeEnd, deleteButtonElement);
        } else {
          // Fallback: if invalid range just do nothing (could show toast if system supports it)
        }
      }
    });
  });
}

function handleMultiDayEventDelete(event, clickedDate, triggerElement) {
  const eventStart = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate());
  const eventEnd = new Date(event.endDate.getFullYear(), event.endDate.getMonth(), event.endDate.getDate());
  const clicked = new Date(clickedDate.getFullYear(), clickedDate.getMonth(), clickedDate.getDate());
  
  // Check if clicked date is the first day
  if (clicked.getTime() === eventStart.getTime()) {
    // Move start date forward by 1 day
    const newStartDate = new Date(clicked);
    newStartDate.setDate(newStartDate.getDate() + 1);
    
    if (newStartDate <= eventEnd) {
      const updatedEvent = { ...event, date: newStartDate };
      triggerElement.dispatchEvent(new CustomEvent("event-edit", {
        detail: { event: updatedEvent },
        bubbles: true
      }));
    } else {
      // Only one day left, delete entire event
      triggerElement.dispatchEvent(new CustomEvent("event-delete", {
        detail: { event },
        bubbles: true
      }));
    }
  }
  // Check if clicked date is the last day
  else if (clicked.getTime() === eventEnd.getTime()) {
    // Move end date back by 1 day
    const newEndDate = new Date(clicked);
    newEndDate.setDate(newEndDate.getDate() - 1);
    
    if (newEndDate >= eventStart) {
      const updatedEvent = { ...event, endDate: newEndDate };
      triggerElement.dispatchEvent(new CustomEvent("event-edit", {
        detail: { event: updatedEvent },
        bubbles: true
      }));
    } else {
      // Only one day left, delete entire event
      triggerElement.dispatchEvent(new CustomEvent("event-delete", {
        detail: { event },
        bubbles: true
      }));
    }
  }
  // Clicked a middle day - split into two events
  else {
    // Create first event: original start to day before clicked
    const firstEventEnd = new Date(clicked);
    firstEventEnd.setDate(firstEventEnd.getDate() - 1);
    const firstEvent = { ...event, endDate: firstEventEnd };
    
    // Create second event: day after clicked to original end
    const secondEventStart = new Date(clicked);
    secondEventStart.setDate(secondEventStart.getDate() + 1);
    const secondEvent = {
      ...event,
      id: generateEventId(),
      date: secondEventStart,
      endDate: event.endDate
    };
    
    // Delete original and create two new events
    triggerElement.dispatchEvent(new CustomEvent("event-delete", {
      detail: { event },
      bubbles: true
    }));
    
    triggerElement.dispatchEvent(new CustomEvent("event-create", {
      detail: { event: firstEvent },
      bubbles: true
    }));
    
    triggerElement.dispatchEvent(new CustomEvent("event-create", {
      detail: { event: secondEvent },
      bubbles: true
    }));
  }
}

function generateEventId() {
  // Fallback for browsers without crypto.randomUUID()
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Simple fallback ID generator
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function fillEventDeleteDialog(parent, event, clickedDate) {
  const eventDeleteTitleElement = parent.querySelector("[data-event-delete-title]");
  
  const isMultiDay = event.endDate && 
    (event.endDate.toDateString() !== event.date.toDateString());
  if (isMultiDay && clickedDate) {
    const day = String(clickedDate.getDate()).padStart(2, '0');
    const month = String(clickedDate.getMonth() + 1).padStart(2, '0');
    const year = clickedDate.getFullYear();
    eventDeleteTitleElement.textContent = `${event.title} (${day}.${month}.${year})`;
  } else {
    eventDeleteTitleElement.textContent = event.title;
  }
}

function setupDeleteOptionsUI(event, clickedDate, {
  optionAllElement,
  optionDayElement,
  optionRangeElement,
  rangeFieldsElement,
  rangeStartInput,
  rangeEndInput,
  clickedDateLabelElement,
  deleteButtonElement,
  deleteFieldsContainer
}) {
  const isMultiDay = event.endDate && (event.endDate.toDateString() !== event.date.toDateString());

  // Show/hide the whole options section for single-day events
  if (deleteFieldsContainer) {
    deleteFieldsContainer.style.display = isMultiDay ? "" : "none";
  }

  // Reset radio selections
  [optionAllElement, optionDayElement, optionRangeElement].forEach(r => { if (r) r.checked = false; });
  if (isMultiDay) {
    // Default to deleting just the clicked day if we have one
    if (optionDayElement && clickedDate) optionDayElement.checked = true;
  } else if (optionAllElement) {
    optionAllElement.checked = true;
  }

  // Populate clicked date label
  if (clickedDateLabelElement) {
    if (isMultiDay && clickedDate) {
      const df = new Intl.DateTimeFormat("sl-SI", { day: 'numeric', month: 'long' });
      clickedDateLabelElement.textContent = `(${df.format(clickedDate)})`;
    } else {
      clickedDateLabelElement.textContent = "";
    }
  }

  // Suggest default range values equal to the entire event
  if (rangeStartInput) {
    rangeStartInput.value = toISODate(event.date);
  }
  if (rangeEndInput) {
    rangeEndInput.value = event.endDate ? toISODate(event.endDate) : toISODate(event.date);
  }

  // Toggle range fields visibility
  const toggleRangeFields = () => {
    if (!rangeFieldsElement) return;
    const selected = getSelectedDeleteOption({ optionAllElement, optionDayElement, optionRangeElement });
    rangeFieldsElement.style.display = selected === "range" ? "flex" : "none";
    validateRangeInputs(event, rangeStartInput, rangeEndInput, deleteButtonElement, selected);
  };

  [optionAllElement, optionDayElement, optionRangeElement].forEach(radio => {
    if (radio) radio.addEventListener("change", toggleRangeFields);
  });

  // Validate on input changes
  [rangeStartInput, rangeEndInput].forEach(inp => {
    if (inp) inp.addEventListener("input", () => {
      validateRangeInputs(event, rangeStartInput, rangeEndInput, deleteButtonElement, getSelectedDeleteOption({ optionAllElement, optionDayElement, optionRangeElement }));
    });
  });

  toggleRangeFields();
}

function getSelectedDeleteOption({ optionAllElement, optionDayElement, optionRangeElement }) {
  if (optionAllElement?.checked) return "all";
  if (optionDayElement?.checked) return "day";
  if (optionRangeElement?.checked) return "range";
  return "all"; // Fallback
}

function toISODate(date) {
  return `${date.getFullYear().toString().padStart(4,'0')}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
}

function parseDateInput(value) {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  return new Date(year, month, day);
}

function validateRangeInputs(event, startInput, endInput, deleteButtonElement, selectedOption) {
  if (selectedOption !== "range") {
    if (deleteButtonElement) deleteButtonElement.disabled = false;
    return;
  }
  const startDate = parseDateInput(startInput?.value);
  const endDate = parseDateInput(endInput?.value);
  const eventStart = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate());
  const eventEnd = event.endDate ? new Date(event.endDate.getFullYear(), event.endDate.getMonth(), event.endDate.getDate()) : eventStart;

  let valid = !!(startDate && endDate && startDate.getTime() <= endDate.getTime());
  // Must overlap event range
  if (valid) {
    const rangeOverlaps = !(endDate.getTime() < eventStart.getTime() || startDate.getTime() > eventEnd.getTime());
    valid = rangeOverlaps;
  }
  if (deleteButtonElement) deleteButtonElement.disabled = !valid;
}

function dispatchDelete(triggerElement, event) {
  triggerElement.dispatchEvent(new CustomEvent("event-delete", {
    detail: { event },
    bubbles: true
  }));
}

function dispatchEdit(triggerElement, event) {
  triggerElement.dispatchEvent(new CustomEvent("event-edit", {
    detail: { event },
    bubbles: true
  }));
}

function dispatchCreate(triggerElement, event) {
  triggerElement.dispatchEvent(new CustomEvent("event-create", {
    detail: { event },
    bubbles: true
  }));
}

function handleMultiDayRangeDelete(event, rangeStart, rangeEnd, triggerElement) {
  // Normalize start/end of event
  const eventStart = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate());
  const eventEnd = new Date(event.endDate.getFullYear(), event.endDate.getMonth(), event.endDate.getDate());
  // Clip range to event bounds (only deleting intersection)
  const deleteStart = new Date(Math.max(eventStart.getTime(), rangeStart.getTime()));
  const deleteEnd = new Date(Math.min(eventEnd.getTime(), rangeEnd.getTime()));

  if (deleteEnd.getTime() < deleteStart.getTime()) {
    return; // Nothing to delete
  }

  const remainingStartBeforeRangeEnd = new Date(deleteStart.getFullYear(), deleteStart.getMonth(), deleteStart.getDate() - 1);
  const remainingStartAfterRangeEnd = new Date(deleteEnd.getFullYear(), deleteEnd.getMonth(), deleteEnd.getDate() + 1);

  const deletesEntireEvent = deleteStart.getTime() === eventStart.getTime() && deleteEnd.getTime() === eventEnd.getTime();
  if (deletesEntireEvent) {
    dispatchDelete(triggerElement, event);
    return;
  }

  const deletesFromStart = deleteStart.getTime() === eventStart.getTime();
  const deletesFromEnd = deleteEnd.getTime() === eventEnd.getTime();

  if (deletesFromStart && !deletesFromEnd) {
    // Trim the start
    const newStartDate = remainingStartAfterRangeEnd;
    const updatedEvent = { ...event, date: newStartDate };
    dispatchEdit(triggerElement, updatedEvent);
    return;
  }

  if (deletesFromEnd && !deletesFromStart) {
    // Trim the end
    const newEndDate = remainingStartBeforeRangeEnd;
    const updatedEvent = { ...event, endDate: newEndDate };
    dispatchEdit(triggerElement, updatedEvent);
    return;
  }

  // Middle deletion - split into two events
  const firstEventEnd = remainingStartBeforeRangeEnd; // day before deleteStart
  const secondEventStart = remainingStartAfterRangeEnd; // day after deleteEnd

  const firstEvent = { ...event, endDate: firstEventEnd };
  const secondEvent = { ...event, id: generateEventId(), date: secondEventStart, endDate: eventEnd };

  dispatchDelete(triggerElement, event);
  dispatchCreate(triggerElement, firstEvent);
  dispatchCreate(triggerElement, secondEvent);
}