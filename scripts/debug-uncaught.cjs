// Debug helper: captures full stack traces for uncaught exceptions
// Node.js 24's "ignore-listed frames" hides webpack/node_modules frames
// This handler runs before that filter and prints the raw error
process.on("uncaughtException", (err) => {
  console.error("=== UNCAUGHT EXCEPTION (FULL TRACE) ===");
  console.error("Message:", err.message);
  console.error("Name:", err.name);
  console.error("Stack:", err.stack);
  console.error("=== END TRACE ===");
  process.exit(1);
});
