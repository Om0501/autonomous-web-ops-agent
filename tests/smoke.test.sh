#!/usr/bin/env bash
# End-to-end smoke test: creates a task, runs the full pipeline twice, and
# asserts a material change is detected between the two runs.
set -e
BASE="http://localhost:${PORT:-4000}"

TASK=$(curl -s -X POST "$BASE/api/tasks" -H 'Content-Type: application/json' \
  -d '{"workflow":"pricing","destination":"Goa","frequency":"Daily","routing":"Dashboard + summary"}')
TASK_ID=$(echo "$TASK" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "Created task $TASK_ID"

run_once () {
  JOB=$(curl -s -X POST "$BASE/api/plans" -H 'Content-Type: application/json' -d "{\"taskId\":\"$TASK_ID\"}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['jobId'])")
  curl -s -X POST "$BASE/api/runs" -H 'Content-Type: application/json' -d "{\"jobId\":\"$JOB\"}" > /dev/null
  curl -s -X POST "$BASE/api/extract" -H 'Content-Type: application/json' -d "{\"jobId\":\"$JOB\"}" > /dev/null
  curl -s -X POST "$BASE/api/compare" -H 'Content-Type: application/json' -d "{\"jobId\":\"$JOB\"}" > /dev/null
  curl -s -X POST "$BASE/api/complete" -H 'Content-Type: application/json' -d "{\"jobId\":\"$JOB\"}"
}

run_once > /dev/null
RESULT2=$(run_once)
echo "$RESULT2" | python3 -m json.tool

MATERIAL=$(echo "$RESULT2" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['summary']['material']))")
if [ "$MATERIAL" -lt 1 ]; then
  echo "FAIL: expected at least 1 material change on the second run"
  exit 1
fi
echo "PASS: $MATERIAL material change(s) detected on second run"
