const { z } = require("zod");
try {
  const schema = z.object({ foo: z.string() });
  console.log("z.object(1 arg) works");
} catch (e) {
  console.log("z.object(1 arg) failed: " + e.message);
}
console.log("z.object length: " + z.object.length);
