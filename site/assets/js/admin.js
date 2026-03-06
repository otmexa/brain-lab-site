import { loadSupabase } from "./supabase-runtime.js";

const authForm = document.querySelector("[data-auth-form]");
const authModeSelect = document.querySelector("[data-auth-mode]");
const authEmailInput = document.querySelector("[data-auth-email]");
const authPasswordInput = document.querySelector("[data-auth-password]");
const authMessageNode = document.querySelector("[data-auth-message]");
const authSessionNode = document.querySelector("[data-auth-session]");
const signOutButton = document.querySelector("[data-sign-out]");

const editorForm = document.querySelector("[data-editor-form]");
const editorMessageNode = document.querySelector("[data-editor-message]");
const contentListNode = document.querySelector("[data-content-list]");
const refreshButton = document.querySelector("[data-refresh-content]");
const resetEditorButton = document.querySelector("[data-reset-editor]");

const fields = {
  id: document.querySelector("[data-field-id]"),
  pageSlug: document.querySelector("[data-field-page-slug]"),
  blockKey: document.querySelector("[data-field-block-key]"),
  entryType: document.querySelector("[data-field-entry-type]"),
  title: document.querySelector("[data-field-title]"),
  body: document.querySelector("[data-field-body]"),
  linkLabel: document.querySelector("[data-field-link-label]"),
  linkUrl: document.querySelector("[data-field-link-url]"),
  sortOrder: document.querySelector("[data-field-sort-order]"),
  isPublished: document.querySelector("[data-field-is-published]"),
  image: document.querySelector("[data-field-image]"),
  file: document.querySelector("[data-field-file]"),
};

const state = {
  supabase: null,
  config: null,
  session: null,
  profile: null,
  entries: [],
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const resetEditor = () => {
  editorForm.reset();
  fields.id.value = "";
  fields.sortOrder.value = "0";
  fields.pageSlug.value = "home";
  fields.entryType.value = "note";
  fields.isPublished.checked = true;
};

const setAuthMessage = (message, isError = false) => {
  authMessageNode.textContent = message;
  authMessageNode.dataset.state = isError ? "error" : "ready";
};

const setEditorMessage = (message, isError = false) => {
  editorMessageNode.textContent = message;
  editorMessageNode.dataset.state = isError ? "error" : "ready";
};

const slugify = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const safeFileName = (fileName) =>
  String(fileName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-");

const buildStoragePath = (kind, file) => {
  const safeName = safeFileName(file.name);
  const folder = kind === "image" ? "images" : "files";
  return `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
};

const getProfile = async () => {
  const userId = state.session?.user?.id;

  if (!userId) {
    state.profile = null;
    return null;
  }

  const { data, error } = await state.supabase
    .from("profiles")
    .select("user_id, email, display_name, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  state.profile = data;
  return data;
};

const isAdmin = () => Boolean(state.profile && ["owner", "editor"].includes(state.profile.role));

const renderSession = () => {
  if (!state.session) {
    authSessionNode.textContent = "No active session.";
    return;
  }

  const email = state.session.user?.email || "unknown user";
  const role = state.profile?.role || "no role";
  authSessionNode.textContent = `Signed in as ${email}. Current role: ${role}.`;
};

const renderEntries = () => {
  if (!isAdmin()) {
    contentListNode.innerHTML = "<p class=\"muted\">Admin access is required to view content entries.</p>";
    return;
  }

  if (state.entries.length === 0) {
    contentListNode.innerHTML = "<p class=\"muted\">No entries yet. Create the first one with the form.</p>";
    return;
  }

  contentListNode.innerHTML = state.entries
    .map((entry) => {
      const published = entry.is_published ? "Published" : "Draft";
      return `
        <article class="admin-entry">
          <div class="meta-row">
            <span class="pill">${escapeHtml(entry.page_slug)}</span>
            <span class="pill">${escapeHtml(entry.entry_type)}</span>
            <span class="pill">${escapeHtml(published)}</span>
          </div>
          <h3>${escapeHtml(entry.title || "Untitled entry")}</h3>
          <p class="muted">${escapeHtml(entry.block_key)}</p>
          <div class="action-row">
            <button class="secondary" type="button" data-edit-entry="${entry.id}">Edit</button>
            <button class="danger" type="button" data-delete-entry="${entry.id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
};

const loadEntries = async () => {
  if (!isAdmin()) {
    state.entries = [];
    renderEntries();
    return;
  }

  const { data, error } = await state.supabase
    .from("content_entries")
    .select("*")
    .order("page_slug", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  state.entries = data || [];
  renderEntries();
};

const fillEditor = (entry) => {
  fields.id.value = entry.id;
  fields.pageSlug.value = entry.page_slug;
  fields.blockKey.value = entry.block_key;
  fields.entryType.value = entry.entry_type;
  fields.title.value = entry.title || "";
  fields.body.value = entry.body || "";
  fields.linkLabel.value = entry.link_label || "";
  fields.linkUrl.value = entry.link_url || "";
  fields.sortOrder.value = String(entry.sort_order ?? 0);
  fields.isPublished.checked = Boolean(entry.is_published);
  fields.image.value = "";
  fields.file.value = "";
  setEditorMessage(`Editing "${entry.title || entry.block_key}".`, false);
};

const uploadAsset = async (file, kind) => {
  if (!file) {
    return "";
  }

  const bucket = state.config.supabaseStorageBucket;
  const nextPath = buildStoragePath(kind, file);

  const { error: uploadError } = await state.supabase.storage.from(bucket).upload(nextPath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (uploadError) {
    throw uploadError;
  }

  return nextPath;
};

const removePaths = async (paths) => {
  const uniquePaths = [...new Set(paths.filter(Boolean))];

  if (uniquePaths.length === 0) {
    return;
  }

  const { error } = await state.supabase.storage.from(state.config.supabaseStorageBucket).remove(uniquePaths);

  if (error) {
    throw error;
  }
};

const removePathsQuietly = async (paths, message) => {
  try {
    await removePaths(paths);
  } catch (error) {
    console.warn(message, error);
  }
};

const deleteAssetsForEntry = async (entry) => {
  await removePathsQuietly([entry.image_path, entry.file_path], "Entry assets could not be removed");
};

const saveEntry = async (event) => {
  event.preventDefault();

  if (!isAdmin()) {
    setEditorMessage("Admin access is required before saving content.", true);
    return;
  }

  setEditorMessage("Saving entry...", false);

  const entryId = fields.id.value.trim();
  const existingEntry = state.entries.find((entry) => entry.id === entryId) || null;
  const imageFile = fields.image.files?.[0];
  const downloadFile = fields.file.files?.[0];
  const uploadedPaths = [];
  const replacedPaths = [];

  try {
    const imagePath = imageFile ? await uploadAsset(imageFile, "image") : existingEntry?.image_path || "";
    const filePath = downloadFile ? await uploadAsset(downloadFile, "file") : existingEntry?.file_path || "";

    if (imagePath && imageFile) {
      uploadedPaths.push(imagePath);
      if (existingEntry?.image_path) {
        replacedPaths.push(existingEntry.image_path);
      }
    }

    if (filePath && downloadFile) {
      uploadedPaths.push(filePath);
      if (existingEntry?.file_path) {
        replacedPaths.push(existingEntry.file_path);
      }
    }

    const title = fields.title.value.trim();

    const payload = {
      id: entryId || crypto.randomUUID(),
      page_slug: fields.pageSlug.value,
      block_key: fields.blockKey.value.trim() || slugify(title) || crypto.randomUUID(),
      entry_type: fields.entryType.value,
      title: title || null,
      body: fields.body.value.trim() || null,
      link_label: fields.linkLabel.value.trim() || null,
      link_url: fields.linkUrl.value.trim() || null,
      image_path: imagePath || null,
      file_path: filePath || null,
      sort_order: Number.parseInt(fields.sortOrder.value, 10) || 0,
      is_published: fields.isPublished.checked,
      created_by: existingEntry?.created_by || state.session.user.id,
      updated_by: state.session.user.id,
    };

    const { error } = await state.supabase.from("content_entries").upsert(payload, {
      onConflict: "id",
    });

    if (error) {
      throw error;
    }

    await removePathsQuietly(replacedPaths, "Previous assets could not be removed");
    resetEditor();
    setEditorMessage("Entry saved.", false);
    await loadEntries();
  } catch (error) {
    console.error(error);
    await removePathsQuietly(uploadedPaths, "Newly uploaded assets could not be rolled back");
    setEditorMessage(`Save failed: ${error.message}`, true);
  }
};

const deleteEntry = async (entryId) => {
  const entry = state.entries.find((item) => item.id === entryId);

  if (!entry || !isAdmin()) {
    return;
  }

  const confirmed = window.confirm(`Delete "${entry.title || entry.block_key}"?`);

  if (!confirmed) {
    return;
  }

  try {
    const { error } = await state.supabase.from("content_entries").delete().eq("id", entryId);

    if (error) {
      throw error;
    }

    await deleteAssetsForEntry(entry);
    setEditorMessage("Entry deleted.", false);
    await loadEntries();
  } catch (error) {
    console.error(error);
    setEditorMessage(`Delete failed: ${error.message}`, true);
  }
};

const refreshAdminState = async () => {
  const sessionResponse = await state.supabase.auth.getSession();
  state.session = sessionResponse.data.session;
  await getProfile();
  renderSession();
  await loadEntries();

  if (state.session && !isAdmin()) {
    setAuthMessage(
      "Session is active, but this account does not have admin role yet. Add the email to public.admin_allowlist and confirm the profile role.",
      true,
    );
  }
};

const handleAuthSubmit = async (event) => {
  event.preventDefault();

  const mode = authModeSelect.value;
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  if (!email || !password) {
    setAuthMessage("Email and password are required.", true);
    return;
  }

  setAuthMessage(mode === "signup" ? "Creating account..." : "Signing in...", false);

  try {
    if (mode === "signup") {
      const { error } = await state.supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setAuthMessage(
        "Account created. If email confirmation is enabled in Supabase Auth, confirm the email before signing in.",
        false,
      );
    } else {
      const { error } = await state.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setAuthMessage("Signed in.", false);
    }

    await refreshAdminState();
  } catch (error) {
    console.error(error);
    setAuthMessage(error.message, true);
  }
};

const handleContentListClick = async (event) => {
  const editButton = event.target.closest("[data-edit-entry]");
  const deleteButton = event.target.closest("[data-delete-entry]");

  if (editButton) {
    const entry = state.entries.find((item) => item.id === editButton.dataset.editEntry);
    if (entry) {
      fillEditor(entry);
    }
  }

  if (deleteButton) {
    await deleteEntry(deleteButton.dataset.deleteEntry);
  }
};

const initAdmin = async () => {
  try {
    const { client, config } = await loadSupabase();
    state.supabase = client;
    state.config = config;

    resetEditor();
    await refreshAdminState();

    state.supabase.auth.onAuthStateChange(async (_event, session) => {
      state.session = session;
      await getProfile();
      renderSession();
      await loadEntries();
    });
  } catch (error) {
    console.error(error);
    setAuthMessage(error.message, true);
  }
};

authForm.addEventListener("submit", handleAuthSubmit);
editorForm.addEventListener("submit", saveEntry);
signOutButton.addEventListener("click", async () => {
  if (!state.supabase) {
    return;
  }

  await state.supabase.auth.signOut();
  state.session = null;
  state.profile = null;
  state.entries = [];
  renderSession();
  renderEntries();
  setAuthMessage("Signed out.", false);
});
refreshButton.addEventListener("click", async () => {
  await refreshAdminState();
  setEditorMessage("Entries refreshed.", false);
});
resetEditorButton.addEventListener("click", resetEditor);
contentListNode.addEventListener("click", handleContentListClick);

void initAdmin();
