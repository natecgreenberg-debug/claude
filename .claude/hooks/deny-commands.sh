#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

DENY_REASON=""
ASK_REASON=""

# 1. Package managers — apt / apt-get (mutating commands only)
if echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?(apt|apt-get)\s+(install|remove|purge|upgrade|update|autoremove|full-upgrade|dist-upgrade)(\s|$)'; then
  ASK_REASON="apt/apt-get mutating command"
fi

# 2. Dangerous rm — catch rm with -r and -f flags (in any order/combo) targeting /, ~, /*, ., or ..
#    Target must be a standalone token (followed by whitespace, separator, or end of string)
if echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+)*-[a-zA-Z]*f[a-zA-Z]*\s+(/\*|/|~/?|\.\.|\.)([\s;|&]|$)' || \
   echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)*-[a-zA-Z]*r[a-zA-Z]*\s+(/\*|/|~/?|\.\.|\.)([\s;|&]|$)' || \
   echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+-[a-zA-Z]*(rf|fr|rF|fR|FR|RF)[a-zA-Z]*\s+(/\*|/|~/?|\.\.|\.)([\s;|&]|$)'; then
  DENY_REASON="dangerous rm targeting /, ~, ., or .."
fi

# 3. Subshell / wrapper bypass — catch sudo bash -c, sudo sh -c, bash -c, eval, etc. containing rm or apt
if echo "$COMMAND" | grep -qE '(sudo\s+)?(bash|sh|zsh)\s+-c\s+.*\brm\b' || \
   echo "$COMMAND" | grep -qE '(sudo\s+)?(bash|sh|zsh)\s+-c\s+.*(apt|apt-get)\b' || \
   echo "$COMMAND" | grep -qE '\beval\s+.*\brm\b' || \
   echo "$COMMAND" | grep -qE '\beval\s+.*(apt|apt-get)\b'; then
  ASK_REASON="potentially dangerous command inside subshell/eval"
fi

# 4. Command substitution — catch $(...) and backticks containing rm or apt
if echo "$COMMAND" | grep -qE '\$\(.*\brm\b' || \
   echo "$COMMAND" | grep -qE '\$\(.*(apt|apt-get)\b' || \
   echo "$COMMAND" | grep -qE '`.*\brm\b' || \
   echo "$COMMAND" | grep -qE '`.*(apt|apt-get)\b'; then
  ASK_REASON="potentially dangerous command inside command substitution"
fi

# 5. rm with long flags — catch --recursive + --force targeting dangerous paths
if echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+.*--recursive\s+.*--force\s+(/\*|/|~/?|\.\.|\.)([\s;|&]|$)' || \
   echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+.*--force\s+.*--recursive\s+(/\*|/|~/?|\.\.|\.)([\s;|&]|$)'; then
  ASK_REASON="rm with long flags targeting dangerous path"
fi

# DENY takes priority over ASK
if [ -n "$DENY_REASON" ]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "BLOCKED: $DENY_REASON. This command is never allowed."
  }
}
EOF
  exit 0
fi

if [ -n "$ASK_REASON" ]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": "Review required: $ASK_REASON. Please approve or deny."
  }
}
EOF
  exit 0
fi

exit 0
