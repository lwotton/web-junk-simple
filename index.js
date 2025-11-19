import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Simple in-memory rules
const FREE_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com"
];

const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com"
];

const NON_BUSINESS_TITLES = [
  "student",
  "teacher",
  "personal",
  "self",
  "none",
  "n/a"
];

const ROLE_BASED_LOCAL_PARTS = [
  "info",
  "support",
  "admin",
  "sales",
  "contact",
  "hello",
  "hi"
];

function classifyLead(lead) {
  const reasons = [];

  const email = (lead.email || "").toLowerCase().trim();
  const jobTitle = (lead.jobTitle || "").toLowerCase().trim();
  const company = (lead.company || "").trim();
  const country = (lead.country || "").trim();
  const ipCountry = (lead.ipCountry || "").trim();
  const firstName = (lead.firstName || "").toLowerCase().trim();
  const lastName = (lead.lastName || "").toLowerCase().trim();

  // Basic sanity: missing email = instant junk
  if (!email || !email.includes("@")) {
    reasons.push("Missing or invalid email");
  } else {
    const [localPart, domain] = email.split("@");

    if (DISPOSABLE_DOMAINS.includes(domain)) {
      reasons.push("Disposable email domain");
    }

    if (FREE_DOMAINS.includes(domain) && !company) {
      reasons.push("Free email with no company");
    }

    if (ROLE_BASED_LOCAL_PARTS.includes(localPart)) {
      reasons.push("Role-based email address");
    }
  }

  // Job title
  if (NON_BUSINESS_TITLES.includes(jobTitle)) {
    reasons.push(`Non-business title: ${jobTitle}`);
  }

  // Obvious test data
  if (firstName === "test" || lastName === "test" || email.includes("test")) {
    reasons.push("Test data");
  }

  // Country mismatch
  if (country && ipCountry && country !== ipCountry) {
    reasons.push("Country does not match IP country");
  }

  // Simple scoring: start at 1, subtract for each reason
  const baseScore = 1;
  const penaltyPerReason = 0.2;
  const score = Math.max(0, baseScore - reasons.length * penaltyPerReason);

  const isJunk = reasons.length > 0;

  return {
    isJunk,
    reason: reasons.length ? reasons.join("; ") : "Looks valid",
    score
  };
}

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "lead-classifier" });
});

// Main classify endpoint
app.post("/classify", (req, res) => {
  try {
    const lead = req.body || {};
    const result = classifyLead(lead);

    res.json({
      ...result,
      received: lead
    });
  } catch (err) {
    console.error("Classification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Lead classifier running on port ${PORT}`);
});
