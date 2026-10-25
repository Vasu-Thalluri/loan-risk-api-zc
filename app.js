
const express = require("express");
const { randomUUID } = require("crypto");
require('dotenv').config();

const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "loan-risk-api" });
});

// Protect the risk endpoint with an API key
app.post("/api/v1/risk-assessment", (req, res) => {
  if (!API_KEY || req.get("x-api-key") !== API_KEY) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  const {
    application_reference,
    loan_amount,
    tenure_months,
    annual_interest_rate,
    monthly_salary,
    existing_monthly_emi
  } = req.body;

  const values = [
    loan_amount,
    tenure_months,
    annual_interest_rate,
    monthly_salary,
    existing_monthly_emi
  ];

  if (
    !application_reference ||
    !values.every(v => typeof v === "number" && Number.isFinite(v)) ||
    loan_amount <= 0 ||
    tenure_months <= 0 ||
    annual_interest_rate < 0 ||
    monthly_salary <= 0 ||
    existing_monthly_emi < 0
  ) {
    return res.status(400).json({
      error: "Invalid or missing input fields"
    });
  }

  // Illustrative calculation for our training project
  const monthlyRate = annual_interest_rate / 1200;

  const emi = monthlyRate === 0
    ? loan_amount / tenure_months
    : loan_amount *
      monthlyRate *
      Math.pow(1 + monthlyRate, tenure_months) /
      (Math.pow(1 + monthlyRate, tenure_months) - 1);

  const foir =
    ((existing_monthly_emi + emi) / monthly_salary) * 100;

  let riskLevel;
  let riskScore;

  if (foir <= 40) {
    riskLevel = "Low";
    riskScore = 25;
  } else if (foir <= 50) {
    riskLevel = "Medium";
    riskScore = 55;
  } else {
    riskLevel = "High";
    riskScore = 85;
  }

  return res.status(200).json({
    request_id: randomUUID(),
    application_reference,
    risk_score: riskScore,
    risk_level: riskLevel,
    estimated_emi: Number(emi.toFixed(2)),
    foir_percentage: Number(foir.toFixed(2))
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Loan Risk API listening on port ${PORT}`);
});
