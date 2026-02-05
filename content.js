// content.js (floating toggle + animated sidebar)

(function () {
  // ---------- Helpers ----------
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text || "");
      toast("Copied ✓");
    } catch (e) {
      toast("Copy failed");
    }
  }

  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "po-toast po-hidden";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.remove("po-hidden");
    setTimeout(() => toastEl.classList.add("po-hidden"), 1200);
  }

  // Placeholder for external tool integration.
  async function improvePrompt(inputText) {
    // TODO: Replace with external tool call.
    return (inputText || "").trim();
  }

  // ---------- UI ----------
  let sidebarEl = null;
  let backdropEl = null;
  let toggleEl = null;
  let toastEl = null;
  let currentView = "main";
  let isDragging = false;
  let dragMoved = false;
  let dragStart = { x: 0, y: 0 };
  let toggleStart = { x: 0, y: 0 };

  function setSidebarOpen(isOpen) {
    if (sidebarEl) sidebarEl.classList.toggle("po-open", isOpen);
    if (backdropEl) backdropEl.classList.toggle("po-open", isOpen);
    if (toggleEl) toggleEl.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (sidebarEl) sidebarEl.classList.toggle("po-animate-in", isOpen);
  }

  function ensureSidebar() {
    if (sidebarEl) return;

    backdropEl = document.createElement("div");
    backdropEl.className = "po-backdrop";
    backdropEl.addEventListener("click", () => setSidebarOpen(false));
    document.body.appendChild(backdropEl);

    sidebarEl = document.createElement("aside");
    sidebarEl.className = "po-sidebar";
    sidebarEl.innerHTML = `
      <div class="po-sidebar-shell">
        <div class="po-header">
          <div>
            <div class="po-title">Prompt Enhancer</div>
            <div class="po-subtitle">Your pre‑prompt workspace</div>
          </div>
          <button class="po-close" type="button" aria-label="Close">×</button>
        </div>

        <div class="po-body">
          <div class="po-view po-view-main po-view-active">
            <div class="po-panel">
              <label class="po-label" for="po-input">Write your input</label>
              <textarea id="po-input" class="po-textarea" placeholder="Describe your task, context, constraints…"></textarea>
              <div class="po-template-helper po-hidden" data-scope="main">
                <div class="po-template-helper-head">
                  <div class="po-template-helper-title">Template selected</div>
                  <button class="po-template-clear" type="button" data-action="clear-template">Remove</button>
                </div>
                <div class="po-template-helper-body"></div>
              </div>
              <div class="po-row">
                <button class="po-primary" type="button" data-action="improve">Improve</button>
                <button class="po-secondary" type="button" data-action="clear">Clear</button>
              </div>
            </div>

            <div class="po-comments po-hidden">
              <div class="po-comments-title">AI comments</div>
              <div class="po-comments-body">Hints and improvements will appear here.</div>
            </div>

            <div class="po-panel po-output-panel">
              <div class="po-output-head">
                <label class="po-label" for="po-output">Improved prompt</label>
                <button class="po-copy" type="button" data-action="copy">Copy</button>
              </div>
              <textarea id="po-output" class="po-textarea po-output" placeholder="Your improved prompt will appear here…" readonly></textarea>
            </div>
          </div>

          <div class="po-view po-view-library">
            <div class="po-library-header">
              <button class="po-back" type="button" data-action="back">
                <span class="po-back-icon">←</span>
                <span class="po-back-text">Back</span>
              </button>
              <div class="po-library-title-wrap"></div>
              <button class="po-primary po-new" type="button" data-action="new-prompt">+ New Prompt</button>
            </div>

            <div class="po-library-actions">
              <div class="po-search">
                <span class="po-search-icon">🔍</span>
                <input class="po-input" type="search" placeholder="Search by title or tag..." />
              </div>
            </div>

            <div class="po-library-form po-hidden">
              <input class="po-input" type="text" data-field="title" placeholder="Prompt title" />
              <input class="po-input" type="text" data-field="tags" placeholder="Tags (comma separated)" />
              <textarea class="po-textarea" data-field="content" placeholder="Write your prompt..."></textarea>
              <div class="po-row">
                <button class="po-primary" type="button" data-action="save-prompt">Save</button>
                <button class="po-secondary" type="button" data-action="cancel-prompt">Cancel</button>
              </div>
            </div>

            <div class="po-library-list"></div>
          </div>

          <div class="po-view po-view-templates">
            <div class="po-settings-top">
              <button class="po-back" type="button" data-action="back">
                <span class="po-back-icon">←</span>
                <span class="po-back-text">Back</span>
              </button>
              <div></div>
            </div>

            <div class="po-template-helper po-hidden">
              <div class="po-template-helper-head">
                <div class="po-template-helper-title">Template selected</div>
                <button class="po-template-clear" type="button" data-action="clear-template">Remove</button>
              </div>
              <div class="po-template-helper-body"></div>
            </div>

            <div class="po-template-section">
              <div class="po-template-section-title">Core templates</div>
              <div class="po-template-grid po-template-core"></div>
            </div>

            <div class="po-template-advanced">
              <button class="po-advanced-toggle" type="button" data-action="toggle-advanced">
                <span>Advanced templates</span>
                <span class="po-advanced-caret">▾</span>
              </button>
              <div class="po-template-grid po-template-advanced-list po-hidden"></div>
            </div>
          </div>

          <div class="po-view po-view-settings">
            <div class="po-settings-top">
              <button class="po-back" type="button" data-action="back" aria-label="Back">
                <span class="po-back-icon">←</span>
                <span class="po-back-text">Back</span>
              </button>
            </div>

            <div class="po-settings-card">
              <div class="po-settings-section-title">Account</div>
              <div class="po-account">
                <div class="po-avatar">JD</div>
                <div class="po-account-info">
                  <div class="po-account-name">John Doe <span class="po-badge">Free</span></div>
                  <div class="po-account-email">john.doe@example.com</div>
                </div>
                <button class="po-mini-btn" type="button">›</button>
              </div>
            </div>

            <div class="po-settings-card">
              <div class="po-settings-section-title">Subscription</div>
              <div class="po-subscription">
                <div class="po-subscription-title">No active subscription</div>
                <div class="po-subscription-sub">Upgrade to unlock premium features and unlimited usage</div>
              </div>
              <div class="po-row">
                <button class="po-primary" type="button">Upgrade</button>
                <button class="po-secondary" type="button">View usage</button>
              </div>
            </div>

            <div class="po-settings-card">
              <div class="po-settings-section-title">Language</div>
              <div class="po-setting-row">
                <label>Interface and AI Response Language</label>
                <select class="po-select">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                </select>
              </div>
              <div class="po-setting-row">
                <label>Voice Input Language</label>
                <select class="po-select">
                  <option>English (US)</option>
                  <option>English (UK)</option>
                  <option>Spanish (ES)</option>
                  <option>French (FR)</option>
                </select>
              </div>
            </div>

            <div class="po-settings-card">
              <div class="po-settings-section-title">Appearance</div>
              <div class="po-setting-row">
                <label>Appearance</label>
                <select class="po-select">
                  <option>Follow system</option>
                  <option>Light</option>
                  <option>Dark</option>
                </select>
              </div>
              <div class="po-setting-row">
                <label>Content text size</label>
                <select class="po-select">
                  <option>Normal</option>
                  <option>Large</option>
                  <option>Extra Large</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="po-footer">
          <button class="po-icon" type="button" aria-label="Library" data-view="library">
            <img class="po-icon-img" data-src="icons/folder24.png" alt="" />
          </button>
          <button class="po-icon" type="button" aria-label="Templates" data-view="templates">
            <img class="po-icon-img" data-src="icons/browse24.png" alt="" />
          </button>
          <button class="po-icon" type="button" aria-label="Settings" data-view="settings">
            <img class="po-icon-img" data-src="icons/settings24.png" alt="" />
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(sidebarEl);

    const inputEl = sidebarEl.querySelector("#po-input");
    const outputEl = sidebarEl.querySelector("#po-output");
    const commentsWrap = sidebarEl.querySelector(".po-comments");
    const commentsEl = sidebarEl.querySelector(".po-comments-body");
    const libraryView = sidebarEl.querySelector(".po-view-library");
    const libraryList = sidebarEl.querySelector(".po-library-list");
    const libraryForm = sidebarEl.querySelector(".po-library-form");
    const librarySearch = sidebarEl.querySelector(".po-library-actions .po-input");
    const templatesView = sidebarEl.querySelector(".po-view-templates");
    const templateHelper = sidebarEl.querySelector(".po-view-templates .po-template-helper");
    const templateHelperBody = sidebarEl.querySelector(".po-view-templates .po-template-helper-body");
    const mainTemplateHelper = sidebarEl.querySelector('.po-template-helper[data-scope="main"]');
    const mainTemplateHelperBody = mainTemplateHelper?.querySelector(".po-template-helper-body");
    const templateCore = sidebarEl.querySelector(".po-template-core");
    const templateAdvanced = sidebarEl.querySelector(".po-template-advanced-list");
    const headerTitle = sidebarEl.querySelector(".po-header .po-title");
    const headerSub = sidebarEl.querySelector(".po-header .po-subtitle");

    sidebarEl.querySelector(".po-close").addEventListener("click", () => setSidebarOpen(false));

    sidebarEl.querySelector('[data-action="improve"]').addEventListener("click", async () => {
      const improved = await improvePrompt(inputEl.value);
      if (!improved) {
        toast("Add some input first");
        return;
      }
      outputEl.value = improved;
      if (commentsWrap) commentsWrap.classList.remove("po-hidden");
      commentsEl.textContent = "Refined for clarity and structure. Add desired output format if needed.";
    });

    sidebarEl.querySelector('[data-action="clear"]').addEventListener("click", () => {
      inputEl.value = "";
      outputEl.value = "";
      if (commentsWrap) commentsWrap.classList.add("po-hidden");
      commentsEl.textContent = "Hints and improvements will appear here.";
      inputEl.focus();
    });

    sidebarEl.querySelectorAll('[data-action="clear-template"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedTemplateId = null;
        updateTemplateHelper(null);
        renderTemplates();
      });
    });

    sidebarEl.querySelector('[data-action="copy"]').addEventListener("click", () => {
      copyToClipboard(outputEl.value);
    });

    function setView(nextView) {
      currentView = nextView;
      sidebarEl.querySelectorAll(".po-view").forEach((view) => view.classList.remove("po-view-active"));
      const active = sidebarEl.querySelector(`.po-view-${nextView}`);
      if (active) {
        active.classList.add("po-view-active");
        active.classList.remove("po-view-animate");
        void active.offsetWidth;
        active.classList.add("po-view-animate");
      }
      if (nextView === "main") {
        if (headerTitle) headerTitle.textContent = "Prompt Enhancer";
        if (headerSub) headerSub.textContent = "Your pre‑prompt workspace";
        sidebarEl.classList.remove("po-header-hide-title");
        sidebarEl.classList.remove("po-header-no-close");
      } else if (nextView === "settings") {
        if (headerTitle) headerTitle.textContent = "Settings";
        if (headerSub) headerSub.textContent = "Manage your preferences";
        sidebarEl.classList.remove("po-header-hide-title");
        sidebarEl.classList.add("po-header-no-close");
      } else if (nextView === "library") {
        if (headerTitle) headerTitle.textContent = "My Prompts Library";
        if (headerSub) headerSub.textContent = "Save and reuse your favorite prompts";
        sidebarEl.classList.remove("po-header-hide-title");
        sidebarEl.classList.add("po-header-no-close");
      } else if (nextView === "templates") {
        if (headerTitle) headerTitle.textContent = "Prompt Templates";
        if (headerSub) headerSub.textContent = "Structured frameworks to improve your prompts";
        sidebarEl.classList.remove("po-header-hide-title");
        sidebarEl.classList.add("po-header-no-close");
      } else {
        sidebarEl.classList.add("po-header-hide-title");
        sidebarEl.classList.add("po-header-no-close");
      }
      sidebarEl.querySelectorAll(".po-icon").forEach((btn) => {
        const btnView = btn.getAttribute("data-view");
        btn.classList.toggle("po-icon-active", btnView === nextView);
      });
    }

    sidebarEl.querySelectorAll(".po-icon").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextView = btn.getAttribute("data-view");
        if (!nextView) {
          toast("Coming soon");
          return;
        }
        setView(nextView);
      });
    });

    sidebarEl.querySelectorAll(".po-icon-img").forEach((img) => {
      const rel = img.getAttribute("data-src");
      if (rel) img.src = chrome.runtime.getURL(rel);
    });

    sidebarEl.querySelectorAll('[data-action="back"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        setView("main");
      });
    });

    const prompts = [
      {
        id: "1",
        title: "Blog Post Generator",
        tags: ["writing", "content"],
        content: "Write a comprehensive blog post about [TOPIC]. Include an engaging introduction, 3-5 main points with examples, and a compelling conclusion. Target audience: [AUDIENCE]. Tone: [TONE]."
      },
      {
        id: "2",
        title: "Code Review Helper",
        tags: ["coding"],
        content: "Review the following code and provide: 1) Potential bugs or issues, 2) Performance optimizations, 3) Best practices suggestions, 4) Security considerations."
      },
      {
        id: "3",
        title: "Email Summarizer",
        tags: ["productivity"],
        content: "Summarize this email in 3 bullet points. Focus on: key decisions, action items, and deadlines. Keep it concise and actionable."
      }
    ];
    let editingId = null;

    function renderLibrary() {
      if (!libraryList) return;
      const query = (librarySearch?.value || "").toLowerCase();
      const filtered = prompts.filter((p) => {
        return (
          p.title.toLowerCase().includes(query) ||
          p.tags.join(" ").toLowerCase().includes(query) ||
          p.content.toLowerCase().includes(query)
        );
      });

      libraryList.innerHTML = filtered
        .map((p) => {
          const tags = p.tags.map((t) => `<span class="po-tag">${t}</span>`).join("");
          return `
            <div class="po-library-card" data-id="${p.id}">
              <div class="po-library-card-head">
                <div>
                  <div class="po-library-title">${p.title}</div>
                  <div class="po-library-tags">${tags}</div>
                </div>
                <div class="po-library-actions-mini">
                  <button class="po-action-btn" data-action="copy" aria-label="Copy">
                    <span>⎘</span>
                  </button>
                  <button class="po-action-btn" data-action="edit" aria-label="Edit">
                    <span>✎</span>
                  </button>
                  <button class="po-action-btn" data-action="delete" aria-label="Delete">
                    <span>🗑</span>
                  </button>
                </div>
              </div>
              <div class="po-library-content">${p.content}</div>
            </div>
          `;
        })
        .join("");
    }

    function openForm(prompt) {
      if (!libraryForm) return;
      libraryForm.classList.remove("po-hidden");
      libraryForm.querySelector('[data-field="title"]').value = prompt ? prompt.title : "";
      libraryForm.querySelector('[data-field="tags"]').value = prompt ? prompt.tags.join(", ") : "";
      libraryForm.querySelector('[data-field="content"]').value = prompt ? prompt.content : "";
    }

    function closeForm() {
      if (!libraryForm) return;
      libraryForm.classList.add("po-hidden");
      editingId = null;
    }

    libraryView?.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      if (!action) return;

      if (action === "new-prompt") {
        editingId = null;
        openForm(null);
        return;
      }

      if (action === "save-prompt") {
        const title = libraryForm.querySelector('[data-field="title"]').value.trim();
        const tags = libraryForm
          .querySelector('[data-field="tags"]')
          .value.split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const content = libraryForm.querySelector('[data-field="content"]').value.trim();
        if (!title || !content) {
          toast("Title and content required");
          return;
        }
        if (editingId) {
          const p = prompts.find((x) => x.id === editingId);
          if (p) {
            p.title = title;
            p.tags = tags.slice(0, 2);
            p.content = content;
          }
        } else {
          prompts.unshift({
            id: Date.now().toString(),
            title,
            tags: tags.slice(0, 2),
            content
          });
        }
        closeForm();
        renderLibrary();
        return;
      }

      if (action === "cancel-prompt") {
        closeForm();
        return;
      }

      const card = btn.closest(".po-library-card");
      if (!card) return;
      const id = card.getAttribute("data-id");
      const prompt = prompts.find((p) => p.id === id);
      if (!prompt) return;

      if (action === "copy") {
        copyToClipboard(prompt.content);
      }
      if (action === "edit") {
        editingId = prompt.id;
        openForm(prompt);
      }
      if (action === "delete") {
        const idx = prompts.findIndex((p) => p.id === id);
        if (idx >= 0) prompts.splice(idx, 1);
        renderLibrary();
      }
    });

    librarySearch?.addEventListener("input", renderLibrary);

    const coreTemplates = [
      {
        id: "rtf",
        name: "RTF",
        description: "Fast and simple prompt structure",
        structure: "Role → Task → Format"
      },
      {
        id: "craft",
        name: "CRAFT",
        description: "Balanced framework for precise results",
        structure: "Context → Role → Action → Format → Tone"
      },
      {
        id: "clear",
        name: "CLEAR",
        description: "High-control framework for complex tasks",
        structure: "Context → Logic → Examples → Expectations → Restrictions"
      }
    ];

    const advancedTemplates = [
      {
        id: "contexte-v",
        name: "CONTEXTE-V",
        description: "Mega-prompt framework for expert-level tasks",
        structure: "Context → Objective → Expertise → Task → Examples → Constraints → Tone → Output → Verification",
        badge: "Expert"
      },
      {
        id: "cot",
        name: "Chain-of-Thought",
        description: "Encourages step-by-step reasoning",
        structure: "Let's think step by step…",
        tag: "Reasoning"
      },
      {
        id: "tot",
        name: "Tree of Thoughts",
        description: "Explores multiple reasoning paths",
        structure: "Explore multiple approaches, then choose the best",
        tag: "Exploratory"
      },
      {
        id: "cov",
        name: "Chain-of-Verification",
        description: "Answer, verify, then refine",
        structure: "Generate → Verify → Refine",
        tag: "Verification"
      },
      {
        id: "meta",
        name: "Meta-Prompting",
        description: "Prompt that generates or improves other prompts",
        structure: "Create/improve prompts for specific use cases",
        tag: "Meta"
      }
    ];

    let selectedTemplateId = null;

    function renderTemplateCard(tpl) {
      const badge = tpl.badge ? `<span class="po-template-badge">${tpl.badge}</span>` : "";
      const tag = tpl.tag ? `<span class="po-template-tag">${tpl.tag}</span>` : "";
      return `
        <div class="po-template-card ${selectedTemplateId === tpl.id ? "po-template-selected" : ""}" data-id="${tpl.id}">
          <div class="po-template-card-head">
            <div class="po-template-name">${tpl.name}</div>
            <div class="po-template-badges">${badge}${tag}</div>
          </div>
          <div class="po-template-desc">${tpl.description}</div>
          <div class="po-template-structure">${tpl.structure}</div>
          <button class="po-template-use" type="button">
            ${selectedTemplateId === tpl.id ? "Selected" : "Use template"}
          </button>
        </div>
      `;
    }

    function renderTemplates() {
      if (templateCore) templateCore.innerHTML = coreTemplates.map(renderTemplateCard).join("");
      if (templateAdvanced) templateAdvanced.innerHTML = advancedTemplates.map(renderTemplateCard).join("");
    }

    function updateTemplateHelper(tpl) {
      if (!templateHelper || !templateHelperBody) return;
      if (!tpl) {
        templateHelper.classList.add("po-hidden");
        templateHelperBody.textContent = "";
        if (mainTemplateHelper && mainTemplateHelperBody) {
          mainTemplateHelper.classList.add("po-hidden");
          mainTemplateHelperBody.textContent = "";
        }
        return;
      }
      templateHelper.classList.remove("po-hidden");
      templateHelperBody.textContent = `${tpl.name}: ${tpl.structure}`;
      if (mainTemplateHelper && mainTemplateHelperBody) {
        mainTemplateHelper.classList.remove("po-hidden");
        mainTemplateHelperBody.textContent = `${tpl.name}: ${tpl.structure}`;
      }
    }

    templatesView?.addEventListener("click", (e) => {
      const clearBtn = e.target.closest('[data-action="clear-template"]');
      if (clearBtn) {
        selectedTemplateId = null;
        updateTemplateHelper(null);
        renderTemplates();
        return;
      }
      const card = e.target.closest(".po-template-card");
      if (card) {
        const id = card.getAttribute("data-id");
        selectedTemplateId = id;
        const all = coreTemplates.concat(advancedTemplates);
        const tpl = all.find((t) => t.id === id);
        updateTemplateHelper(tpl);
        renderTemplates();
      }
      const toggle = e.target.closest('[data-action="toggle-advanced"]');
      if (toggle && templateAdvanced) {
        templateAdvanced.classList.toggle("po-hidden");
        toggle.querySelector(".po-advanced-caret")?.classList.toggle("po-rotate");
      }
    });

    renderLibrary();
    renderTemplates();
    setView(currentView);
  }

  function ensureToggle() {
    if (toggleEl) return;

    toggleEl = document.createElement("button");
    toggleEl.className = "po-toggle";
    toggleEl.type = "button";
    toggleEl.setAttribute("aria-label", "Prompt Enhancer");
    toggleEl.setAttribute("aria-expanded", "false");
    toggleEl.innerHTML = `<img class="po-toggle-img" alt="Prompt Optimizer" />`;

    const startX = 18;
    const startY = Math.max(18, window.innerHeight - 36 - 18);
    toggleEl.style.left = `${startX}px`;
    toggleEl.style.top = `${startY}px`;

    toggleEl.addEventListener("mousedown", (e) => {
      isDragging = true;
      dragMoved = false;
      dragStart = { x: e.clientX, y: e.clientY };
      const rect = toggleEl.getBoundingClientRect();
      toggleStart = { x: rect.left, y: rect.top };
      e.preventDefault();
    });

    toggleEl.addEventListener("click", () => {
      if (dragMoved) return;
      const img = toggleEl.querySelector(".po-toggle-img");
      if (img) {
        img.classList.remove("po-spin");
        void img.offsetWidth;
        img.classList.add("po-spin");
      }
      const isOpen = sidebarEl?.classList.contains("po-open");
      setSidebarOpen(!isOpen);
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging || !toggleEl) return;
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) dragMoved = true;
      const newX = Math.max(8, Math.min(window.innerWidth - 56, toggleStart.x + deltaX));
      const newY = Math.max(8, Math.min(window.innerHeight - 56, toggleStart.y + deltaY));
      toggleEl.style.left = `${newX}px`;
      toggleEl.style.top = `${newY}px`;
    });

    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
    });

    document.body.appendChild(toggleEl);

    const toggleImg = toggleEl.querySelector(".po-toggle-img");
    if (toggleImg) toggleImg.src = chrome.runtime.getURL("icons/logo.png");
  }

  ensureSidebar();
  ensureToggle();
})();
