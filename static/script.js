/* ═══════════════════════════════════════════════════════════════
   TRIPMATE AI — LUXURY TRAVEL COMPANION SCRIPT
   Senior Frontend Architecture · State Management & API Engine
   ═══════════════════════════════════════════════════════════════ */

/* ── 1. State Management & Constants ────────────────────────── */
let currentThreadId = localStorage.getItem("travel_thread_id") || null;
let latestAnswerMarkdown = "";
let waitingForApproval = false;
let stageInterval = null;

// User Builder Selections
const plannerState = {
  duration: "7 Days",
  style: "Boutique & Cultural",
  travelers: "Couple (2 People)",
  budget: "Balanced Premium",
  goalMode: "full"
};

// Specialist Agent Metadata Dictionary
const AGENT_META = {
  flight_agent:    { label: "Flight Intelligence Agent",   icon: "✈️", color: "#2dd4bf" },
  hotel_agent:     { label: "Boutique Stay Curator",     icon: "🏨", color: "#d4af37" },
  weather_agent:   { label: "Climate & Seasonality Agent", icon: "🌦️", color: "#38bdf8" },
  budget_agent:    { label: "Financial Optimization Agent", icon: "💰", color: "#34d399" },
  itinerary_agent: { label: "Master Itinerary Composer",   icon: "🗓️", color: "#a78bfa" }
};

/* ── 2. Lifecycle Initializations ───────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initCharCounter();
  initHeroCounters();
  initTypingPlaceholder();
});

/* ── 3. Navigation & Focus Helpers ──────────────────────────── */
function scrollToCockpit() {
  const planner = document.getElementById("planner");
  if (!planner) return;
  planner.scrollIntoView({ behavior: "smooth", block: "start" });

  const input = document.getElementById("userInput");
  if (input) {
    setTimeout(() => input.focus(), 400);
  }
}

/* ── 4. Form & Character Counter ────────────────────────────── */
function initCharCounter() {
  const input = document.getElementById("userInput");
  const counter = document.getElementById("charCount");
  if (!input || !counter) return;

  input.addEventListener("input", () => {
    const len = input.value.length;
    const max = parseInt(input.getAttribute("maxlength") || "1200", 10);
    counter.textContent = `${len} / ${max}`;
    counter.classList.remove("warn", "limit");
    if (len >= max) {
      counter.classList.add("limit");
    } else if (len >= max * 0.8) {
      counter.classList.add("warn");
    }
  });
}

/* ── 5. Hero Agent Counter ──────────────────────────────────── */
function initHeroCounters() {
  const metricEl = document.getElementById("metricAgents");
  if (!metricEl) return;

  let count = 0;
  const target = 5;
  const duration = 1200;
  const step = duration / target;

  const interval = setInterval(() => {
    count++;
    metricEl.textContent = String(count).padStart(2, "0");
    if (count >= target) clearInterval(interval);
  }, step);
}

/* ── 6. Placeholder Typing Cycle ────────────────────────────── */
function initTypingPlaceholder() {
  const input = document.getElementById("userInput");
  if (!input) return;

  const prompts = [
    "e.g. Plan 7 days in Japan from Colombo for two people with flights, boutique hotels, tea ceremonies and a budget of LKR 500,000…",
    "e.g. 5 days in Dubai for a couple with desert safari, rooftop dining, boutique hotels, and flight options from Colombo…",
    "e.g. 8 days Swiss Alps journey for a family with scenic mountain train rides, chalet stays, and fondue tastings…",
    "e.g. 7 days coastal escape in Amalfi & Positano with private boat charters, cliffside dining, and luxury boutique villas…",
    "e.g. 6 days Ceylon highlands in Sri Lanka — Ella tea country trains, heritage bungalows, and spice garden visits…"
  ];

  let promptIdx = 0;
  let charIdx = 0;
  let deleting = false;
  let paused = false;

  function tick() {
    if (document.activeElement === input || (input.value && input.value.trim().length > 0)) {
      setTimeout(tick, 600);
      return;
    }

    const currentPrompt = prompts[promptIdx];

    if (paused) {
      paused = false;
      deleting = true;
      setTimeout(tick, 2200);
      return;
    }

    if (!deleting) {
      charIdx++;
      input.setAttribute("placeholder", currentPrompt.slice(0, charIdx));
      if (charIdx >= currentPrompt.length) {
        paused = true;
        setTimeout(tick, 100);
      } else {
        setTimeout(tick, 26);
      }
    } else {
      charIdx--;
      input.setAttribute("placeholder", currentPrompt.slice(0, charIdx));
      if (charIdx <= 0) {
        deleting = false;
        promptIdx = (promptIdx + 1) % prompts.length;
        setTimeout(tick, 400);
      } else {
        setTimeout(tick, 14);
      }
    }
  }

  setTimeout(tick, 1000);
}

/* ── 7. Interactive Tuners & Goal Modes ──────────────────────── */
function setGoalMode(mode, triggerBtn) {
  plannerState.goalMode = mode;
  const pills = document.querySelectorAll(".intent-pill");
  pills.forEach((p) => p.classList.remove("active"));
  if (triggerBtn) triggerBtn.classList.add("active");

  const input = document.getElementById("userInput");
  if (!input) return;

  if (mode === "flight") {
    input.value = "Give me all available flight options and airlines from Colombo to Tokyo with schedule intelligence.";
  } else if (mode === "hotel") {
    input.value = "Find top curated boutique hotels and luxury stays in Kyoto with scenic views and authentic architecture.";
  } else {
    updatePromptFromBuilders();
  }
  input.dispatchEvent(new Event("input"));
}

function setDurationOption(days, btn) {
  plannerState.duration = `${days} Days`;
  updateActivePill("durationSelector", btn);
  updatePromptFromBuilders();
}

function setStyleOption(style, btn) {
  plannerState.style = style;
  updateActivePill("styleSelector", btn);
  updatePromptFromBuilders();
}

function setTravelerOption(travelers, btn) {
  plannerState.travelers = travelers;
  updateActivePill("travelerSelector", btn);
  updatePromptFromBuilders();
}

function setBudgetOption(budget, btn) {
  plannerState.budget = budget;
  updateActivePill("budgetSelector", btn);
  updatePromptFromBuilders();
}

function updateActivePill(containerId, activeBtn) {
  const container = document.getElementById(containerId);
  if (!container || !activeBtn) return;
  container.querySelectorAll(".tuner-pill, .select-pill").forEach((p) => p.classList.remove("active"));
  activeBtn.classList.add("active");
}

function updatePromptFromBuilders() {
  const input = document.getElementById("userInput");
  if (!input) return;

  const currentVal = input.value.trim();
  if (currentVal === "" || currentVal.startsWith("Plan a ")) {
    input.value = `Plan a ${plannerState.duration} trip for ${plannerState.travelers} with a ${plannerState.style} travel style and a ${plannerState.budget} budget strategy. Include flights, curated boutique stays, and standout culinary experiences.`;
    input.dispatchEvent(new Event("input"));
  }
}

function selectDestination(destination, days, origin, vibes) {
  const input = document.getElementById("userInput");
  if (input) {
    input.value = `Plan a complete ${days} days ${destination} trip from ${origin} including flights, curated boutique accommodations, ${vibes}.`;
    input.dispatchEvent(new Event("input"));
  }
  scrollToCockpit();
}

function setPrompt(text) {
  const input = document.getElementById("userInput");
  if (!input) return;
  input.value = text;
  input.dispatchEvent(new Event("input"));
  scrollToCockpit();
}

/* ── 8. Loading & Progress Visualizer ────────────────────────── */
function setLoading(isLoading, mode = "draft") {
  const sendBtn      = document.getElementById("sendBtn");
  const btnText      = document.getElementById("btnText");
  const btnLoader    = document.getElementById("btnLoader");
  const approveBtn   = document.getElementById("approveBtn");
  const reviseBtn    = document.getElementById("reviseBtn");
  const pill         = document.getElementById("agentsReadyPill");
  const visualizer   = document.getElementById("generationVisualizer");

  if (sendBtn) sendBtn.disabled = isLoading;
  if (approveBtn) approveBtn.disabled = isLoading;
  if (reviseBtn) reviseBtn.disabled = isLoading;

  if (isLoading) {
    if (btnText) btnText.classList.add("hidden");
    if (btnLoader) btnLoader.classList.remove("hidden");
    if (pill) {
      pill.innerHTML = '<span class="status-dot"></span><span class="status-text" style="color: var(--gold-light)">Orchestrating Agents…</span>';
    }

    if (visualizer && mode === "draft") {
      visualizer.classList.remove("hidden");
      startVisualizerStages();
    }
  } else {
    if (btnText) btnText.classList.remove("hidden");
    if (btnLoader) btnLoader.classList.add("hidden");
    if (pill) {
      pill.innerHTML = '<span class="status-dot"></span><span class="status-text">5 Specialist Agents Ready</span>';
    }

    if (visualizer) {
      visualizer.classList.add("hidden");
      stopVisualizerStages();
    }
  }
}

function startVisualizerStages() {
  const stageIds = [
    "stage-supervisor",
    "stage-flights",
    "stage-hotels",
    "stage-weather",
    "stage-itinerary"
  ];
  const stages = stageIds.map((id) => document.getElementById(id)).filter(Boolean);

  let currentIdx = 0;
  stages.forEach((s, idx) => {
    s.classList.remove("active");
    const icon = s.querySelector(".stage-status-icon");
    if (icon) icon.textContent = idx === 0 ? "◌" : "⋯";
  });

  if (stages[0]) stages[0].classList.add("active");

  stopVisualizerStages();
  stageInterval = setInterval(() => {
    currentIdx++;
    if (currentIdx < stages.length) {
      const prev = stages[currentIdx - 1];
      const curr = stages[currentIdx];

      if (prev) {
        const prevIcon = prev.querySelector(".stage-status-icon");
        if (prevIcon) prevIcon.textContent = "✓";
      }
      if (curr) {
        curr.classList.add("active");
        const currIcon = curr.querySelector(".stage-status-icon");
        if (currIcon) currIcon.textContent = "◌";
      }
    } else {
      stopVisualizerStages();
    }
  }, 1600);
}

function stopVisualizerStages() {
  if (stageInterval) {
    clearInterval(stageInterval);
    stageInterval = null;
  }
}

/* ── 9. Error Notifications ─────────────────────────────────── */
function showError(message) {
  const errorBox = document.getElementById("errorBox");
  if (!errorBox) return;
  errorBox.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;flex-shrink:0" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span>${message}</span>
  `;
  errorBox.classList.remove("hidden");
  errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideError() {
  const errorBox = document.getElementById("errorBox");
  if (!errorBox) return;
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
}

/* ── 10. Markdown Rendering & Typewriter ────────────────────── */
function renderMarkdown(element, markdown) {
  if (!element) return;
  if (typeof marked !== "undefined") {
    element.innerHTML = marked.parse(markdown || "");
  } else {
    element.innerText = markdown || "";
  }
}

function typewriterText(el, text, delayMs) {
  if (!el) return;
  el.textContent = "";
  let i = 0;
  const tick = () => {
    el.textContent += text[i];
    i++;
    if (i < text.length) setTimeout(tick, delayMs);
  };
  setTimeout(tick, 100);
}

/* ── 11. Multi-Agent Workflow Display ───────────────────────── */
function showWorkflow(data) {
  const section   = document.getElementById("workflowSection");
  const reasoning = document.getElementById("supervisorReasoning");
  const chips     = document.getElementById("agentChips");
  const badge     = document.getElementById("guardrailBadge");

  if (!section) return;

  const text = data.supervisor_reasoning || "Supervisor analyzed requirements and dispatched specialist agents across the graph.";
  if (reasoning) {
    typewriterText(reasoning, text, 12);
  }

  if (chips) {
    chips.innerHTML = "";
    const agents = data.selected_agents || [];
    agents.forEach((agentKey, i) => {
      const meta = AGENT_META[agentKey] || { label: agentKey, icon: "✦", color: "#d4af37" };
      const chip = document.createElement("span");
      chip.className = "agent-chip";
      chip.style.animationDelay = `${i * 90}ms`;
      chip.innerHTML = `<span class="chip-icon">${meta.icon}</span><span>${meta.label}</span>`;
      chips.appendChild(chip);
    });
  }

  if (badge) {
    if (data.guardrail_allowed === false) {
      badge.textContent = "Guardrail Blocked";
      badge.classList.add("blocked");
    } else {
      badge.innerHTML = "Guardrails Verified ✓";
      badge.classList.remove("blocked");
    }
  }

  section.classList.remove("hidden");
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── 12. Final Result & Dossier Presentation ────────────────── */
function showResult(answer, threadId, isDraft = false) {
  latestAnswerMarkdown = answer || "";

  const resultSection = document.getElementById("resultSection");
  const resultBox     = document.getElementById("resultBox");
  const threadInfo    = document.getElementById("threadInfo");
  const resultTitle   = document.getElementById("resultTitle");

  if (!resultSection || !resultBox) return;

  renderMarkdown(resultBox, latestAnswerMarkdown);
  if (threadInfo)  threadInfo.textContent  = `Thread ID: ${threadId || "N/A"}`;
  if (resultTitle) resultTitle.textContent = isDraft ? "Draft Travel Itinerary" : "Your Final AI Travel Dossier";
  
  resultSection.classList.remove("hidden");

  setTimeout(() => {
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 150);
}

/* ── 13. HITL Human-In-The-Loop Approval ────────────────────── */
function showApproval(data) {
  waitingForApproval = true;
  const section         = document.getElementById("approvalSection");
  const approvalRequest = document.getElementById("approvalRequest");
  if (!section) return;

  if (approvalRequest) {
    approvalRequest.textContent = data.approval_request ||
      "Our multi-agent system has generated a customized draft. Approve it to finalize bookings and timings, or provide specific feedback for automatic refinement.";
  }
  section.classList.remove("hidden");
  setTimeout(() => {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 200);
}

function hideApproval() {
  waitingForApproval = false;
  const section = document.getElementById("approvalSection");
  const feedback = document.getElementById("approvalFeedback");
  if (section) section.classList.add("hidden");
  if (feedback) feedback.value = "";
}

/* ── 14. API Integration: Send Message ──────────────────────── */
async function sendMessage() {
  hideError();

  if (waitingForApproval) {
    showError("Please approve or revise the current draft before starting a new journey plan.");
    return;
  }

  const input = document.getElementById("userInput");
  if (!input) return;
  const message = input.value.trim();

  if (!message) {
    showError("Please enter your travel brief or select one of the curated destinations.");
    input.focus();
    return;
  }

  setLoading(true, "draft");

  try {
    const response = await fetch("/api/travel", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ message, thread_id: currentThreadId }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Something went wrong during orchestration.");
    }

    currentThreadId = data.thread_id;
    if (currentThreadId) {
      localStorage.setItem("travel_thread_id", currentThreadId);
    }

    showWorkflow(data);

    if (data.requires_approval) {
      showResult(data.itinerary || data.answer, data.thread_id, true);
      showApproval(data);
    } else {
      hideApproval();
      showResult(data.answer, data.thread_id, false);
    }
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false, "draft");
  }
}

/* ── 15. API Integration: HITL Approval ─────────────────────── */
async function submitApproval(approved) {
  hideError();

  if (!currentThreadId || !waitingForApproval) {
    showError("There is no draft awaiting approval in this active session.");
    return;
  }

  const feedbackInput = document.getElementById("approvalFeedback");
  const feedback      = feedbackInput ? feedbackInput.value.trim() : "";

  if (!approved && !feedback) {
    showError("Please enter revision feedback so the agents know what adjustments to make.");
    if (feedbackInput) feedbackInput.focus();
    return;
  }

  setLoading(true, "approval");

  try {
    const response = await fetch("/api/travel/approve", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ thread_id: currentThreadId, approved, feedback }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not resume the travel workflow.");
    }

    showWorkflow(data);
    hideApproval();
    showResult(data.answer, data.thread_id, false);
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false, "approval");
  }
}

/* ── 16. Utility Actions: Copy & PDF Export ─────────────────── */
function copyResult() {
  const resultBox = document.getElementById("resultBox");
  if (!resultBox) return;
  const text = resultBox.innerText;
  if (!text) return;

  navigator.clipboard.writeText(text)
    .then(() => {
      const copyBtn = document.getElementById("copyBtn");
      if (!copyBtn) return;
      const oldHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = `<span>✓ Dossier Copied!</span>`;
      copyBtn.style.borderColor = "var(--gold-primary)";
      copyBtn.style.color = "var(--gold-light)";
      setTimeout(() => {
        copyBtn.innerHTML = oldHTML;
        copyBtn.style.borderColor = "";
        copyBtn.style.color = "";
      }, 2000);
    })
    .catch(() => showError("Could not copy itinerary to clipboard."));
}

function downloadPDF() {
  const pdfContent = document.getElementById("pdfContent");
  if (!latestAnswerMarkdown || !pdfContent) {
    showError("No generated travel plan available to download.");
    return;
  }

  const downloadBtn = document.getElementById("downloadBtn");
  const oldHTML = downloadBtn ? downloadBtn.innerHTML : "";
  if (downloadBtn) {
    downloadBtn.innerHTML = "<span>Generating PDF…</span>";
    downloadBtn.disabled = true;
  }

  const options = {
    margin:      0.5,
    filename:    "TripMate-AI-Travel-Dossier.pdf",
    image:       { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#07090e" },
    jsPDF:       { unit: "in", format: "a4", orientation: "portrait" },
    pagebreak:   { mode: ["avoid-all", "css", "legacy"] },
  };

  html2pdf()
    .set(options)
    .from(pdfContent)
    .save()
    .then(() => {
      if (downloadBtn) {
        downloadBtn.innerHTML = oldHTML;
        downloadBtn.disabled = false;
      }
    })
    .catch(() => {
      if (downloadBtn) {
        downloadBtn.innerHTML = oldHTML;
        downloadBtn.disabled = false;
      }
      showError("Could not export travel dossier as PDF.");
    });
}

/* ── 17. Global Keyboard Shortcuts ──────────────────────────── */
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    sendMessage();
  }
});