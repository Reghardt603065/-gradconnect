"use client";

import { FormEvent, useState } from "react";
import {
  Edit3,
  ExternalLink,
  FileText,
  Github,
  ImagePlus,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

type Project = {
  id: string;
  title: string;
  slug: string;
  description: string;
  technologies: string[];
  githubUrl: string | null;
  liveUrl: string | null;
  imageUrl: string | null;
  featured: boolean;
  source: string;
  attachments: Attachment[];
};

type PortfolioManagerProps = {
  initial: Project[];
  username: string;
  githubUsername: string | null;
};

const MAX_COVER_IMAGE_BYTES = 2_000_000;
const ACCEPTED_COVER_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function splitCommaList(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read image."));
    };

    reader.onerror = () => {
      reject(new Error("Could not read image."));
    };

    reader.readAsDataURL(file);
  });
}

async function readCoverImage(file: File | null) {
  if (!file || file.size === 0) {
    return undefined;
  }

  if (!ACCEPTED_COVER_TYPES.includes(file.type)) {
    throw new Error("Project images must be JPG, PNG or WebP files.");
  }

  if (file.size > MAX_COVER_IMAGE_BYTES) {
    throw new Error("Project images must be 2 MB or smaller.");
  }

  return fileToDataUrl(file);
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function PortfolioManager({
  initial,
  username,
  githubUsername,
}: PortfolioManagerProps) {
  const [items, setItems] = useState(initial);
  const [message, setMessage] = useState("");
  const [github, setGithub] = useState(githubUsername || "");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function uploadAttachments(projectId: string, files: File[]) {
    if (!files.length) {
      return [];
    }

    const formData = new FormData();

    for (const file of files) {
      formData.append("files", file);
    }

    const response = await fetch(`/api/portfolio/${projectId}/attachments`, {
      method: "POST",
      body: formData,
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || "Project files could not be uploaded.");
    }

    return body.data as Attachment[];
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const coverFile = form.get("coverImage") as File | null;
    const attachmentFiles = form
      .getAll("attachments")
      .filter((value): value is File => value instanceof File && value.size > 0);

    try {
      const imageUrl = await readCoverImage(coverFile);
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          technologies: splitCommaList(form.get("technologies")),
          githubUrl: form.get("githubUrl"),
          liveUrl: form.get("liveUrl"),
          imageUrl: imageUrl || "",
          featured: false,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setMessage(body.error || "Project could not be added.");
        return;
      }

      const newProject: Project = {
        ...body.data,
        attachments: [],
      };

      setItems((current) => [newProject, ...current]);
      formElement.reset();

      if (!attachmentFiles.length) {
        setMessage("Project added.");
        return;
      }

      try {
        const attachments = await uploadAttachments(
          newProject.id,
          attachmentFiles,
        );

        setItems((current) =>
          current.map((project) =>
            project.id === newProject.id
              ? {
                  ...project,
                  attachments,
                }
              : project,
          ),
        );
        setMessage("Project and files added.");
      } catch (uploadError) {
        setMessage(
          uploadError instanceof Error
            ? `Project added, but files were not uploaded: ${uploadError.message}`
            : "Project added, but files were not uploaded.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Project could not be added.",
      );
    }
  }

  async function saveEdit(
    event: FormEvent<HTMLFormElement>,
    item: Project,
  ) {
    event.preventDefault();
    setMessage("");

    const form = new FormData(event.currentTarget);
    const coverFile = form.get("coverImage") as File | null;
    const attachmentFiles = form
      .getAll("attachments")
      .filter((value): value is File => value instanceof File && value.size > 0);
    const removeCover = form.get("removeCover") === "on";

    try {
      const uploadedCover = await readCoverImage(coverFile);
      const imageUrl = removeCover
        ? ""
        : uploadedCover === undefined
          ? item.imageUrl || ""
          : uploadedCover;

      const response = await fetch(`/api/portfolio/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          technologies: splitCommaList(form.get("technologies")),
          githubUrl: form.get("githubUrl"),
          liveUrl: form.get("liveUrl"),
          imageUrl,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setMessage(body.error || "Project could not be updated.");
        return;
      }

      setItems((current) =>
        current.map((project) =>
          project.id === item.id
            ? {
                ...project,
                ...body.data,
              }
            : project,
        ),
      );

      setEditingId(null);

      if (!attachmentFiles.length) {
        setMessage("Project updated.");
        return;
      }

      try {
        const newAttachments = await uploadAttachments(
          item.id,
          attachmentFiles,
        );

        setItems((current) =>
          current.map((project) =>
            project.id === item.id
              ? {
                  ...project,
                  attachments: [
                    ...newAttachments,
                    ...project.attachments,
                  ],
                }
              : project,
          ),
        );
        setMessage("Project and files updated.");
      } catch (uploadError) {
        setMessage(
          uploadError instanceof Error
            ? `Project updated, but files were not uploaded: ${uploadError.message}`
            : "Project updated, but files were not uploaded.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Project could not be updated.",
      );
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this project?")) {
      return;
    }

    const response = await fetch(`/api/portfolio/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
    }
  }

  async function removeAttachment(
    projectId: string,
    attachmentId: string,
  ) {
    if (!confirm("Delete this project file?")) {
      return;
    }

    const response = await fetch(
      `/api/portfolio/attachments/${attachmentId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      return;
    }

    setItems((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              attachments: project.attachments.filter(
                (attachment) => attachment.id !== attachmentId,
              ),
            }
          : project,
      ),
    );
  }

  async function feature(item: Project) {
    const response = await fetch(`/api/portfolio/${item.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        featured: !item.featured,
      }),
    });

    if (response.ok) {
      setItems((current) =>
        current.map((project) =>
          project.id === item.id
            ? {
                ...project,
                featured: !item.featured,
              }
            : project,
        ),
      );
    }
  }

  async function sync() {
    setMessage("Syncing GitHub repositories...");

    const response = await fetch("/api/github/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: github,
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error || "GitHub sync failed.");
      return;
    }

    setMessage(
      `GitHub sync complete: ${body.data.imported} imported, ${body.data.updated} updated.`,
    );
    window.location.reload();
  }

  return (
    <>
      {message && (
        <div className="form-message" style={{ marginBottom: 18 }}>
          {message}
        </div>
      )}

      <section className="grid grid-3">
        <div className="grid">
          <form className="card form-stack" onSubmit={add}>
            <h2>
              <Plus size={19} /> Add project
            </h2>

            <div className="field">
              <label>Project title</label>
              <input className="input" name="title" required />
            </div>

            <div className="field">
              <label>Description</label>
              <textarea
                className="textarea"
                name="description"
                required
                minLength={10}
              />
            </div>

            <div className="field">
              <label>Technologies</label>
              <input
                className="input"
                name="technologies"
                placeholder="React, Node.js, PostgreSQL"
              />
            </div>

            <div className="field">
              <label>GitHub repository</label>
              <input
                className="input"
                name="githubUrl"
                type="url"
                placeholder="https://github.com/user/repo"
              />
            </div>

            <div className="field">
              <label>Live URL</label>
              <input
                className="input"
                name="liveUrl"
                type="url"
                placeholder="https://project.vercel.app"
              />
            </div>

            <div className="field">
              <label>Project image</label>
              <input
                className="input"
                name="coverImage"
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
            </div>

            <div className="field">
              <label>Project files</label>
              <input
                className="input"
                name="attachments"
                type="file"
                multiple
              />
            </div>

            <button className="btn btn-primary">
              <Upload size={16} /> Add project
            </button>
          </form>

          <div className="card form-stack">
            <h2>
              <Github size={19} /> GitHub sync
            </h2>

            <div className="field">
              <label>GitHub username</label>
              <input
                className="input"
                value={github}
                onChange={(event) => setGithub(event.target.value)}
              />
            </div>

            <button
              className="btn btn-secondary"
              disabled={!github}
              onClick={sync}
            >
              <RefreshCw size={16} /> Sync repositories
            </button>
          </div>
        </div>

        <div className="grid grid-span-2">
          {items.length ? (
            items.map((item) => (
              <article className="card" key={item.id}>
                {item.imageUrl && (
                  <img
                    className="portfolio-cover"
                    src={item.imageUrl}
                    alt={`${item.title} project cover`}
                  />
                )}

                {editingId === item.id ? (
                  <form
                    className="form-stack"
                    onSubmit={(event) => saveEdit(event, item)}
                  >
                    <div className="list-item">
                      <h3>Edit project</h3>
                      <button
                        className="btn btn-secondary btn-small"
                        type="button"
                        onClick={() => setEditingId(null)}
                      >
                        <X size={15} /> Close
                      </button>
                    </div>

                    <div className="field">
                      <label>Project title</label>
                      <input
                        className="input"
                        name="title"
                        defaultValue={item.title}
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Description</label>
                      <textarea
                        className="textarea"
                        name="description"
                        defaultValue={item.description}
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Technologies</label>
                      <input
                        className="input"
                        name="technologies"
                        defaultValue={item.technologies.join(", ")}
                      />
                    </div>

                    <div className="form-row">
                      <div className="field">
                        <label>GitHub repository</label>
                        <input
                          className="input"
                          name="githubUrl"
                          type="url"
                          defaultValue={item.githubUrl || ""}
                        />
                      </div>

                      <div className="field">
                        <label>Live URL</label>
                        <input
                          className="input"
                          name="liveUrl"
                          type="url"
                          defaultValue={item.liveUrl || ""}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="field">
                        <label>Replace project image</label>
                        <input
                          className="input"
                          name="coverImage"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                        />
                      </div>

                      <div className="field">
                        <label>Add project files</label>
                        <input
                          className="input"
                          name="attachments"
                          type="file"
                          multiple
                        />
                      </div>
                    </div>

                    {item.imageUrl && (
                      <label className="checkbox-row">
                        <input type="checkbox" name="removeCover" />
                        Remove current project image
                      </label>
                    )}

                    <button className="btn btn-primary">
                      <Save size={16} /> Save changes
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="list-item">
                      <div>
                        <div className="tags">
                          <span className="badge gold">{item.source}</span>
                          {item.featured && (
                            <span className="badge green">
                              <Star size={13} fill="currentColor" /> Featured
                            </span>
                          )}
                        </div>
                        <h3 style={{ marginTop: 12 }}>{item.title}</h3>
                      </div>

                      <div className="job-actions">
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => setEditingId(item.id)}
                        >
                          <Edit3 size={15} /> Edit
                        </button>

                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => feature(item)}
                        >
                          <Star size={15} />
                          {item.featured ? "Unfeature" : "Feature"}
                        </button>

                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => remove(item.id)}
                          aria-label="Delete project"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <p className="muted">{item.description}</p>

                    <div className="tags">
                      {item.technologies.map((technology) => (
                        <span className="badge" key={technology}>
                          {technology}
                        </span>
                      ))}
                    </div>

                    <div className="job-actions" style={{ marginTop: 15 }}>
                      {item.githubUrl && (
                        <a
                          className="btn btn-secondary btn-small"
                          href={item.githubUrl}
                          target="_blank"
                        >
                          <Github size={15} /> Repository
                        </a>
                      )}

                      {item.liveUrl && (
                        <a
                          className="btn btn-primary btn-small"
                          href={item.liveUrl}
                          target="_blank"
                        >
                          Live demo <ExternalLink size={15} />
                        </a>
                      )}
                    </div>

                    {item.attachments.length > 0 && (
                      <div style={{ marginTop: 18 }}>
                        <h4>Project files</h4>
                        <div className="list">
                          {item.attachments.map((attachment) => (
                            <div className="list-item" key={attachment.id}>
                              <a
                                className="link"
                                href={`/api/portfolio/attachments/${attachment.id}`}
                              >
                                <FileText size={14} /> {attachment.fileName}
                              </a>

                              <div className="job-actions">
                                <span className="helper">
                                  {formatFileSize(attachment.size)}
                                </span>
                                <button
                                  className="btn btn-danger btn-small"
                                  onClick={() =>
                                    removeAttachment(item.id, attachment.id)
                                  }
                                  aria-label="Delete project file"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </article>
            ))
          ) : (
            <div className="card empty">
              No projects yet. Add one manually or sync a public GitHub profile.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
