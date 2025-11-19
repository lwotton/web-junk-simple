import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rules
const FREE_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
const DISPOSABLE_DOMAINS = ["mailinator.com", "10minutemail.com", "guerrillamail.com"];
const NON_BUSINESS_TITLES = ["student", "teacher", "personal", "self", "none", "n/a"];
const ROLE_BASED_LOCAL_PARTS = ["info", "support", "admin", "sales", "contact", "hello", "hi"];

function safe(value, defaultValue = "") {
  return (value ?? defaultValue).toString().trim();
}

function toLower(value) {
  return safe(value).toLowerCase();
}

function classifyLead(lead) {
  const reasons = [];

  // Safe extraction of fields
  const email = toLower(lead.email);
  const firstName = toLower(lead.firstName);
  const lastName = toLower(lead.lastName);
  const jobTitle = toLower(lead.jobTitle);
  const company = safe(lead.company);
  const country = safe(lead.country);
  const ipCountry = safe(lead.ipCountry);

  let localPart = "";
  let domain = "";

  // Email checks (safe parsing)
  if (!email || !email.includes("@")) {
    reasons.push("Missing or invalid email");
  } else {
    const parts = email.split("@");
    localPart = parts[0] || "";
    domain = parts[1] || "";

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

  // Job title checks (only if jobTitle exists)
  if (jobTitle && NON_BUSINESS_TITLES.includes(jobTitle)) {
    reasons.push(`Non-business title: ${jobTitle}`);
  }

  // First/Last/Test checks (only if fields exist)
  if (firstName === "test" || lastName === "test" || email.includes("test")) {
    reasons.push("Test data");
  }

  // Country mismatch (only if both exist)
  if (country && ipCountry && country !== ipCountry) {
    reasons.push("Country does not match IP country");
  }

  // Scoring
  const baseScore = 1;
  const penalty = 0.2 * reasons.length;
  const score = Math.max(0, baseScore - penalty);

  return {
    isJunk: reasons.length > 0,
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
    // Even if body is missing entirely → still safe
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
