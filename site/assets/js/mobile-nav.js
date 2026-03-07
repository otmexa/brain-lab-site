const topbar = document.querySelector(".topbar");
const siteNav = document.querySelector(".site-nav");

if (topbar && siteNav) {
  const navList = siteNav.querySelector("ul");
  const mobileItems = [];

  if (navList) {
    [...navList.children].forEach((item) => {
      if (item.classList.contains("nav-dropdown")) {
        const summary = item.querySelector("summary");
        const links = [...item.querySelectorAll(".nav-dropdown-menu a")].map((link, index) => ({
          label: link.textContent.trim(),
          href: link.getAttribute("href") || "#",
          current: item.classList.contains("is-current") && index === 0,
        }));

        mobileItems.push({
          type: "group",
          label: summary?.textContent?.trim() || "People",
          current: item.classList.contains("is-current"),
          links,
        });

        return;
      }

      const link = item.querySelector(":scope > a");

      if (link) {
        mobileItems.push({
          type: "link",
          label: link.textContent.trim(),
          href: link.getAttribute("href") || "#",
          current: link.getAttribute("aria-current") === "page",
        });
      }
    });
  }

  const navId = "mobile-site-navigation";
  const mobileToggle = document.createElement("button");
  mobileToggle.type = "button";
  mobileToggle.className = "mobile-nav-toggle";
  mobileToggle.setAttribute("aria-expanded", "false");
  mobileToggle.setAttribute("aria-controls", navId);
  mobileToggle.setAttribute("aria-label", "Open navigation menu");
  mobileToggle.innerHTML = `
    <span class="mobile-nav-toggle-line"></span>
    <span class="mobile-nav-toggle-line"></span>
    <span class="mobile-nav-toggle-line"></span>
  `;

  const listMarkup = mobileItems
    .map((item) => {
      if (item.type === "group") {
        const sublinks = item.links
          .map(
            (link) => `
              <a
                class="mobile-nav-sublink${link.current ? " is-active" : ""}"
                href="${link.href}"
                ${link.current ? 'aria-current="page"' : ""}
              >
                <span>${link.label}</span>
                <span class="mobile-nav-link-chevron" aria-hidden="true"></span>
              </a>
            `
          )
          .join("");

        return `
          <details class="mobile-nav-group${item.current ? " is-current" : ""}" ${item.current ? "open" : ""}>
            <summary class="mobile-nav-group-summary">
              <span>${item.label}</span>
              <span class="mobile-nav-link-chevron" aria-hidden="true"></span>
            </summary>
            <div class="mobile-nav-sublinks">
              ${sublinks}
            </div>
          </details>
        `;
      }

      return `
        <a
          class="mobile-nav-link${item.current ? " is-active" : ""}"
          href="${item.href}"
          ${item.current ? 'aria-current="page"' : ""}
        >
          <span>${item.label}</span>
          <span class="mobile-nav-link-chevron" aria-hidden="true"></span>
        </a>
      `;
    })
    .join("");

  const mobileShell = document.createElement("div");
  mobileShell.className = "mobile-nav-shell";
  mobileShell.hidden = true;
  mobileShell.innerHTML = `
    <button class="mobile-nav-backdrop" type="button" data-mobile-nav-close aria-label="Close navigation menu"></button>
    <aside class="mobile-nav-panel" id="${navId}" aria-label="Mobile navigation" aria-hidden="true">
      <nav class="mobile-nav-list" aria-label="Mobile section links">
        ${listMarkup}
      </nav>
      <div class="mobile-nav-footer">
        <p>
          Powered by
          <a href="https://netlify.com" rel="noopener noreferrer">Netlify</a>
        </p>
      </div>
    </aside>
  `;

  topbar.prepend(mobileToggle);
  topbar.after(mobileShell);
  document.body.classList.add("has-mobile-nav");
  document.body.dataset.mobileNav = "closed";

  const mobilePanel = mobileShell.querySelector(".mobile-nav-panel");
  const closeButton = mobileShell.querySelector("[data-mobile-nav-close]");

  const syncOffset = () => {
    const rect = topbar.getBoundingClientRect();
    const offset = Math.max(Math.round(rect.height), 52);
    document.documentElement.style.setProperty("--mobile-nav-offset", `${offset}px`);
  };

  const openMenu = () => {
    syncOffset();
    mobileShell.hidden = false;
    document.body.dataset.mobileNav = "open";
    mobileToggle.setAttribute("aria-expanded", "true");
    mobileToggle.setAttribute("aria-label", "Close navigation menu");
    mobilePanel?.setAttribute("aria-hidden", "false");
  };

  const closeMenu = () => {
    document.body.dataset.mobileNav = "closed";
    mobileToggle.setAttribute("aria-expanded", "false");
    mobileToggle.setAttribute("aria-label", "Open navigation menu");
    mobilePanel?.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (document.body.dataset.mobileNav !== "open") {
        mobileShell.hidden = true;
      }
    }, 180);
  };

  syncOffset();

  mobileToggle.addEventListener("click", () => {
    if (document.body.dataset.mobileNav === "open") {
      closeMenu();
      return;
    }

    openMenu();
  });

  closeButton?.addEventListener("click", closeMenu);

  mobileShell.querySelectorAll(".mobile-nav-link, .mobile-nav-sublink").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.dataset.mobileNav === "open") {
      closeMenu();
      mobileToggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    syncOffset();

    if (window.innerWidth > 760 && document.body.dataset.mobileNav === "open") {
      closeMenu();
    }
  });

  window.addEventListener("scroll", syncOffset, { passive: true });
}
