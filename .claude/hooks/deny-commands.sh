#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

if echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)(apt|apt-get)(\s|$)' || \
   echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)rm\s+-rf\s+(/|~)'; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": "This command (apt/apt-get/rm -rf) requires your explicit approval."
  }
}
EOF
  exit 0
fi

exit 0
