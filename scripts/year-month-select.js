export function initYearMonthSelect() {
  const yearMonthDialog = document.querySelector("[data-year-month-dialog]");
  const yearMonthSelect = document.querySelector("[data-year-month-select]");
  const viewSelect = document.querySelector("[data-view-select]");
  
  if (!yearMonthDialog || !yearMonthSelect) return;
  
  let previousView = null;
  const closeButton = yearMonthDialog.querySelector("[data-dialog-close-button]");

  // Initialize previous value with current view
  viewSelect.dataset.previousValue = viewSelect.value;

  // Handle close button click
  closeButton?.addEventListener("click", () => {
    yearMonthDialog.close();
  });

  // Create year options from 1999 to 2100
  const startYear = 1999;
  const endYear = 2100;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  const months = [
    "Januar", "Februar", "Marec", "April", "Maj", "Junij",
    "Julij", "Avgust", "September", "Oktober", "November", "December"
  ];

  // Listen for view select changes
  viewSelect?.addEventListener("change", (e) => {
    if (e.target.value === "year") {
      e.preventDefault();
      // Store the previous view before showing dialog
      previousView = e.target.dataset.previousValue || "month";
      yearMonthDialog.showModal();
    } else {
      // Update the previous value whenever view changes
      e.target.dataset.previousValue = e.target.value;
    }
  });

  // Generate year-month grid
  yearMonthSelect.innerHTML = `
    <div class="year-month-select">
      <div class="year-month-select__years" style="display: grid;">
        ${years.map(year => `
          <button class="button button--secondary year-month-select__year" data-year="${year}">
            ${year}
          </button>
        `).join("")}
      </div>
      <div class="year-month-select__months" style="display: none;" data-month-grid="">
        ${months.map((month, index) => `
          <button class="button button--secondary year-month-select__month" data-month="${index}">
            ${month}
          </button>
        `).join("")}
      </div>
    </div>
  `;

  // Mark the current year button so it can be styled
  try {
    const _currentYear = new Date().getFullYear();
    const _btn = yearMonthSelect.querySelector(`.year-month-select__year[data-year="${_currentYear}"]`);
    if (_btn) _btn.classList.add("year-month-select__year--current");
  } catch (err) {
    // ignore if selector fails in older browsers
  }

  let selectedYear = null;

  // Handle year selection
  yearMonthSelect.addEventListener("click", (e) => {
    const yearBtn = e.target.closest("[data-year]");
    const monthBtn = e.target.closest("[data-month]");
    
    if (yearBtn) {
      selectedYear = parseInt(yearBtn.dataset.year);
      // Show months after year selection
      const yearsGrid = yearMonthSelect.querySelector(".year-month-select__years");
      const monthsGrid = yearMonthSelect.querySelector("[data-month-grid]");
      
      if (yearsGrid && monthsGrid) {
        yearsGrid.style.display = "none";
        monthsGrid.style.display = "grid";
      }
    }
    
    if (monthBtn && selectedYear) {
      const month = parseInt(monthBtn.dataset.month);
      const date = new Date(selectedYear, month, 1);
      
      // Set view to month and trigger change event
      viewSelect.value = "month";
      viewSelect.dispatchEvent(new Event("change"));
      
      yearMonthDialog.close();
      // Reset view for next time
      yearMonthSelect.querySelector(".year-month-select__years").style.display = "grid";
      yearMonthSelect.querySelector("[data-month-grid]").style.display = "none";
      selectedYear = null;

      // Dispatch date change event
      document.querySelector("[data-nav-date]").dispatchEvent(new CustomEvent("date-change", {
        detail: { date },
        bubbles: true
      }));
    }
  });

  // Handle dialog close
  yearMonthDialog.addEventListener("close", () => {
    // Reset dialog state
    yearMonthSelect.querySelector(".year-month-select__years").style.display = "grid";
    yearMonthSelect.querySelector("[data-month-grid]").style.display = "none";
    selectedYear = null;

    // Restore previous view if dialog was cancelled (not a month selection)
    if (previousView && viewSelect.value === "year") {
      viewSelect.value = previousView;
      viewSelect.dispatchEvent(new Event("change"));
      previousView = null;
    }
  });
}

