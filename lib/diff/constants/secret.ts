import type { SecretScan } from "@/types/diff/secret";

export const SECRET_SCAN_RULES: SecretScan[] = [
  {
    name: "GITHUB_TOKEN",
    regex: /\b(github_token|github\.token)\s*[:=]/i,
  },
  {
    name: "AWS_SECRET",
    regex: /\b(aws_secret|aws\.secret)\s*[:=]/i,
  },
  {
    name: "AWS_ACCESS_KEY",
    regex: /\b(aws_access_key|aws\.access\.key)\s*[:=]/i,
  },
  {
    name: "ENCRYPTION_KEY",
    regex: /\b(encryption_key|encryption\.key)\s*[:=]/i,
  },
  {
    name: "OAUTH_TOKEN",
    regex: /\b(oauth_token|oauth\.token)\s*[:=]/i,
  },
  {
    name: "STRIPE_SECRET",
    regex: /\b(stripe_secret|stripe\.secret)\s*[:=]/i,
  },
  {
    name: "SLACK_TOKEN",
    regex: /\b(slack_token|slack\.token)\s*[:=]/i,
  },
  {
    name: "JWT_SECRET",
    regex: /\b(jwt_secret|jwt\.secret)\s*[:=]/i,
  },
];
