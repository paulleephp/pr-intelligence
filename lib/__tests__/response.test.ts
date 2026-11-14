import { describe, it, expect } from "vitest";
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  notFoundResponse,
  methodNotAllowedResponse,
  rateLimitResponse,
  serverErrorResponse,
} from "@/lib/response";
import { HTTP_STATUS } from "@/lib/constants";

describe("Response Helpers", () => {
  describe("successResponse", () => {
    it("should return success response with data", async () => {
      const data = { message: "success", value: 123 };
      const response = successResponse(data);

      expect(response.status).toBe(HTTP_STATUS.OK);
      const body = await response.json();
      expect(body).toEqual(data);
    });

    it("should accept custom status code", async () => {
      const data = { id: 1 };
      const response = successResponse(data, 201);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual(data);
    });

    it("should handle empty object", async () => {
      const response = successResponse({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      const body = await response.json();
      expect(body).toEqual({});
    });

    it("should handle array data", async () => {
      const data = [1, 2, 3];
      const response = successResponse(data);

      const body = await response.json();
      expect(body).toEqual(data);
    });
  });

  describe("errorResponse", () => {
    it("should return error response with message", async () => {
      const response = errorResponse("Something went wrong");

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      const body = await response.json();
      expect(body).toEqual({ error: "Something went wrong" });
    });

    it("should accept custom status code", async () => {
      const response = errorResponse("Bad request", HTTP_STATUS.BAD_REQUEST);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      const body = await response.json();
      expect(body.error).toBe("Bad request");
    });
  });

  describe("badRequestResponse", () => {
    it("should return 400 status", async () => {
      const response = badRequestResponse("Invalid input");

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      const body = await response.json();
      expect(body.error).toBe("Invalid input");
    });
  });

  describe("notFoundResponse", () => {
    it("should return 404 status", async () => {
      const response = notFoundResponse("Not found");

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      const body = await response.json();
      expect(body.error).toBe("Not found");
    });
  });

  describe("methodNotAllowedResponse", () => {
    it("should return 405 status", async () => {
      const response = methodNotAllowedResponse("Method not allowed");

      expect(response.status).toBe(HTTP_STATUS.METHOD_NOT_ALLOWED);
      const body = await response.json();
      expect(body.error).toBe("Method not allowed");
    });
  });

  describe("rateLimitResponse", () => {
    it("should return 429 status", async () => {
      const response = rateLimitResponse("Too many requests");

      expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      const body = await response.json();
      expect(body.error).toBe("Too many requests");
    });
  });

  describe("serverErrorResponse", () => {
    it("should return 500 status", async () => {
      const response = serverErrorResponse("Internal error");

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      const body = await response.json();
      expect(body.error).toBe("Internal error");
    });
  });

  describe("response headers", () => {
    it("should set content-type to application/json", () => {
      const response = successResponse({ test: true });

      expect(response.headers.get("content-type")).toBe("application/json");
    });
  });
});
