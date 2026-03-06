import { loadSupabase, loadRuntimeConfig } from "./supabase-runtime.js";

const statusNode = document.querySelector("[data-supabase-status]");
const detailsNode = document.querySelector("[data-supabase-details]");
const gridNode = document.querySelector("[data-content-grid]");
const emptyNode = document.querySelector("[data-content-empty]");
const pageSlug = document.body.dataset.pageSlug;

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const setStatus = (state, message, details) => {
  if (statusNode) {
    statusNode.dataset.state = state;
    statusNode.textContent = message;
  }

  if (detailsNode) {
    detailsNode.textContent = details;
  }
};

const renderEntry = (entry, bucket, supabase) => {
  const imageUrl = entry.image_path
    ? supabase.storage.from(bucket).getPublicUrl(entry.image_path).data.publicUrl
    : "";
  const fileUrl = entry.file_path
    ? supabase.storage.from(bucket).getPublicUrl(entry.file_path).data.publicUrl
    : "";

  const meta = [];

  if (entry.entry_type) {
    meta.push(`<span class="pill">${escapeHtml(entry.entry_type)}</span>`);
  }

  if (entry.is_published) {
    meta.push('<span class="pill">Published</span>');
  }

  const actions = [];

  if (entry.link_url) {
    actions.push(
      `<a class="button secondary" href="${escapeHtml(entry.link_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(entry.link_label || "Open link")}</a>`,
    );
  }

  if (fileUrl) {
    actions.push(
      `<a class="button" href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(entry.link_label || "Download file")}</a>`,
    );
  }

  return `
    <article class="card content-card" data-type="${escapeHtml(entry.entry_type || "note")}">
      ${
        imageUrl
          ? `<div class="content-image"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(entry.title || "Content image")}" loading="lazy" /></div>`
          : ""
      }
      <div class="meta-row">${meta.join("")}</div>
      <div class="stack">
        <h3 class="card-title">${escapeHtml(entry.title || "Untitled entry")}</h3>
        ${entry.body ? `<p>${escapeHtml(entry.body).replaceAll("\n", "<br />")}</p>` : ""}
      </div>
      ${actions.length > 0 ? `<div class="action-row">${actions.join("")}</div>` : ""}
    </article>
  `;
};

const loadPageContent = async () => {
  if (!pageSlug || !gridNode) {
    return;
  }

  setStatus(
    "loading",
    "Loading published updates...",
    "This section is retrieving the latest public content from the site publishing system.",
  );

  try {
    const [{ client }, config] = await Promise.all([loadSupabase(), loadRuntimeConfig()]);

    const { data, error } = await client
      .from("content_entries")
      .select("id, page_slug, entry_type, title, body, link_label, link_url, image_path, file_path, is_published, sort_order, created_at")
      .eq("page_slug", pageSlug)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      emptyNode.hidden = false;
      setStatus(
        "ready",
        "No updates published yet.",
        "This page is ready to surface content as soon as the first entries are published.",
      );
      return;
    }

    gridNode.innerHTML = data.map((entry) => renderEntry(entry, config.supabaseStorageBucket, client)).join("");
    emptyNode.hidden = true;
    setStatus(
      "ready",
      "Published updates are live.",
      `Loaded ${data.length} published entr${data.length === 1 ? "y" : "ies"} for this section.`,
    );
  } catch (error) {
    console.error(error);
    setStatus(
      "error",
      "Updates are temporarily unavailable.",
      "The public content feed could not be loaded right now.",
    );
  }
};

void loadPageContent();
