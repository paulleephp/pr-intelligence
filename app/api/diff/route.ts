import { NextResponse } from "next/server";
import { getFullPRAnalysis } from "@/lib/server/github/pr-metadata/get";
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
    // Fetch full PR analysis (metadata + changed files + analysis)
    const { prMetadata, changedFiles, analysis } = await getFullPRAnalysis(
      parsed.owner,
      parsed.repo,
      parsed.prNumber,
    );

    if (!prMetadata || !changedFiles) {
      return errorResponse("Failed to analyze PR", 500);
    }

    const resultAnalysis = analysis;

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
