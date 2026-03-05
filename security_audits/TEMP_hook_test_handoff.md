# PreToolUse Hook — Test Handoff for Next Session

**Created**: 2026-03-05
**Status**: Implementation complete, needs live testing in a fresh session
**Delete this file**: After all tests pass

---

## What This Project Is

Claude Code has a bug where `deny` rules in `settings.json` don't work (GitHub issues #6699, #6631, #8961). Commands like `apt install` and `rm -rf /` run freely even though they're in the deny list. The only reliable way to enforce restrictions is **PreToolUse hooks** — shell scripts that intercept tool calls before they execute.

We implemented a hook that **prompts Nate for permission** (not hard block) when Claude tries to run `apt`, `apt-get`, or `rm -rf /` / `rm -rf ~/`. Normal commands pass through without any prompt.

## What Was Built

### 1. Hook script: `~/projects/Agent/.claude/hooks/deny-commands.sh`
- Reads tool input JSON from stdin
- Extracts the bash command via `jq`
- Pattern-matches against dangerous commands
- Returns `"permissionDecision": "ask"` if matched (triggers a permission prompt)
- Exits silently if no match (command runs normally)
- Catches chained commands too (`echo test && apt update`)

### 2. Settings: `~/.claude/settings.json`
- Added `hooks.PreToolUse` config that points to the script above
- Existing deny rules kept as fallback (they don't work, but no harm keeping them)

### 3. Memory files updated
- `~/.claude/projects/-root-projects/memory/MEMORY.md`
- `~/.claude/projects/-root-projects/memory/permissions.md`

---

## How to Test (SAFETY-FIRST ORDER)

**THE #1 RULE: Every test command must be HARMLESS even if the hook completely fails and the command runs unprotected.**

### Round 1: Does the hook catch dangerous commands?

These commands are all safe even if they execute without prompting:

1. **`apt list --installed | head -1`**
   - Expected: Should PROMPT for permission
   - Safe because: `apt list` is read-only, just lists packages, changes nothing
   - If hook fails: You see one line of installed packages. No harm.

2. **`rm -rf /tmp/claude_hook_test_nonexistent_dir`**
   - Expected: Should PROMPT for permission
   - Safe because: This path doesn't exist. `rm -rf` on a nonexistent path is a no-op.
   - If hook fails: Nothing happens. The path doesn't exist.

3. **`rm -rf ~/tmp_claude_hook_test_nonexistent_dir`**
   - Expected: Should PROMPT for permission
   - Safe because: This path doesn't exist either. Complete no-op.
   - If hook fails: Nothing happens.

### Round 2: Do normal commands still work WITHOUT prompting?

4. **`echo "hello world"`** → Should NOT prompt, should just run
5. **`git status`** → Should NOT prompt
6. **`ls -la`** → Should NOT prompt
7. **`python3 --version`** → Should NOT prompt

### Round 3: Are chained commands caught?

8. **`echo "safe" && apt list --installed | head -1`**
   - Expected: Should PROMPT (contains `apt`)
   - Safe because: Even if it runs, `echo` + `apt list` are both read-only

9. **`echo "safe" ; apt-get --version`**
   - Expected: Should PROMPT (contains `apt-get`)
   - Safe because: `apt-get --version` just prints version info, changes nothing

### Round 4: Do other tools still work without prompting?

10. **Read tool** (read any file) → Should NOT prompt
11. **Edit tool** (edit any file) → Should NOT prompt
12. **Write tool** (write any file) → Should NOT prompt
13. **Glob tool** (search file names) → Should NOT prompt
14. **Grep tool** (search file contents) → Should NOT prompt
15. **WebSearch** → Should NOT prompt
16. **WebFetch** → Should NOT prompt

---

## What "Pass" Looks Like

- Tests 1, 2, 3, 8, 9: Claude is interrupted and you see a permission prompt asking if you want to allow the command. You can approve or deny — either way, the hook worked.
- Tests 4-7: Commands run immediately with no prompt.
- Tests 10-16: Tools work normally with no prompt.

## What "Fail" Looks Like

- Tests 1, 2, 3, 8, 9: Command runs immediately without any prompt. This means the hook isn't firing. Check:
  - Is `~/.claude/settings.json` correct? (should have `hooks.PreToolUse` section)
  - Is the script executable? (`ls -la ~/projects/Agent/.claude/hooks/deny-commands.sh`)
  - Is `jq` installed? (`which jq`)
  - Was Claude Code restarted after the settings change? (hooks load at startup)

## Files to Reference

| File | What it is |
|------|-----------|
| `~/projects/Agent/.claude/hooks/deny-commands.sh` | The hook script |
| `~/.claude/settings.json` | Global settings with hook config |
| `~/.claude/projects/-root-projects/memory/permissions.md` | Full documentation |

## After All Tests Pass

1. Delete this file: `rm ~/projects/Agent/security_audits/TEMP_hook_test_handoff.md`
2. Commit and push
