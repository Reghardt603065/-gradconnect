"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ProjectFormData = {
  id?: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  requirements: string;
  expectedOutcome: string;
  technologies: string[];
  contactEmail: string;
  contactPhone: string;
  githubUrl: string;
  liveDemoUrl: string;
  maxParticipants: number;
};

export function ProjectForm({
  initial,
  defaultContactEmail = "",
}: {
  initial?: ProjectFormData;
  defaultContactEmail?: string;
}) {
  const router = useRouter();

  const editing = Boolean(initial?.id);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const form = new FormData(
      event.currentTarget
    );

    const payload = {
      title: form.get("title"),
      category: form.get("category"),
      summary: form.get("summary"),
      description: form.get("description"),
      requirements: form.get("requirements"),
      expectedOutcome:
        form.get("expectedOutcome"),

      technologies: String(
        form.get("technologies") || ""
      )
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),

      contactEmail:
        form.get("contactEmail"),

      contactPhone:
        form.get("contactPhone"),

      githubUrl:
        form.get("githubUrl"),

      liveDemoUrl:
        form.get("liveDemoUrl"),

      maxParticipants: Number(
        form.get("maxParticipants") || 5
      ),
    };

    const response = await fetch(
      editing
        ? `/api/projects/${initial?.id}`
        : "/api/projects",
      {
        method: editing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const body = await response.json();

    if (!response.ok) {
      setMessage(
        body.error ||
          `Could not ${
            editing
              ? "update"
              : "create"
          } project.`
      );

      setLoading(false);
      return;
    }

    if (editing) {
      router.push(
        `/projects/${initial?.id}`
      );
    } else {
      router.push(
        `/projects/${body.data.id}`
      );
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <form
      className="card form-stack"
      onSubmit={submit}
    >
      {message && (
        <div className="form-message error">
          {message}
        </div>
      )}

      <div className="form-row">
        <div className="field">
          <label>Project title</label>

          <input
            className="input"
            name="title"
            minLength={3}
            maxLength={160}
            defaultValue={
              initial?.title || ""
            }
            required
          />
        </div>

        <div className="field">
          <label>Category</label>

          <input
            className="input"
            name="category"
            minLength={2}
            maxLength={80}
            defaultValue={
              initial?.category || ""
            }
            placeholder="Web development"
            required
          />
        </div>
      </div>

      <div className="field">
        <label>Summary</label>

        <textarea
          className="textarea"
          name="summary"
          minLength={10}
          maxLength={500}
          defaultValue={
            initial?.summary || ""
          }
          placeholder="Short description shown in the project catalogue."
          required
        />
      </div>

      <div className="field">
        <label>Description</label>

        <textarea
          className="textarea"
          name="description"
          minLength={10}
          maxLength={4000}
          defaultValue={
            initial?.description || ""
          }
          required
        />
      </div>

      <div className="field">
        <label>Requirements</label>

        <textarea
          className="textarea"
          name="requirements"
          minLength={3}
          maxLength={3000}
          defaultValue={
            initial?.requirements || ""
          }
          placeholder="What should participating students know or deliver?"
          required
        />
      </div>

      <div className="field">
        <label>Expected outcome</label>

        <textarea
          className="textarea"
          name="expectedOutcome"
          maxLength={2000}
          defaultValue={
            initial?.expectedOutcome || ""
          }
          placeholder="What should students have achieved or produced by the end?"
        />
      </div>

      <div className="field">
        <label>Technologies</label>

        <input
          className="input"
          name="technologies"
          defaultValue={
            initial?.technologies.join(", ") ||
            ""
          }
          placeholder="React, Python, PostgreSQL"
        />

        <span className="helper">
          Separate technologies with commas.
        </span>
      </div>

      <div className="form-row">
        <div className="field">
          <label>Contact email</label>

          <input
            className="input"
            name="contactEmail"
            type="email"
            defaultValue={
              initial?.contactEmail ||
              defaultContactEmail
            }
            required
          />
        </div>

        <div className="field">
          <label>Contact phone</label>

          <input
            className="input"
            name="contactPhone"
            defaultValue={
              initial?.contactPhone || ""
            }
          />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label>
            GitHub URL (optional)
          </label>

          <input
            className="input"
            name="githubUrl"
            type="url"
            defaultValue={
              initial?.githubUrl || ""
            }
            placeholder="https://github.com/..."
          />
        </div>

        <div className="field">
          <label>
            Live demo URL (optional)
          </label>

          <input
            className="input"
            name="liveDemoUrl"
            type="url"
            defaultValue={
              initial?.liveDemoUrl || ""
            }
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="field">
        <label>
          Maximum participants
        </label>

        <input
          className="input"
          name="maxParticipants"
          type="number"
          min="1"
          max="100"
          defaultValue={
            initial?.maxParticipants || 5
          }
          required
        />
      </div>

      <div className="job-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading
            ? editing
              ? "Saving..."
              : "Posting..."
            : editing
              ? "Save changes"
              : "Post project"}
        </button>

        {editing && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              router.push(
                `/projects/${initial?.id}`
              )
            }
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
