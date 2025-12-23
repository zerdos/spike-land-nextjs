import { describe, expect, it } from "vitest";
import { tryCatch, tryCatchSync } from "./try-catch";

describe("try-catch", () => {
  describe("tryCatch (async)", () => {
    it("should return data on success", async () => {
      const promise = Promise.resolve("success");

      const result = await tryCatch(promise);

      expect(result.data).toBe("success");
      expect(result.error).toBeNull();
    });

    it("should return error on failure", async () => {
      const error = new Error("test error");
      const promise = Promise.reject(error);

      const result = await tryCatch(promise);

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });

    it("should handle non-Error throws", async () => {
      const promise = Promise.reject("string error");

      const result = await tryCatch(promise);

      expect(result.data).toBeNull();
      expect(result.error).toBe("string error");
    });

    it("should handle complex objects", async () => {
      const data = { foo: "bar", nested: { value: 123 } };
      const promise = Promise.resolve(data);

      const result = await tryCatch(promise);

      expect(result.data).toEqual(data);
      expect(result.error).toBeNull();
    });

    it("should handle null values", async () => {
      const promise = Promise.resolve(null);

      const result = await tryCatch(promise);

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it("should handle undefined values", async () => {
      const promise = Promise.resolve(undefined);

      const result = await tryCatch(promise);

      expect(result.data).toBeUndefined();
      expect(result.error).toBeNull();
    });
  });

  describe("tryCatchSync (sync)", () => {
    it("should return data on success", () => {
      const fn = () => "success";

      const result = tryCatchSync(fn);

      expect(result.data).toBe("success");
      expect(result.error).toBeNull();
    });

    it("should return error on failure", () => {
      const error = new Error("test error");
      const fn = () => {
        throw error;
      };

      const result = tryCatchSync(fn);

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });

    it("should handle non-Error throws", () => {
      const fn = () => {
        throw "string error";
      };

      const result = tryCatchSync(fn);

      expect(result.data).toBeNull();
      expect(result.error).toBe("string error");
    });

    it("should handle complex objects", () => {
      const data = { foo: "bar", nested: { value: 123 } };
      const fn = () => data;

      const result = tryCatchSync(fn);

      expect(result.data).toEqual(data);
      expect(result.error).toBeNull();
    });

    it("should handle null return values", () => {
      const fn = () => null;

      const result = tryCatchSync(fn);

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it("should handle undefined return values", () => {
      const fn = () => undefined;

      const result = tryCatchSync(fn);

      expect(result.data).toBeUndefined();
      expect(result.error).toBeNull();
    });
  });

  describe("type safety", () => {
    it("should preserve type information for data", async () => {
      interface User {
        id: number;
        name: string;
      }

      const user: User = { id: 1, name: "Test" };
      const result = await tryCatch<User>(Promise.resolve(user));

      if (result.data) {
        expect(result.data.id).toBe(1);
        expect(result.data.name).toBe("Test");
      }
    });

    it("should allow custom error types", async () => {
      class CustomError extends Error {
        code: string;
        constructor(message: string, code: string) {
          super(message);
          this.code = code;
        }
      }

      const error = new CustomError("test", "ERR_001");
      const result = await tryCatch<string, CustomError>(Promise.reject(error));

      if (result.error) {
        expect(result.error.code).toBe("ERR_001");
      }
    });
  });
});
