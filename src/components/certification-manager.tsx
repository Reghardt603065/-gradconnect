"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Award,
  ExternalLink,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

type Certification = {
  id: string;
  name: string;
  issuer: string;
  status: string;
  progress: number;
  issueDate: string | null;
  expiryDate: string | null;
  credentialUrl: string | null;
  skills: string[];
};

type CertificationListing = {
  id: string;
  title: string;
  provider: string;
  description: string | null;
  url: string;
  source: string;
  externalId: string;
  category: string | null;
  level: string | null;
  duration: string | null;
  cost: string | null;
  isFree: boolean;
  certificateType: string | null;
  skills: string[];
  matchScore: number;
  matchedSkills: string[];
};

type ListingCardProps = {
  listing: CertificationListing;
  alreadyAdded: boolean;
  onAdd: (listing: CertificationListing) => void;
  recommended?: boolean;
};

function ListingCard({
  listing,
  alreadyAdded,
  onAdd,
  recommended = false,
}: ListingCardProps) {
  return (
    <article className="card">
      <div className="list-item" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="tags">
            {recommended && (
              <span className="badge gold">
                <Sparkles size={13} /> Recommended
              </span>
            )}

            {listing.isFree && (
              <span className="badge green">Free</span>
            )}

            {listing.category && (
              <span className="badge">{listing.category}</span>
            )}
          </div>

          <h3 style={{ marginTop: 12 }}>{listing.title}</h3>
          <span className="muted">{listing.provider}</span>
        </div>

        {listing.matchScore > 0 && (
          <span className="badge blue">
            {listing.matchScore}% match
          </span>
        )}
      </div>

      {listing.description && (
        <p className="muted">{listing.description}</p>
      )}

      <div className="tags">
        {listing.level && (
          <span className="badge">{listing.level}</span>
        )}
        {listing.duration && (
          <span className="badge">{listing.duration}</span>
        )}
        {listing.skills.map((skill) => (
          <span
            className={
              listing.matchedSkills.includes(skill)
                ? "badge gold"
                : "badge"
            }
            key={skill}
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="job-actions" style={{ marginTop: 18 }}>
        <button
          className="btn btn-primary btn-small"
          onClick={() => onAdd(listing)}
          disabled={alreadyAdded}
        >
          <Plus size={15} />
          {alreadyAdded ? "Already added" : "Add certification"}
        </button>

        <a
          className="btn btn-secondary btn-small"
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View <ExternalLink size={15} />
        </a>
      </div>
    </article>
  );
}

export function CertificationManager({
  initial,
}: {
  initial: Certification[];
}) {
  const [items, setItems] = useState(initial);
  const [message, setMessage] = useState("");
  const [listings, setListings] = useState<CertificationListing[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [provider, setProvider] = useState("");
  const [skill, setSkill] = useState("");
  const [freeOnly, setFreeOnly] = useState(true);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listingError, setListingError] = useState("");

  const average = useMemo(() => {
    if (!items.length) {
      return 0;
    }

    const total = items.reduce(
      (sum, item) => sum + item.progress,
      0,
    );

    return Math.round(total / items.length);
  }, [items]);

  useEffect(() => {
    async function loadListings() {
      try {
        setLoadingListings(true);
        setListingError("");

        const response = await fetch("/api/certification-listings");

        if (!response.ok) {
          throw new Error("Could not load certification listings");
        }

        const data = await response.json();
        setListings(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        console.error(error);
        setListingError("Could not load certification listings.");
      } finally {
        setLoadingListings(false);
      }
    }

    loadListings();
  }, []);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          listings
            .map((listing) => listing.category)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [listings],
  );

  const providers = useMemo(
    () =>
      Array.from(
        new Set(listings.map((listing) => listing.provider)),
      ).sort(),
    [listings],
  );

  const skills = useMemo(
    () =>
      Array.from(
        new Set(listings.flatMap((listing) => listing.skills)),
      ).sort(),
    [listings],
  );

  const recommendedListings = useMemo(
    () => listings.filter((listing) => listing.matchScore > 0).slice(0, 6),
    [listings],
  );

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return listings.filter((listing) => {
      if (freeOnly && !listing.isFree) {
        return false;
      }

      if (category && listing.category !== category) {
        return false;
      }

      if (provider && listing.provider !== provider) {
        return false;
      }

      if (skill && !listing.skills.includes(skill)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableText = [
        listing.title,
        listing.provider,
        listing.description,
        listing.category,
        listing.level,
        listing.certificateType,
        ...listing.skills,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [listings, search, category, provider, skill, freeOnly]);

  function isAlreadyAdded(listing: CertificationListing) {
    return items.some(
      (item) =>
        item.name.toLowerCase() === listing.title.toLowerCase() &&
        item.issuer.toLowerCase() === listing.provider.toLowerCase(),
    );
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      issuer: form.get("issuer"),
      status: form.get("status"),
      progress: Number(form.get("progress") || 0),
      issueDate: null,
      expiryDate: form.get("expiryDate") || null,
      credentialUrl: "",
      skills: String(form.get("skills") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    };

    const response = await fetch("/api/certifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error || "Could not add certification.");
      return;
    }

    setItems((current) => [body.data, ...current]);
    event.currentTarget.reset();
    setMessage("Certification added.");
  }

  async function addFromListing(listing: CertificationListing) {
    setMessage("");

    if (isAlreadyAdded(listing)) {
      setMessage("This certification is already in My Certifications.");
      return;
    }

    const response = await fetch("/api/certifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: listing.title,
        issuer: listing.provider,
        status: "PLANNED",
        progress: 0,
        issueDate: null,
        expiryDate: null,
        credentialUrl: listing.url,
        skills: listing.skills,
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error || "Could not add certification.");
      return;
    }

    setItems((current) => [body.data, ...current]);
    setMessage(`"${listing.title}" added to My Certifications.`);
  }

  async function update(
    id: string,
    status: string,
    progress: number,
  ) {
    const response = await fetch(`/api/certifications/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
        progress,
      }),
    });

    if (!response.ok) {
      return;
    }

    const body = await response.json();

    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...body.data,
            }
          : item,
      ),
    );
  }

  async function remove(id: string) {
    if (!confirm("Delete this certification?")) {
      return;
    }

    const response = await fetch(`/api/certifications/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
    }
  }

  return (
    <>
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="list-item">
          <div>
            <h2 style={{ marginBottom: 5 }}>Overall certification progress</h2>
            <span className="muted">Average across your skills ledger</span>
          </div>
          <span className="stat-value">{average}%</span>
        </div>
        <div className="progress">
          <span style={{ width: `${average}%` }} />
        </div>
      </section>

      <section>
        <div style={{ marginBottom: 14 }}>
          <h2>My Certifications</h2>
        </div>

        <div className="grid grid-3">
          <form className="card form-stack" onSubmit={add}>
            <h2>
              <Plus size={19} /> Add certification
            </h2>

            {message && <div className="form-message">{message}</div>}

            <div className="field">
              <label>Name</label>
              <input className="input" name="name" required />
            </div>

            <div className="field">
              <label>Issuer</label>
              <input className="input" name="issuer" required />
            </div>

            <div className="form-row">
              <div className="field">
                <label>Status</label>
                <select className="select" name="status" defaultValue="IN_PROGRESS">
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="field">
                <label>Progress %</label>
                <input
                  className="input"
                  name="progress"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="0"
                />
              </div>
            </div>

            <div className="field">
              <label>Skills</label>
              <input
                className="input"
                name="skills"
                placeholder="React, JavaScript"
              />
            </div>

            <div className="field">
              <label>Expiry date</label>
              <input className="input" name="expiryDate" type="date" />
            </div>

            <button className="btn btn-primary">Add certification</button>
          </form>

          <div className="grid grid-span-2">
            {items.length ? (
              items.map((item) => (
                <article className="card" key={item.id}>
                  <div className="list-item">
                    <div>
                      <span className="icon-box">
                        <Award size={20} />
                      </span>
                      <h3 style={{ margin: "12px 0 3px" }}>{item.name}</h3>
                      <span className="muted">{item.issuer}</span>
                    </div>

                    <div className="job-actions">
                      <select
                        className="select"
                        value={item.status}
                        onChange={(event) =>
                          update(
                            item.id,
                            event.target.value,
                            event.target.value === "COMPLETED"
                              ? 100
                              : item.progress,
                          )
                        }
                      >
                        <option value="PLANNED">Planned</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="EXPIRED">Expired</option>
                      </select>

                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => remove(item.id)}
                        aria-label="Delete certification"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="tags">
                    {item.skills.map((itemSkill) => (
                      <span className="badge" key={itemSkill}>
                        {itemSkill}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      marginTop: 14,
                    }}
                  >
                    <div className="progress" style={{ flex: 1 }}>
                      <span style={{ width: `${item.progress}%` }} />
                    </div>
                    <strong>{item.progress}%</strong>
                  </div>

                  <input
                    aria-label="Certification progress"
                    type="range"
                    min="0"
                    max="100"
                    value={item.progress}
                    disabled={item.status === "COMPLETED"}
                    onChange={(event) => {
                      const progress = Number(event.target.value);
                      setItems((current) =>
                        current.map((certification) =>
                          certification.id === item.id
                            ? {
                                ...certification,
                                progress,
                              }
                            : certification,
                        ),
                      );
                    }}
                    onPointerUp={(event) =>
                      update(
                        item.id,
                        item.status,
                        Number((event.target as HTMLInputElement).value),
                      )
                    }
                  />
                </article>
              ))
            ) : (
              <div className="card empty">No certifications yet.</div>
            )}
          </div>
        </div>
      </section>

      {recommendedListings.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <div className="section-heading">
            <div className="eyebrow">Based on your profile skills</div>
            <h2>Recommended for you</h2>
          </div>

          <div className="grid grid-3">
            {recommendedListings.map((listing) => (
              <ListingCard
                key={`recommended-${listing.id}`}
                listing={listing}
                alreadyAdded={isAlreadyAdded(listing)}
                onAdd={addFromListing}
                recommended
              />
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 32 }}>
        <div style={{ marginBottom: 14 }}>
          <h2>Browse Certifications</h2>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="certification-filter-grid">
            <div className="field">
              <label htmlFor="certification-search">Search</label>
              <div style={{ position: "relative" }}>
                <Search
                  size={17}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <input
                  id="certification-search"
                  className="input"
                  style={{ paddingLeft: 34 }}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search certifications or skills"
                />
              </div>
            </div>

            <div className="field">
              <label>Category</label>
              <select
                className="select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Provider</label>
              <select
                className="select"
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
              >
                <option value="">All providers</option>
                {providers.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Skill</label>
              <select
                className="select"
                value={skill}
                onChange={(event) => setSkill(event.target.value)}
              >
                <option value="">All skills</option>
                {skills.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(event) => setFreeOnly(event.target.checked)}
              />
              Free only
            </label>
          </div>
        </div>

        {loadingListings && (
          <div className="card empty">Loading certifications...</div>
        )}

        {listingError && (
          <div className="form-message error">{listingError}</div>
        )}

        {!loadingListings &&
          !listingError &&
          (filteredListings.length ? (
            <div className="grid grid-3">
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  alreadyAdded={isAlreadyAdded(listing)}
                  onAdd={addFromListing}
                />
              ))}
            </div>
          ) : (
            <div className="card empty">No certifications match your search.</div>
          ))}
      </section>
    </>
  );
}
