// @ts-nocheck -- Pi provides this API only when loading extensions.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const REINDEX_TOOLS = new Set([
  "obsidian_create_note",
  "obsidian_append_note",
  "obsidian_update_frontmatter",
  "obsidian_append_daily_log",
  "obsidian_replace_section",
  "obsidian_insert_at_heading",
  "obsidian_replace_in_note",
  "obsidian_move_note",
]);

function serverRoot(): string {
  return (
    process.env.OBSIDIAN_MCP_ROOT ||
    join(homedir(), "src/thoreinstein/obsidian-mcp")
  );
}

function serverBin(): string {
  return join(serverRoot(), "dist/index.js");
}

/** Run a one-shot tool against the obsidian-mcp server CLI. */
async function mcp(tool: string, args: string[] = []): Promise<string | null> {
  try {
    const { stdout, stderr } = await run("node", [serverBin(), tool, ...args], {
      timeout: 120_000,
    });
    return stdout || stderr || null;
  } catch (e: any) {
    // Exit 0 with no output is the server's silent no-op — not an error.
    const out = (e.stdout || "") + (e.stderr || "");
    if (out.includes("Blocked:")) return out;
    return null;
  }
}

function formatHookLine(out: string | null): string | undefined {
  if (!out) return undefined;
  const line = out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("[obsidian-mcp]") || l.includes("chunks"))
    .pop();
  return line || undefined;
}

export default function (pi: ExtensionAPI) {
  // SessionStart: report vault status, run incremental reindex for
  // edits made outside MCP tools.
  pi.on("session_start", (_event, ctx) => {
    void mcp("obsidian_rag_index").then((out) => {
      const line = formatHookLine(out);
      if (line && ctx.hasUI) ctx.ui.notify(line, "info");
    });
  });

  // PreToolUse: validate frontmatter against the vault schema before
  // creating a note. Blocking result: { block: true, reason }.
  pi.on("tool_call", async (event) => {
    if (event.toolName !== "obsidian_create_note") return;
    const reason = await mcp("validate_frontmatter");
    if (reason && reason.includes("Blocked:")) {
      return { block: true, reason: reason.trim() };
    }
  });

  // PostToolUse: re-index the note that was just modified.
  pi.on("tool_result", async (event, ctx) => {
    if (!REINDEX_TOOLS.has(event.toolName)) return;
    const input = event.input ?? {};
    if (!input.file_path) return;
    const out = await mcp("obsidian_rag_index", [
      "--hook",
      JSON.stringify({
        tool_input: {
          file_path: input.file_path,
          vault_path: input.vault_path,
        },
      }),
    ]);
    const line = formatHookLine(out);
    if (line && ctx.hasUI) {
      ctx.ui.notify(line, "info");
    }
  });
}
