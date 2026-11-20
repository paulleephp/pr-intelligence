import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";
import type {} from "@/types/github/octokit";
import type { ChangedFile, PRLabel, PRMetadata } from "@/types/pr/metadata";
import { GITHUB_API_VERSION } from "./constants";

const githubClient = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  headers: { "X-GitHub-Api-Version": GITHUB_API_VERSION },
});

export async function fetchPRMetadata(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRMetadata> {
  const response: RestEndpointMethodTypes["pulls"]["get"]["response"] =
    await githubClient.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

  const prData = response.data;
  const rawLabels = prData.labels ?? [];
  const transformedLabels: PRLabel[] = rawLabels.map((label: PRLabel) => ({
    name: label.name,
    color: label.color,
  }));

  return {
    number: prData.number,
    title: prData.title,
    state: prData.state as "open" | "closed",
    user: {
      login: prData.user.login,
      avatar_url: prData.user.avatar_url,
      html_url: prData.user.html_url,
    },
    createdAt: prData.created_at,
    updatedAt: prData.updated_at,
    mergeable: prData.mergeable ?? null,
    labels: transformedLabels,
    head: { repo: { url: prData.head.repo?.url ?? "" } },
    base: { repo: { url: prData.base.repo.url }, ref: prData.base.ref },
    html_url: prData.html_url,
  };
}

export async function fetchChangedFiles(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<ChangedFile[]> {
  const filesResponse: RestEndpointMethodTypes["pulls"]["listFiles"]["response"] = await githubClient.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });

  const transformedFiles: ChangedFile[] = filesResponse.data.map((file) => ({
    filename: file.filename,
    status: file.status as ChangedFile["status"],
    additions: file.additions ?? 0,
    deletions: file.deletions ?? 0,
    patch: file.patch ?? "",
  }));

  return transformedFiles;
}
