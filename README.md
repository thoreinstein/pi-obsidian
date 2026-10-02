# pi-obsidian

Pi extension packaging for the [obsidian-mcp](https://github.com/thoreinstein/obsidian-mcp) server: skills, vault agents, and session hooks. The MCP server is installed separately and shared by any MCP client.

## What it ships

- **13 skills** — index, search, journal, links, link-audit, cross-linker, moc-update, vault-lint, wiki-ingest, compound, research, vault, obsidian-companion
- **2 agents** (pi-subagents): `librarian` (vault organization) and `vault-researcher` (deep RAG research)
- **Extension hooks** — session-start incremental reindex, post-mutation reindex of the touched note, frontmatter validation before `obsidian_create_note`

## Prerequisites

1. The obsidian-mcp server, cloned and built:

```sh
git clone https://github.com/thoreinstein/obsidian-mcp
cd obsidian-mcp && npm install && npm run build
```

2. Register it as an MCP server in `~/.pi/agent/mcp.json`:

```json
{
  "mcpServers": {
    "obsidian-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/obsidian-mcp/dist/index.js"]
    }
  }
}
```

3. Set `OBSIDIAN_MCP_ROOT` to the server checkout (default: `~/src/thoreinstein/obsidian-mcp`) so the hooks can call its CLI.

## Install

```sh
pi install git:github.com/thoreinstein/pi-obsidian
```

## Vault setup

First use: ask pi to set your vault (`obsidian_set_vault` tool or the `vault` skill). The path is persisted to `~/.config/obsidian-mcp/config.json`.
