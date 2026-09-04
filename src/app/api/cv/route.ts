import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { jsonError, requireApiUser } from "@/lib/api";

function wrapText(text: string, width = 86) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET() {
  const sessionUser = await requireApiUser();
  if (!sessionUser) return jsonError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      certifications: { where: { status: "COMPLETED" }, orderBy: { issueDate: "desc" } },
      portfolioProjects: { orderBy: [{ featured: "desc" }, { updatedAt: "desc" }], take: 8 },
    },
  });
  if (!user) return jsonError("User not found", 404);

  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 790;

  const draw = (text: string, size = 10, isBold = false, indent = 0) => {
    if (y < 60) {
      page = pdf.addPage([595.28, 841.89]);
      y = 790;
    }
    page.drawText(text, { x: 48 + indent, y, size, font: isBold ? bold : regular, color: rgb(0.1, 0.15, 0.25) });
    y -= size + 5;
  };

  draw(user.name, 22, true);
  draw(user.headline || "IT Graduate", 12, true);
  draw([
    user.email,
    user.location,
    user.githubUsername ? `github.com/${user.githubUsername}` : null,
    user.linkedinUrl
  ].filter(Boolean).join(" | "), 9);
  y -= 8;

  if (user.bio) {
    draw("PROFILE", 12, true);
    for (const line of wrapText(user.bio)) draw(line, 9);
    y -= 6;
  }

  draw("SKILLS", 12, true);
  for (const line of wrapText(user.skills.join(" • ") || "Add skills in GradConnect")) draw(line, 9);
  y -= 6;

  draw("PROJECTS", 12, true);
  for (const project of user.portfolioProjects) {
    draw(project.title, 10, true);
    for (const line of wrapText(project.description, 82)) draw(line, 8, false, 8);
    if (project.technologies.length) draw(`Tech: ${project.technologies.join(", ")}`, 8, false, 8);
    if (project.githubUrl) draw(project.githubUrl, 8, false, 8);
    y -= 4;
  }

  draw("CERTIFICATIONS", 12, true);
  for (const certification of user.certifications) {
    draw(`${certification.name} - ${certification.issuer}`, 9, true);
  }

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${user.username}-gradconnect-cv.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
