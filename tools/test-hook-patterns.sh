#!/bin/bash
# Tests deny-commands.sh regex patterns against test strings.
# SAFE: Only uses echo + grep pattern matching. No dangerous commands are executed.

PASS=0
FAIL=0

check() {
  local CMD="$1"
  local EXPECT_CAUGHT="$2"
  local LABEL="$3"
  local CAUGHT="no"

  # Rule 1: apt/apt-get (mutating only)
  if echo "$CMD" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?(apt|apt-get)\s+(install|remove|purge|upgrade|update|autoremove|full-upgrade|dist-upgrade)(\s|$)'; then
    CAUGHT="yes-apt(ask)"
  fi

  # Rule 2: dangerous rm — short flags targeting /, ~, /*, ., ..  (DENY)
  if echo "$CMD" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+)*-[a-zA-Z]*f[a-zA-Z]*\s+(/\*|/|~/?|\.\.|\.)([\s;|&]|$)' || \
     echo "$CMD" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)*-[a-zA-Z]*r[a-zA-Z]*\s+(/\*|/|~/?|\.\.|\.)([\s;|&]|$)' || \
     echo "$CMD" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+-[a-zA-Z]*(rf|fr|rF|fR|FR|RF)[a-zA-Z]*\s+(/\*|/|~/?|\.\.|\.)([\s;|&]|$)'; then
    CAUGHT="yes-rm(deny)"
  fi

  # Rule 3: subshell/eval (ask)
  if echo "$CMD" | grep -qE '(sudo\s+)?(bash|sh|zsh)\s+-c\s+.*\brm\b' || \
     echo "$CMD" | grep -qE '(sudo\s+)?(bash|sh|zsh)\s+-c\s+.*(apt|apt-get)\b' || \
     echo "$CMD" | grep -qE '\beval\s+.*\brm\b' || \
     echo "$CMD" | grep -qE '\beval\s+.*(apt|apt-get)\b'; then
    CAUGHT="yes-sub(ask)"
  fi

  # Rule 4: command substitution (ask)
  if echo "$CMD" | grep -qE '\$\(.*\brm\b' || \
     echo "$CMD" | grep -qE '\$\(.*(apt|apt-get)\b' || \
     echo "$CMD" | grep -qE '`.*\brm\b' || \
     echo "$CMD" | grep -qE '`.*(apt|apt-get)\b'; then
    CAUGHT="yes-cmdsub(ask)"
  fi

  # Rule 5: rm with long flags (ask)
  if echo "$CMD" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+.*--recursive\s+.*--force\s+(/\*|/|~/?|\.\.|\.)([\s;|&]|$)' || \
     echo "$CMD" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+.*--force\s+.*--recursive\s+(/\*|/|~/?|\.\.|\.)([\s;|&]|$)'; then
    CAUGHT="yes-longflags(ask)"
  fi

  if [ "$CAUGHT" = "no" ] && [ "$EXPECT_CAUGHT" = "no" ]; then
    printf "  PASS  %-50s  (allowed, as expected)\n" "$LABEL"
    ((PASS++))
  elif [ "$CAUGHT" != "no" ] && [ "$EXPECT_CAUGHT" != "no" ]; then
    printf "  PASS  %-50s  (caught: %s)\n" "$LABEL" "$CAUGHT"
    ((PASS++))
  elif [ "$CAUGHT" = "no" ] && [ "$EXPECT_CAUGHT" != "no" ]; then
    printf "  FAIL  %-50s  (NOT caught, expected: %s)\n" "$LABEL" "$EXPECT_CAUGHT"
    ((FAIL++))
  else
    printf "  FAIL  %-50s  (caught: %s, but should be allowed)\n" "$LABEL" "$CAUGHT"
    ((FAIL++))
  fi
}

echo "=== HOOK PATTERN TESTS ==="
# Load test cases from the data file (one per line: EXPECT|LABEL|COMMAND)
while IFS='|' read -r EXPECT LABEL CMD; do
  [ -z "$CMD" ] && continue
  [[ "$EXPECT" == \#* ]] && continue
  check "$CMD" "$EXPECT" "$LABEL"
done < "$(dirname "$0")/test-hook-cases.txt"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
