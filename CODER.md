## Coder Standards for PR Intelligence

### 1. Third-party API Calls in Separate Files
- All external API integrations (GitHub, OpenAI, etc.) must be in `lib/{service}.ts`
- Example: `lib/github.ts` for all Octokit calls
- Do not inline API calls in route handlers or components

### 2. Type Safety - Avoid `any` and Inline Types
- Define all custom types in `types/*.ts` (e.g., `types/github.ts`)
- **Never use inline type definitions** in function parameters or JSX
- Bad: `(label: { name: string; color: string })`
- Good: Extract to `types/github.ts` as `interface PRLabel { ... }` and import it
- This includes function parameters, JSX props, and variable declarations

### 3. Constants - Numeric and String Values
- Define all numeric constants in `lib/constants.ts`
- Separate concerns by domain:
  - `lib/constants.ts` - Generic HTTP statuses, common error messages
  - `lib/{service}-constants.ts` - Service-specific constants (e.g., `lib/github-constants.ts`)
- Always import and use constants instead of hardcoding
- Example error messages:
  - Generic: `"Internal server error. Please try again later."`
  - GitHub-specific: `"GitHub rate limit exceeded or invalid token."`

### 4. Error Messages Organization
- Generic errors in `lib/constants.ts` under `ERROR_MESSAGES`
- Service-specific errors in `lib/{service}-constants.ts` under `{SERVICE}_ERROR_MESSAGES`
- Example:
  ```typescript
  // lib/constants.ts
  export const ERROR_MESSAGES = {
    INTERNAL_ERROR: "Internal server error. Please try again later.",
    POST_EXPECTED: "POST endpoint expected for PR analysis",
  };

  // lib/github-constants.ts
  export const GITHUB_ERROR_MESSAGES = {
    PR_NOT_FOUND: "PR not found. Please verify the PR number is correct.",
    RATE_LIMIT: "GitHub rate limit exceeded or invalid token. Check your GITHUB_TOKEN.",
  };
  ```

### 5. Helper Functions for Repeated Calls
- Centralize repeated response patterns in `lib/response.ts`
- Create a helper function instead of duplicating `NextResponse.json()` calls
- Examples: `successResponse()`, `errorResponse()`, `badRequestResponse()`, etc.

### 6. Precompute Values Before Data Object Construction
- **Never call `.map()`, `.filter()`, or other transformations inside data object construction**
- Always precompute values as variables first, then reference them
- Bad:
  ```typescript
  return {
    labels: (data ?? []).map(label => ({ name: label.name })),
  };
  ```
- Good:
  ```typescript
  const labels = (data ?? []).map(label => ({ name: label.name }));
  return { labels };
  ```
- This improves readability, debuggability, and makes precomputed values explicit

### 7. Console Error Logging
- **Always `console.error()` any caught error object**
- Never leave errors unused or swallowed silently
- Include context in the log message
- Example: `console.error("Failed to fetch PR data:", error);`

### 8. File Size Limits
- Keep each file under 100 lines if possible
- If a file exceeds 100 lines, split it into smaller, focused modules
- Example split: `components/Header.tsx`, `components/Footer.tsx`, `components/PRForm.tsx`

### 9. No Nested Try-Catch Blocks
- Flatten error handling using early returns and conditional branching
- Create wrapper functions to handle and transform errors
- Bad:
  ```typescript
  try {
    try {
      const data = await fetch();
    } catch (error) { ... }
  } catch (error) { ... }
  ```
- Good:
  ```typescript
  try {
    body = await request.json();
  } catch (error) {
    return errorResponse(error);
  }
  
  const result = await wrappedFunction(); // wrappedFunction handles errors internally
  if ("error" in result) { ... }
  ```

### 10. Export Types Alongside Interfaces
- Export types used by external files from `types/*.ts`
- Keep types co-located with their domain
- Example: `types/github.ts` exports `PRMetadata`, `ChangedFile`, `PRLabel`, `PRAnalysisResponse`
