"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Company = {
  name: string;
  email: string;
  contactPerson: string | null;
  phone: string | null;
  website: string | null;
  linkedinUrl: string | null;
  description: string | null;
} | null;

export function CompanyForm({ initial }: { initial: Company; }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      contactPerson: form.get("contactPerson"),
      phone: form.get("phone"),
      website: form.get("website"),
      linkedinUrl: form.get("linkedinUrl"),
      description: form.get("description"),
    };
    try {
      const response = await fetch("/api/companies/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) setMessage(body.error || "Could not save company.");
      else {
        setMessage("Company profile saved.");
        router.refresh();
      }
    } catch {
      setMessage("Could not save company.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card form-stack" onSubmit={submit}>
      {message && <div className={`form-message ${message.includes("saved") ? "success" : "error"}`}>{message}</div>}
      <div className="field">
        <label>Company name</label>
        <input className="input" name="name" defaultValue={initial?.name || ""} required />
      </div>
      <div className="form-row">
        <div className="field">
          <label>Company email</label>
          <input className="input" name="email" type="email" defaultValue={initial?.email || ""} required />
        </div>
        <div className="field">
          <label>Contact person</label>
          <input className="input" name="contactPerson" defaultValue={initial?.contactPerson || ""} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Phone</label>
          <input className="input" name="phone" defaultValue={initial?.phone || ""} />
        </div>
        <div className="field">
          <label>Website</label>
          <input
            className="input"
            name="website"
            type="url"
            defaultValue={initial?.website || ""}
            placeholder="https://..." />
        </div>
      </div>
      <div className="field">
        <label>LinkedIn (optional)</label>
        <input
          className="input"
          name="linkedinUrl"
          type="url"
          defaultValue={initial?.linkedinUrl || ""}
          placeholder="https://www.linkedin.com/company/..." />
        <span className="helper">Optional. Students can use this to learn more about your company.</span>
      </div>
      <div className="field">
        <label>Description</label>
        <textarea
          className="textarea"
          name="description"
          defaultValue={initial?.description || ""}
          placeholder="Tell students about the company." />
      </div>
      <button className="btn btn-primary" disabled={loading}>
        {loading ? "Saving..." : "Save company profile"}
      </button>
    </form>
  );
}
