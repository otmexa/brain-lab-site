const topbar = document.querySelector(".topbar");
const siteNav = document.querySelector(".site-nav");

if (topbar && siteNav) {
  const navList = siteNav.querySelector("ul");
  const brandName = document.querySelector(".brand-name")?.textContent?.trim() || "Brain Lab";
  const brandEyebrow = document.querySelector(".brand-text .eyebrow")?.textContent?.trim() || "";
  const ctaSource =
    topbar.querySelector(".nav-cta") || navList?.querySelector('a[href*="publications"]');

  const mobileItems = [];

  if (navList) {
    [...navList.children].forEach((item) => {
      if (item.classList.contains("nav-dropdown")) {
        const summary = item.querySelector("summary");
        const overviewLink = item.querySelector(".nav-dropdown-menu a");

        if (overviewLink) {
          mobileItems.push({
            key: "people",
            label: summary?.textContent?.trim() || "People",
            href: overviewLink.getAttribute("href") || "./people/",
            current: item.classList.contains("is-current"),
          });
        }

        return;
      }

      const link = item.querySelector(":scope > a");

      if (link) {
        const label = link.textContent.trim();
        const slug = label.toLowerCase();

        mobileItems.push({
          key: slug.includes("publication")
            ? "publications"
            : slug.includes("resource")
              ? "resources"
              : "home",
          label,
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

  const mobileShell = document.createElement("div");
  mobileShell.className = "mobile-nav-shell";
  mobileShell.hidden = true;

  const linksMarkup = mobileItems
    .map(
      (item) => `
        <a
          class="mobile-nav-link${item.current ? " is-active" : ""}"
          href="${item.href}"
          ${item.current ? 'aria-current="page"' : ""}
        >
          <span class="mobile-nav-icon mobile-nav-icon--${item.key}" aria-hidden="true"></span>
          <span class="mobile-nav-link-label">${item.label}</span>
          <span class="mobile-nav-link-chevron" aria-hidden="true"></span>
        </a>
      `
    )
    .join("");

  mobileShell.innerHTML = `
    <button class="mobile-nav-backdrop" type="button" data-mobile-nav-close aria-label="Close navigation menu"></button>
    <aside class="mobile-nav-panel" id="${navId}" aria-label="Mobile navigation" aria-hidden="true">
      <div class="mobile-nav-brand">
        <span class="brand-mark mobile-nav-brand-mark" aria-hidden="true"></span>
        <div class="mobile-nav-brand-copy">
          <span class="mobile-nav-brand-name">${brandName}</span>
          <span class="mobile-nav-brand-note">${brandEyebrow}</span>
        </div>
      </div>

      <nav class="mobile-nav-list" aria-label="Mobile section links">
        ${linksMarkup}
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

  const mobilePanel = mobileShell.querySelector(".mobile-nav-panel");
  const closeButton = mobileShell.querySelector("[data-mobile-nav-close]");

  const openMenu = () => {
    mobileShell.hidden = false;
    document.body.dataset.mobileNav = "open";
    mobileToggle.setAttribute("aria-expanded", "true");
    mobilePanel?.setAttribute("aria-hidden", "false");
  };

  const closeMenu = () => {
    document.body.dataset.mobileNav = "closed";
    mobileToggle.setAttribute("aria-expanded", "false");
    mobilePanel?.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (document.body.dataset.mobileNav !== "open") {
        mobileShell.hidden = true;
      }
    }, 180);
  };

  mobileToggle.addEventListener("click", () => {
    if (document.body.dataset.mobileNav === "open") {
      closeMenu();
      return;
    }

    openMenu();
  });

  closeButton?.addEventListener("click", closeMenu);

  mobileShell.querySelectorAll(".mobile-nav-link").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.dataset.mobileNav === "open") {
      closeMenu();
      mobileToggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760 && document.body.dataset.mobileNav === "open") {
      closeMenu();
    }
  });
}
