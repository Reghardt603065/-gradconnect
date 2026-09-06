import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url()
  .or(z.literal(""))
  .transform((value) => value || undefined);

const imageDataUrl = z
  .string()
  .max(3_000_000)
  .regex(
    /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/,
    "Invalid image data",
  );

const optionalImage = z
  .union([
    z.string().trim().url(),
    imageDataUrl,
    z.literal(""),
  ])
  .transform((value) => value || undefined);

export const registerSchema = z.object({
  accountType: z.enum(["GRADUATE", "COMPANY"]).default("GRADUATE"),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(/[A-Z]/, "Password needs an uppercase letter")
    .regex(/[a-z]/, "Password needs a lowercase letter")
    .regex(/[0-9]/, "Password needs a number"),
  skills: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  companyName: z.string().trim().max(120).optional().default(""),
  companyEmail: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.accountType === "COMPANY" && !value.companyName) {
    ctx.addIssue({ code: "custom", path: ["companyName"], message: "Company name is required" });
  }
  if (value.accountType === "COMPANY" && !value.companyEmail) {
    ctx.addIssue({ code: "custom", path: ["companyEmail"], message: "Company email is required" });
  }
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(100),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/),
  headline: z.string().trim().max(120).optional().default(""),
  bio: z.string().trim().max(800).optional().default(""),
  location: z.string().trim().max(100).optional().default(""),
  skills: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  githubUsername: z.string().trim().max(80).optional().default(""),
  linkedinUrl: optionalUrl,
});

export const certificationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  issuer: z.string().trim().min(2).max(120),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "EXPIRED"]).default("PLANNED"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  credentialUrl: optionalUrl.nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const portfolioProjectSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(1500),
  technologies: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  githubUrl: optionalUrl,
  liveUrl: optionalUrl,
  imageUrl: optionalImage,
  featured: z.boolean().default(false),
});


export const portfolioProjectUpdateSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(10).max(1500).optional(),
  technologies: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  githubUrl: optionalUrl.optional(),
  liveUrl: optionalUrl.optional(),
  imageUrl: optionalImage.optional(),
  featured: z.boolean().optional(),
});

export const applicationSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"]),
  appliedAt: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const goalSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).optional().default(""),
  partnerId: z.string().uuid().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]).default("ACTIVE"),
});

export const messageSchema = z.object({
  receiverId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

export const hackathonSchema = z.object({
  name: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(2000),
  location: z.string().trim().max(140).optional().default(""),
  mode: z.enum(["ONLINE", "IN_PERSON", "HYBRID"]).default("ONLINE"),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  registrationDeadline: z.string().optional().nullable(),
  websiteUrl: optionalUrl,
  technologies: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
}).superRefine((value, ctx) => {
  const start = new Date(value.startDate);
  const end = new Date(value.endDate);
  const deadline = value.registrationDeadline ? new Date(value.registrationDeadline) : null;

  if (Number.isNaN(start.getTime())) {
    ctx.addIssue({ code: "custom", path: ["startDate"], message: "Invalid start date" });
  }
  if (Number.isNaN(end.getTime())) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "Invalid end date" });
  }
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the start date" });
  }
  if (deadline && Number.isNaN(deadline.getTime())) {
    ctx.addIssue({ code: "custom", path: ["registrationDeadline"], message: "Invalid registration deadline" });
  }
});

export const teamSchema = z.object({
  hackathonId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().default(""),
  repositoryUrl: optionalUrl,
});


export const companySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  contactPerson: z.string().trim().max(100).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  website: optionalUrl,
  linkedinUrl: optionalUrl,
  description: z.string().trim().max(1000).optional().default(""),
});

export const companyProjectSchema = z.object({
  title: z.string().trim().min(3).max(160),
  category: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(10).max(500),
  description: z.string().trim().min(10).max(4000),
  requirements: z.string().trim().min(3).max(3000),
  expectedOutcome: z.string().trim().max(2000).optional().default(""),
  technologies: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  contactEmail: z.string().trim().toLowerCase().email().max(200),
  contactPhone: z.string().trim().max(40).optional().default(""),
  githubUrl: optionalUrl,
  liveDemoUrl: optionalUrl,
  maxParticipants: z.coerce.number().int().min(1).max(100).default(5),
});

export const projectUpdateSchema = companyProjectSchema.partial().extend({
  status: z.enum(["ACTIVE", "FULL", "CLOSED"]).optional(),
});

export const projectSubscriptionSchema = z.object({
  action: z.enum(["subscribe", "withdraw"]),
});


export const teamWorkspaceSchema = z.object({
  repositoryUrl: optionalUrl,
  notes: z.string().trim().max(5000).default(""),
  tasks: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      title: z.string().trim().min(1).max(160),
      done: z.boolean().default(false),
      assigneeId: z.string().uuid().nullable().optional(),
    }),
  ).max(50).default([]),
});

export const challengeCompletionSchema = z.object({
  challengeKey: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(1000).optional().default(""),
});
