import { NextResponse } from "next/server";
import { fetchPRMetadata } from "@/lib/github/client";
import { errorResponse } from "@/lib/response";

interface PRRequest {
  owner: string;
  repo: string;
  prNumber: number;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return errorResponse("Invalid JSON. Required fields: owner, repo, prNumber", 400);
  }

  const parsed = (body as unknown as PRRequest) || {};

  if (!parsed.owner || !parsed.repo || parsed.prNumber === undefined) {
    return errorResponse("PR request missing required fields", 400);
  }

  try {
    // Fetch metadata and diff content
    const [metadata, diffData] = await Promise.all([
      fetchPRMetadata(parsed.owner, parsed.repo, parsed.prNumber),
      _fetchDiff(parsed.owner, parsed.repo, parsed.prNumber),
    ]);

    if (!metadata || !metadata.changedFiles) {
      return errorResponse("Failed to analyze PR", 500);
    }

    const analysis = _analyzeDiff(metadata);

    return NextResponse.json({
      stats: analysis.stats,
      findings: analysis.findings.map((f) => ({
        ruleId: f.ruleId,
        severity: f.severity,
        file: f.file,
        message: f.message,
        evidence: f.evidence,
      })),
      riskScore: analysis.riskScore,
    });
  } catch (error) {
    console.error("Failed to analyze PR diff:", error);
    return errorResponse("Failed to analyze PR", 500);
  }
}

// Extract changed files from GitHub API response
function extractChangedFiles(diffResponse: any): Array<{
  file: string;
  status: "added" | "removed" | "modified" | "renamed";
  additions?: number;
  deletions?: number;
}> {
  const files = [] as Array<{
    file: string;
    status: "added" | "removed" | "modified" | "renamed";
    additions?: number;
    deletions?: number;
  }>;

  // Handle different response formats from GitHub API
  if (Array.isArray(diffResponse)) {
    for (const file of diffResponse) {
      const status = file.status || "modified";
      const additions =
        typeof file.additions_count !== "undefined" ? Number(file.additions_count) : undefined;
      const deletions =
        typeof file.deletions_count !== "undefined" ? Number(file.deletions_count) : undefined;

      files.push({
        file: file.filename || "",
        status,
        additions,
        deletions,
      });
    }
  } else if (diffResponse && Array.isArray(diffResponse.files)) {
    for (const file of diffResponse.files) {
      const status = file.status || "modified";
      const additions =
        typeof file.additions_count !== "undefined" ? Number(file.additions_count) : undefined;
      const deletions =
        typeof file.deletions_count !== "undefined" ? Number(file.deletions_count) : undefined;

      files.push({
        file: file.filename || "",
        status,
        additions,
        deletions,
      });
    }
  }

  return files;
}
