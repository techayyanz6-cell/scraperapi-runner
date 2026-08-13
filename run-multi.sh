#!/bin/bash
# Multi-instance launcher for ScraperAPI Runner
# usage: ./run-multi.sh [minutes|all] [category|pool] [pool] [full_session_percent]

export PATH="/home/shaharyar/.config/nvm/versions/node/v26.7.0/bin:$PATH"

if [ -d "/home/shaharyar/Desktop/site" ]; then
  DIR="/home/shaharyar/Desktop/site"
else
  DIR="/home/shaharyar/Desktop/node"
fi

CONFIG="/home/shaharyar/Desktop/narowalians/config.json"
if [ ! -f "$CONFIG" ]; then
  CONFIG="$DIR/config.json"
fi

MINS="${1:-all}"
ARG2="${2:-adult}"
ARG3="${3:-all}"
ARG4="${4:-50}"

case "$ARG2" in
  all|tier1|ng|usng|top|ngmix|landing|fill|us|de|gb|ca|au|za|eg|fr|it|nl)
    CATEGORY="adult"
    POOL="$ARG2"
    FULL="${3:-50}"
    ;;
  *)
    CATEGORY="$ARG2"
    POOL="$ARG3"
    FULL="$ARG4"
    ;;
esac

echo "Stopping previous instances..."
pkill -f "node .*browser-clicker.js" 2>/dev/null
pkill -f "node .*scraperapi-runner.js" 2>/dev/null
sleep 1

KEYS=$(node -e "
try {
  const c = JSON.parse(require('fs').readFileSync('$CONFIG'));
  console.log((c.keys || []).join(' '));
} catch(e) {
  console.log('f42e399032fcfc7c8c6f77736b571c0e');
}
")

echo "Keys found: $KEYS | mins=$MINS category=$CATEGORY pool=$POOL full_pct=$FULL%"

for KEY in $KEYS; do
  CREDITS=$(curl -s --max-time 10 "https://api.scraperapi.com/account?api_key=$KEY" | node -e "
  let d='';
  process.stdin.on('data', c => d += c).on('end', () => {
    try { console.log(JSON.parse(d).creditsLeft || 0); }
    catch(e) { console.log(-1); }
  });
  ")

  SHORT=$(echo "$KEY" | cut -c1-8)
  echo "Key $SHORT... -> $CREDITS credits"

  if [ "$CREDITS" -gt 100 ] || [ "$CREDITS" -eq -1 ]; then
    setsid nohup node "$DIR/scraperapi-runner.js" "$MINS" "$KEY" "$CATEGORY" "$POOL" "$FULL" > "$DIR/inst_${SHORT}.out" 2>&1 < /dev/null &
    echo "  [RUNNER] Started ScraperAPI Runner for $SHORT (pool=$POOL) -> $DIR/inst_${SHORT}.out"
    sleep 2
  else
    echo "  Skipped key $SHORT... (Insufficient credits)"
  fi
done

echo "=== Launch complete ==="