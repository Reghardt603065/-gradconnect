"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  Database,
  MapPin,
  Search,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TestTube2,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { JobActions } from "@/components/job-actions";

export type MarketplaceJob = {
  id: string;
  source: string;
  title: string;
  company: string;
  companyFamily: string;
  description: string;
  location: string;
  category: string;
  experience: string;
  employment: string;
  applyUrl: string;
  remote: boolean;
  postedAt: string | null;
  createdAt: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  quality: number;
  saved: boolean;
  applicationStatus?: string;
};

const CATEGORIES = [
  "Software Development",
  "Data & AI",
  "Cybersecurity",
  "Cloud & DevOps",
  "IT Support & Infrastructure",
  "QA & Testing",
  "Business & Systems Analysis",
  "Product & UX",
  "Graduate & Internship",
];

const CATEGORY_ICON: Record<string, typeof Code2> = {
  "Software Development": Code2,
  "Data & AI": Database,
  Cybersecurity: ShieldCheck,
  "Cloud & DevOps": ServerCog,
  "IT Support & Infrastructure": Wifi,
  "QA & Testing": TestTube2,
  "Business & Systems Analysis": BriefcaseBusiness,
  "Product & UX": Sparkles,
  "Graduate & Internship": Users,
};

const PAGE_SIZE = 20;

function clean(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function dateAgeDays(job: MarketplaceJob) {
  const date = new Date(job.postedAt || job.createdAt);
  if (Number.isNaN(date.getTime())) return 9999;
  return Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
}

function relativeDate(job: MarketplaceJob) {
  const days = dateAgeDays(job);
  if (days < 1 / 24) return "Just now";
  if (days < 1) return `${Math.max(1, Math.floor(days * 24))}h ago`;
  if (days < 2) return "Yesterday";
  if (days < 7) return `${Math.floor(days)} days ago`;
  if (days < 35) return `${Math.floor(days / 7)}w ago`;
  return new Date(job.postedAt || job.createdAt).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

function formatSalary(job: MarketplaceJob) {
  if (!job.salaryMin && !job.salaryMax) return null;
  if (job.currency && job.currency.toUpperCase() !== "ZAR") return null;
  const formatter = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  });

  if (job.salaryMin && job.salaryMax && job.salaryMin !== job.salaryMax) {
    return `${formatter.format(job.salaryMin)} – ${formatter.format(job.salaryMax)}`;
  }
  return formatter.format(job.salaryMin || job.salaryMax || 0);
}

function initials(company: string) {
  const words = company
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "IT";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Marketplace ordering: one turn per employer before an employer repeats.
 * Companies with strong/fresh junior-friendly roles are promoted, but the
 * company order is salted by the current week so the home feed does not look
 * frozen forever.
 */
function chunkPages<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

/**
 * Marketplace pagination is built in employer rounds rather than slicing one
 * giant list. That guarantees the same employer never appears twice on the
 * same page. If there are fewer than 20 employers after filtering, the page is
 * intentionally shorter instead of padding it with repeated company names.
 */
function balancedPages(jobs: MarketplaceJob[], graduateFirst = false) {
  const groups = new Map<string, MarketplaceJob[]>();
  for (const job of jobs) {
    const group = groups.get(job.companyFamily) || [];
    group.push(job);
    groups.set(job.companyFamily, group);
  }

  const week = Math.floor(Date.now() / (7 * 86_400_000));
  const companyGroups = [...groups.entries()]
    .map(([companyFamily, group]) => {
      const ranked = [...group].sort((a, b) => {
        if (graduateFirst) {
          const aGrad = /graduate|entry|junior/i.test(a.experience) ? 1 : 0;
          const bGrad = /graduate|entry|junior/i.test(b.experience) ? 1 : 0;
          if (aGrad !== bGrad) return bGrad - aGrad;
        }
        return b.quality - a.quality || dateAgeDays(a) - dateAgeDays(b);
      });
      return {
        companyFamily,
        jobs: ranked,
        score: ranked[0]?.quality || 0,
        shuffle: stableHash(`${companyFamily}-${week}`),
      };
    })
    .sort((a, b) => b.score - a.score || a.shuffle - b.shuffle);

  const pages: MarketplaceJob[][] = [];
  const maxRounds = Math.max(0, ...companyGroups.map((group) => group.jobs.length));

  for (let round = 0; round < maxRounds; round += 1) {
    const onePerCompany = companyGroups
      .map((group) => group.jobs[round])
      .filter((job): job is MarketplaceJob => Boolean(job));
    pages.push(...chunkPages(onePerCompany, PAGE_SIZE));
  }

  return pages;
}

export function JobMarketplace({ initialJobs }: { initialJobs: MarketplaceJob[] }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [employment, setEmployment] = useState("");
  const [datePosted, setDatePosted] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sort, setSort] = useState("marketplace");
  const [page, setPage] = useState(1);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of initialJobs) counts.set(job.category, (counts.get(job.category) || 0) + 1);
    return counts;
  }, [initialJobs]);

  const filtered = useMemo(() => {
    const q = clean(query);
    const loc = clean(location);
    return initialJobs.filter((job) => {
      if (q) {
        const haystack = clean(`${job.title} ${job.company} ${job.description} ${job.category}`);
        if (!haystack.includes(q)) return false;
      }
      if (loc && !clean(job.location).includes(loc)) return false;
      if (category && job.category !== category) return false;
      if (experience && job.experience !== experience) return false;
      if (employment && job.employment !== employment) return false;
      if (remoteOnly && !job.remote) return false;
      if (datePosted) {
        const days = dateAgeDays(job);
        if (datePosted === "24h" && days > 1) return false;
        if (datePosted === "7d" && days > 7) return false;
        if (datePosted === "30d" && days > 30) return false;
      }
      return true;
    });
  }, [initialJobs, query, location, category, experience, employment, remoteOnly, datePosted]);

  const resultPages = useMemo(() => {
    if (sort === "newest") {
      return chunkPages(
        [...filtered].sort((a, b) => dateAgeDays(a) - dateAgeDays(b)),
        PAGE_SIZE,
      );
    }
    if (sort === "graduate") return balancedPages(filtered, true);
    return balancedPages(filtered, false);
  }, [filtered, sort]);

  const companyCount = useMemo(
    () => new Set(filtered.map((job) => job.companyFamily)).size,
    [filtered],
  );

  const topCompanies = useMemo(() => {
    const companies = new Map<string, { name: string; count: number }>();
    for (const job of filtered) {
      const current = companies.get(job.companyFamily);
      if (current) current.count += 1;
      else companies.set(job.companyFamily, { name: job.company, count: 1 });
    }
    return [...companies.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 14);
  }, [filtered]);

  const totalPages = Math.max(1, resultPages.length);
  const safePage = Math.min(page, totalPages);
  const visibleJobs = resultPages[safePage - 1] || [];

  const hasFilters = Boolean(
    query || location || category || experience || employment || datePosted || remoteOnly,
  );

  const resetPage = () => setPage(1);
  const clearFilters = () => {
    setQuery("");
    setLocation("");
    setCategory("");
    setExperience("");
    setEmployment("");
    setDatePosted("");
    setRemoteOnly(false);
    setSort("marketplace");
    setPage(1);
  };

  const selectCategory = (value: string) => {
    setCategory(category === value ? "" : value);
    setPage(1);
  };

  return (
    <div className="jobs-marketplace">
      <section className="jobs-search-hero">
        <div>
          <span className="jobs-kicker">South Africa · IT only</span>
          <h2>Find your next tech role</h2>
          <p>
            Search a mixed marketplace of software, data, cyber, cloud and IT roles — not one company over and over.
          </p>
        </div>

        <div className="jobs-search-row">
          <label className="jobs-search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetPage();
              }}
              placeholder="Job title, skill or company"
              aria-label="Job title, skill or company"
            />
          </label>
          <label className="jobs-search-box jobs-search-location">
            <MapPin size={18} />
            <input
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                resetPage();
              }}
              placeholder="City or province"
              aria-label="City or province"
            />
          </label>
          <button className="btn btn-primary jobs-search-button" type="button">
            Search jobs
          </button>
        </div>

        <div className="jobs-quick-searches">
          <span>Popular:</span>
          {["Graduate", "Junior developer", "React", "Java", "C#", "Python", "Data", "Cybersecurity"].map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuery(item);
                  resetPage();
                }}
              >
                {item}
              </button>
            ),
          )}
        </div>
      </section>

      <section className="jobs-category-strip" aria-label="IT job categories">
        {CATEGORIES.map((item) => {
          const Icon = CATEGORY_ICON[item] || Code2;
          const active = category === item;
          return (
            <button
              type="button"
              className={`jobs-category-chip${active ? " active" : ""}`}
              onClick={() => selectCategory(item)}
              key={item}
            >
              <Icon size={17} />
              <span>{item}</span>
              <strong>{categoryCounts.get(item) || 0}</strong>
            </button>
          );
        })}
      </section>

      <div className="jobs-marketplace-grid">
        <aside className="jobs-filter-sidebar">
          <div className="jobs-filter-title">
            <span><SlidersHorizontal size={18} /> Filters</span>
            {hasFilters && (
              <button type="button" onClick={clearFilters}>Clear all</button>
            )}
          </div>

          <div className="jobs-filter-group">
            <label htmlFor="job-category">IT category</label>
            <select
              id="job-category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                resetPage();
              }}
            >
              <option value="">All IT categories</option>
              {CATEGORIES.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </div>

          <div className="jobs-filter-group">
            <label htmlFor="job-experience">Experience level</label>
            <select
              id="job-experience"
              value={experience}
              onChange={(event) => {
                setExperience(event.target.value);
                resetPage();
              }}
            >
              <option value="">Any experience</option>
              <option value="Graduate / Entry level">Graduate / Entry level</option>
              <option value="Junior">Junior</option>
              <option value="Mid level">Mid level</option>
              <option value="Senior">Senior</option>
            </select>
          </div>

          <div className="jobs-filter-group">
            <label htmlFor="job-employment">Work type</label>
            <select
              id="job-employment"
              value={employment}
              onChange={(event) => {
                setEmployment(event.target.value);
                resetPage();
              }}
            >
              <option value="">Any work type</option>
              <option value="Full time">Full time</option>
              <option value="Contract">Contract / fixed term</option>
              <option value="Internship">Internship / learnership</option>
              <option value="Part time">Part time</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="jobs-filter-group">
            <label htmlFor="job-date">Date posted</label>
            <select
              id="job-date"
              value={datePosted}
              onChange={(event) => {
                setDatePosted(event.target.value);
                resetPage();
              }}
            >
              <option value="">Any date</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          <label className="jobs-check-row">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(event) => {
                setRemoteOnly(event.target.checked);
                resetPage();
              }}
            />
            <span>
              <strong>Remote only</strong>
              <small>South Africa-based remote roles</small>
            </span>
          </label>

          <div className="jobs-filter-note">
            <ShieldCheck size={17} />
            <span>Strict IT filter removes sales, finance, HR and unrelated engineering roles.</span>
          </div>
        </aside>

        <main className="jobs-results-panel">
          <div className="jobs-results-toolbar">
            <div>
              <h3>{filtered.length.toLocaleString("en-ZA")} IT jobs</h3>
              <p>
                Across <strong>{companyCount.toLocaleString("en-ZA")}</strong> different companies in South Africa
              </p>
            </div>
            <label className="jobs-sort">
              <span>Sort by</span>
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  resetPage();
                }}
              >
                <option value="marketplace">Best company mix</option>
                <option value="graduate">Graduate & junior first</option>
                <option value="newest">Newest first</option>
              </select>
            </label>
          </div>

          {topCompanies.length > 0 && (
            <div className="jobs-company-strip">
              <span className="jobs-company-strip-label">Hiring now</span>
              <div>
                {topCompanies.map((company) => (
                  <button
                    type="button"
                    key={company.name}
                    onClick={() => {
                      setQuery(company.name);
                      resetPage();
                    }}
                  >
                    <span>{initials(company.name)}</span>
                    {company.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasFilters && (
            <div className="jobs-active-filters">
              {query && <button onClick={() => setQuery("")} type="button">Search: {query} <X size={13} /></button>}
              {location && <button onClick={() => setLocation("")} type="button">{location} <X size={13} /></button>}
              {category && <button onClick={() => setCategory("")} type="button">{category} <X size={13} /></button>}
              {experience && <button onClick={() => setExperience("")} type="button">{experience} <X size={13} /></button>}
              {employment && <button onClick={() => setEmployment("")} type="button">{employment} <X size={13} /></button>}
              {datePosted && <button onClick={() => setDatePosted("")} type="button">{datePosted} <X size={13} /></button>}
              {remoteOnly && <button onClick={() => setRemoteOnly(false)} type="button">Remote <X size={13} /></button>}
            </div>
          )}

          <div className="jobs-list">
            {visibleJobs.length ? (
              visibleJobs.map((job, index) => {
                const salary = formatSalary(job);
                return (
                  <article className="market-job-card" key={job.id}>
                    <div className="market-job-logo" aria-hidden="true">{initials(job.company)}</div>

                    <div className="market-job-main">
                      <div className="market-job-heading">
                        <div>
                          <h3>{job.title}</h3>
                          <p className="market-job-company"><Building2 size={14} /> {job.company}</p>
                        </div>
                        {index < 3 && sort === "marketplace" && <span className="market-match-badge">Strong match</span>}
                      </div>

                      <div className="market-job-meta">
                        <span><MapPin size={14} /> {job.location}</span>
                        <span><BriefcaseBusiness size={14} /> {job.employment}</span>
                        <span><Clock3 size={14} /> {relativeDate(job)}</span>
                        {job.remote && <span className="market-remote-pill">Remote</span>}
                      </div>

                      <div className="market-job-tags">
                        <span>{job.category}</span>
                        <span>{job.experience}</span>
                        {salary && <strong>{salary}</strong>}
                      </div>

                      <p className="market-job-description">{job.description}</p>

                      <div className="market-job-footer">
                        <span>Source: {job.source}</span>
                        <JobActions
                          jobId={job.id}
                          applyUrl={job.applyUrl}
                          initialSaved={job.saved}
                          applicationStatus={job.applicationStatus}
                        />
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="jobs-empty-state">
                <Search size={30} />
                <h3>No matching IT jobs</h3>
                <p>Try a broader keyword or clear one of your filters.</p>
                <button className="btn btn-primary" type="button" onClick={clearFilters}>Show all IT jobs</button>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <nav className="jobs-pagination" aria-label="Job results pages">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => {
                  setPage(Math.max(1, safePage - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span>Page <strong>{safePage}</strong> of {totalPages}</span>
              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => {
                  setPage(Math.min(totalPages, safePage + 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </main>
      </div>
    </div>
  );
}
