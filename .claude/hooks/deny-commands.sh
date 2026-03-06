#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

REASON=""

# 1. Package managers — apt / apt-get
if echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?(apt|apt-get)(\s|$)'; then
  REASON="apt/apt-get package manager command"
fi

# 2. Dangerous rm — catch rm with -r and -f flags (in any order/combo) targeting / or ~
#    Matches: rm -rf /, rm -r -f /, rm -fR /home, rm --recursive -f /*, rm -rf ~, etc.
if echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+)*-[a-zA-Z]*f[a-zA-Z]*\s+(/|~|/\*)' || \
   echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)*-[a-zA-Z]*r[a-zA-Z]*\s+(/|~|/\*)' || \
   echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+-[a-zA-Z]*(rf|fr|rF|fR|FR|RF)[a-zA-Z]*\s+(/|~|/\*)'; then
  REASON="dangerous rm targeting / or ~"
fi

# 3. Subshell / wrapper bypass — catch sudo bash -c, sudo sh -c, bash -c, eval, etc. containing rm or apt
if echo "$COMMAND" | grep -qE '(sudo\s+)?(bash|sh|zsh)\s+-c\s+.*\brm\b' || \
   echo "$COMMAND" | grep -qE '(sudo\s+)?(bash|sh|zsh)\s+-c\s+.*(apt|apt-get)\b' || \
   echo "$COMMAND" | grep -qE '\beval\s+.*\brm\b' || \
   echo "$COMMAND" | grep -qE '\beval\s+.*(apt|apt-get)\b'; then
  REASON="potentially dangerous command inside subshell/eval"
fi

if [ -n "$REASON" ]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": "Flagged: $REASON. Requires your explicit approval."
  }
}
EOF
  exit 0
fi

exit 0
