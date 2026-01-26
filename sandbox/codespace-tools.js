/**
 * Codespace Tools - HTTP API client for testing.spike.land
 *
 * This module provides tools for reading and modifying code in a codespace.
 * It runs inside the Vercel Sandbox and communicates with testing.spike.land via HTTPS.
 */

const https = require("https");

const TESTING_SPIKE_LAND = "https://testing.spike.land";

/**
 * Make an HTTPS request and return a promise
 */
function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Create codespace tools for a specific codespace ID
 */
function createCodespaceTools(codespaceId) {
  return {
    /**
     * Read the current code from the codespace
     */
    async read_code() {
      console.log(`[codespace-tools] read_code for ${codespaceId}`);
      try {
        const { statusCode, data } = await httpsRequest({
          hostname: "testing.spike.land",
          port: 443,
          path: `/live/${codespaceId}/session.json`,
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (statusCode !== 200) {
          return `Error: HTTP ${statusCode}`;
        }

        const json = JSON.parse(data);
        return json.code || "";
      } catch (error) {
        return `Network error: ${error.message}`;
      }
    },

    /**
     * Update the entire code content
     */
    async update_code(code) {
      console.log(
        `[codespace-tools] update_code for ${codespaceId}, length: ${code.length}`,
      );
      try {
        const postData = JSON.stringify({ code, run: true });
        const { statusCode, data } = await httpsRequest(
          {
            hostname: "testing.spike.land",
            port: 443,
            path: `/live/${codespaceId}/api/code`,
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(postData),
            },
          },
          postData,
        );

        if (statusCode !== 200) {
          return `Error: HTTP ${statusCode}`;
        }

        const json = JSON.parse(data);
        if (json.success) {
          return "success";
        }

        // Handle validation errors
        if (json.errors && json.errors.length > 0) {
          const formatted = json.errors
            .map((e) => {
              const location = e.line
                ? `Line ${e.line}${e.column ? `:${e.column}` : ""}: `
                : "";
              return `${location}${e.message}`;
            })
            .join("\n");
          return `TypeScript/JSX errors:\n${formatted}`;
        }

        return json.error || "Update failed";
      } catch (error) {
        return `Network error: ${error.message}`;
      }
    },

    /**
     * Search and replace text in the code
     */
    async search_and_replace(search, replace, isRegex = false) {
      console.log(
        `[codespace-tools] search_and_replace for ${codespaceId}, search: "${
          search.substring(0, 50)
        }"`,
      );

      const currentCode = await this.read_code();
      if (
        currentCode.startsWith("Error") ||
        currentCode.startsWith("Network error")
      ) {
        return currentCode;
      }

      let newCode;
      if (isRegex) {
        const regex = new RegExp(search, "g");
        newCode = currentCode.replace(regex, replace);
      } else {
        newCode = currentCode.split(search).join(replace);
      }

      if (newCode === currentCode) {
        return "No matches found for the search pattern";
      }

      return this.update_code(newCode);
    },

    /**
     * Find lines matching a pattern
     */
    async find_lines(search) {
      console.log(
        `[codespace-tools] find_lines for ${codespaceId}, search: "${search}"`,
      );

      const currentCode = await this.read_code();
      if (
        currentCode.startsWith("Error") ||
        currentCode.startsWith("Network error")
      ) {
        return currentCode;
      }

      const lines = currentCode.split("\n");
      const matches = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i] && lines[i].includes(search)) {
          matches.push({ line: i + 1, content: lines[i] });
        }
      }

      if (matches.length === 0) {
        return "No matches found";
      }

      return matches.map((m) => `Line ${m.line}: ${m.content}`).join("\n");
    },

    /**
     * Validate code without updating
     */
    async validate_code(code) {
      console.log(
        `[codespace-tools] validate_code for ${codespaceId}, length: ${code.length}`,
      );
      try {
        const postData = JSON.stringify({ code });
        const { statusCode, data } = await httpsRequest(
          {
            hostname: "testing.spike.land",
            port: 443,
            path: `/live/${codespaceId}/api/validate`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(postData),
            },
          },
          postData,
        );

        if (statusCode !== 200) {
          return `Error: HTTP ${statusCode}`;
        }

        const json = JSON.parse(data);
        if (json.valid) {
          return "valid";
        }

        if (json.errors && json.errors.length > 0) {
          const formatted = json.errors
            .map((e) => {
              const location = e.line
                ? `Line ${e.line}${e.column ? `:${e.column}` : ""}: `
                : "";
              return `${location}${e.message}`;
            })
            .join("\n");
          return `TypeScript/JSX errors:\n${formatted}`;
        }

        return "Validation failed";
      } catch (error) {
        return `Network error: ${error.message}`;
      }
    },
  };
}

module.exports = { createCodespaceTools };
