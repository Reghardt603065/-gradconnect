"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  ImagePlus,
  Save,
  Trash2,
} from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  username: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  skills: string[];
  githubUsername: string | null;
  linkedinUrl: string | null;
  image: string | null;
};

type ProfileEditorProps = {
  initial: User;
  uploadedImageUrl: string | null;
};

const MAX_PROFILE_IMAGE_BYTES = 1_000_000;
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function ProfileEditor({
  initial,
  uploadedImageUrl,
}: ProfileEditorProps) {
  const [user, setUser] = useState(initial);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [imagePreview, setImagePreview] = useState(
    uploadedImageUrl || initial.image || "",
  );
  const [hasUploadedImage, setHasUploadedImage] = useState(Boolean(uploadedImageUrl));
  const [imageBusy, setImageBusy] = useState(false);

  function showMessage(text: string, type: "success" | "error") {
    setMessage(text);
    setMessageType(type);
  }

  async function uploadImage(file: File | undefined) {
    setMessage("");

    if (!file) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      showMessage("Use a JPG, PNG or WebP profile image.", "error");
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      showMessage("Profile images must be 1 MB or smaller.", "error");
      return;
    }

    setImageBusy(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/users/me/profile-image", {
        method: "POST",
        body: formData,
      });

      const body = await response.json();

      if (!response.ok) {
        showMessage(body.error || "Profile picture could not be uploaded.", "error");
        return;
      }

      setImagePreview(body.data.imageUrl);
      setHasUploadedImage(true);
      showMessage("Profile picture updated.", "success");
    } catch {
      showMessage("Profile picture could not be uploaded.", "error");
    } finally {
      setImageBusy(false);
    }
  }

  async function removeImage() {
    setImageBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/users/me/profile-image", {
        method: "DELETE",
      });

      if (!response.ok) {
        showMessage("Profile picture could not be removed.", "error");
        return;
      }

      setImagePreview(user.image || "");
      setHasUploadedImage(false);
      showMessage("Uploaded profile picture removed.", "success");
    } finally {
      setImageBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      username: form.get("username"),
      headline: form.get("headline"),
      bio: form.get("bio"),
      location: form.get("location"),
      skills: String(form.get("skills") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      githubUsername: form.get("githubUsername"),
      linkedinUrl: form.get("linkedinUrl"),
    };

    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok) {
      showMessage(body.error || "Profile update failed.", "error");
      return;
    }

    setUser((current) => ({
      ...current,
      ...body.data,
    }));
    showMessage("Profile saved.", "success");
  }

  async function removeAccount() {
    const confirmed = confirm(
      "Permanently delete your GradConnect account and all related data?",
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch("/api/users/me", {
      method: "DELETE",
    });

    if (response.ok) {
      window.location.href = "/";
    }
  }

  return (
    <section className="grid grid-3">
      <div className="card" style={{ alignSelf: "start" }}>
        <div
          className="profile-avatar"
          style={
            imagePreview
              ? {
                  backgroundImage: `url(${imagePreview})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  color: "transparent",
                }
              : {}
          }
        >
          {user.name
            .split(" ")
            .map((value) => value[0])
            .join("")
            .slice(0, 2)}
        </div>

        <h2 style={{ marginTop: 18 }}>{user.name}</h2>
        <p className="muted">{user.headline || "IT Graduate"}</p>

        <div className="tags">
          {user.skills.slice(0, 8).map((skill) => (
            <span className="badge" key={skill}>
              {skill}
            </span>
          ))}
        </div>

        <div className="grid" style={{ marginTop: 18 }}>
          <Link
            className="btn btn-secondary"
            href={`/portfolio/${user.username}`}
            target="_blank"
          >
            Public profile <ExternalLink size={16} />
          </Link>

          <a
            className="btn btn-primary"
            href="/api/cv"
            target="_blank"
          >
            Download CV <Download size={16} />
          </a>
        </div>
      </div>

      <form
        className="card form-stack grid-span-2"
        onSubmit={save}
      >
        <h2>Edit profile</h2>

        {message && (
          <div className={`form-message ${messageType}`}>
            {message}
          </div>
        )}

        <div className="form-row">
          <div className="field">
            <label>Full name</label>
            <input
              className="input"
              name="name"
              defaultValue={user.name}
              required
            />
          </div>

          <div className="field">
            <label>Username</label>
            <input
              className="input"
              name="username"
              defaultValue={user.username}
              pattern="[a-z0-9-]{3,40}"
              required
            />
          </div>
        </div>

        <div className="field">
          <label>Professional headline</label>
          <input
            className="input"
            name="headline"
            defaultValue={user.headline || ""}
            placeholder="Junior Software Developer"
          />
        </div>

        <div className="field">
          <label>About me</label>
          <textarea
            className="textarea"
            name="bio"
            defaultValue={user.bio || ""}
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label>Location</label>
            <input
              className="input"
              name="location"
              defaultValue={user.location || ""}
            />
          </div>

          <div className="field">
            <label>Profile picture</label>
            <input
              className="input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={imageBusy}
              onChange={(event) => uploadImage(event.target.files?.[0])}
            />

            {hasUploadedImage && (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                style={{ marginTop: 8 }}
                disabled={imageBusy}
                onClick={removeImage}
              >
                Remove uploaded picture
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <label>Skills</label>
          <input
            className="input"
            name="skills"
            defaultValue={user.skills.join(", ")}
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label>GitHub username</label>
            <input
              className="input"
              name="githubUsername"
              defaultValue={user.githubUsername || ""}
            />
          </div>

          <div className="field">
            <label>LinkedIn URL</label>
            <input
              className="input"
              type="url"
              name="linkedinUrl"
              defaultValue={user.linkedinUrl || ""}
              placeholder="https://www.linkedin.com/in/..."
            />
          </div>
        </div>

        <button className="btn btn-primary">
          <Save size={16} /> Save profile
        </button>

        <hr
          style={{
            border: 0,
            borderTop: "1px solid #e4e7ec",
            width: "100%",
          }}
        />

        <div className="list-item">
          <div>
            <strong>Delete account</strong>
            <div className="helper">
              This permanently removes the profile and related records.
            </div>
          </div>

          <button
            type="button"
            className="btn btn-danger btn-small"
            onClick={removeAccount}
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </form>
    </section>
  );
}
