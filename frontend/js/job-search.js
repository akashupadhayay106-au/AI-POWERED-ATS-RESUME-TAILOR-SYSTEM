// job-search.js — Frontend Live Job Search Component

const BACKEND_URL = "http://localhost:8088";

class JobSearchComponent {
  constructor() {
    this.queryInput = document.getElementById("jobQuery");
    this.locationSelect = document.getElementById("jobLocation");
    this.searchBtn = document.getElementById("btnSearchJobs");
    this.statusEl = document.getElementById("jobSearchStatus");
    this.resultsGrid = document.getElementById("jobResults");

    if (this.searchBtn) {
      this.searchBtn.addEventListener("click", () => this.performSearch());
    }

    // Press Enter to search
    if (this.queryInput) {
      this.queryInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.performSearch();
        }
      });
    }

    // Auto-search on initialization
    this.performSearch();
  }

  setStatus(msg, isError = false) {
    if (!this.statusEl) return;
    this.statusEl.textContent = msg;
    this.statusEl.className = "status-bar" + (isError ? " error" : "");
  }

  showLoading() {
    this.setStatus("⏳ Fetching jobs from Adzuna API...");
    if (this.searchBtn) {
      this.searchBtn.disabled = true;
      this.searchBtn.textContent = "Searching...";
    }

    // Render loading skeletons
    if (this.resultsGrid) {
      this.resultsGrid.innerHTML = Array(3)
        .fill(0)
        .map(
          () => `
          <div class="job-card-skeleton">
            <div class="skeleton-line wide"></div>
            <div class="skeleton-line mid"></div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-line tall" style="margin-top: 0.5rem;"></div>
          </div>
        `
        )
        .join("");
    }
  }

  hideLoading() {
    if (this.searchBtn) {
      this.searchBtn.disabled = false;
      this.searchBtn.textContent = "Search Jobs";
    }
  }

  escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async performSearch() {
    if (!this.queryInput || !this.locationSelect || !this.resultsGrid) return;

    const query = this.queryInput.value.trim();
    const location = this.locationSelect.value;

    if (!query) {
      this.setStatus("⚠️ Please enter a job keyword or title.", true);
      this.resultsGrid.innerHTML = `<p class="empty-state">Please enter a keyword to search.</p>`;
      return;
    }

    this.showLoading();

    try {
      const response = await fetch(`${BACKEND_URL}/api/search-jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: query,
          location: location,
          limit: 10
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.jobs && data.jobs.length > 0) {
        this.setStatus(`✅ Found ${data.jobs.length} jobs.`);
        this.renderJobs(data.jobs);
      } else {
        this.setStatus("ℹ️ No jobs found. Try different keywords or location.");
        this.resultsGrid.innerHTML = `
          <div class="job-search-empty">
            <div class="empty-icon">📂</div>
            <p>No jobs matched your search query in this location.</p>
          </div>
        `;
      }
    } catch (err) {
      console.error(err);
      this.setStatus(`❌ Failed to load jobs: ${err.message}`, true);
      this.resultsGrid.innerHTML = `
        <div class="job-search-error">
          <strong>Connection Error:</strong> Could not connect to the backend server.
          <br>Please verify the backend server is running on port 8088.
        </div>
      `;
    } finally {
      this.hideLoading();
    }
  }

  renderJobs(jobs) {
    if (!this.resultsGrid) return;

    this.resultsGrid.innerHTML = jobs
      .map((job) => {
        const title = this.escapeHtml(job.title);
        const company = this.escapeHtml(job.company);
        const location = this.escapeHtml(job.location);
        const desc = this.escapeHtml(job.description);
        const salaryBadge = job.salary ? `<span class="job-salary-tag">${this.escapeHtml(job.salary)}</span>` : "";
        const dateText = job.posted_date ? `Posted: ${job.posted_date}` : "";
        const applyLink = job.apply_link || "#";

        return `
        <div class="job-card" data-id="${this.escapeHtml(job.id)}" data-description="${this.escapeHtml(job.description)}">
          <div class="job-title">${title}</div>
          <div class="job-company">${company}</div>
          <div class="job-card-meta">
            <span class="job-meta-tag">📍 ${location}</span>
            ${salaryBadge}
          </div>
          <div class="job-desc">${desc}</div>
          <div class="job-card-footer" style="flex-wrap: wrap;">
            <span class="job-date">${dateText}</span>
            <div style="display: flex; gap: 0.4rem; width: 100%; margin-top: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm btn-select-job" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">📋 Select Job</button>
              <button type="button" class="btn btn-secondary btn-sm btn-shortlist-job" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">📌 Shortlist</button>
              <a href="${applyLink}" target="_blank" rel="noopener noreferrer" class="btn-apply" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Apply Now ➜</a>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Attach click listeners to all select-job buttons
    this.resultsGrid.querySelectorAll(".btn-select-job").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const card = e.target.closest(".job-card");
        if (!card) return;

        const description = card.getAttribute("data-description");
        const jdInput = document.getElementById("targetJdInput");
        if (jdInput) {
          jdInput.value = description || "";
          
          // Flash input area green briefly to show action succeeded
          jdInput.style.borderColor = "var(--success)";
          setTimeout(() => {
            jdInput.style.borderColor = "var(--glass-border)";
          }, 1500);

          // Focus editor tab
          const tabForm = document.getElementById("tabForm");
          if (tabForm) tabForm.click();

          // Scroll smoothly to editor scoring panel
          const scoringPanel = document.getElementById("scoring-panel");
          if (scoringPanel) {
            scoringPanel.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      });
    });

    // Attach click listeners to shortlist buttons
    this.resultsGrid.querySelectorAll(".btn-shortlist-job").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const card = e.target.closest(".job-card");
        if (!card) return;

        const id = card.getAttribute("data-id");
        const title = card.querySelector(".job-title").textContent;
        const company = card.querySelector(".job-company").textContent;
        const location = card.querySelector(".job-meta-tag").textContent.replace("📍 ", "");

        if (window.shortlistJob) {
          window.shortlistJob({ id, title, company, location });
        }
      });
    });
  }
}

// Initialize when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  window.jobSearchComponent = new JobSearchComponent();
});
