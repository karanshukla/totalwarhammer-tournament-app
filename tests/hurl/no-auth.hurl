# no-auth.hurl
# Verifies that every state-changing endpoint rejects unauthenticated requests.
# Run this with a fresh cookie jar (no prior login in this invocation).

# ── Tournament ────────────────────────────────────────────────────────────────

POST http://{{host}}/tournament
Content-Type: application/json
{
  "name": "Unauthorized Tournament",
  "playerCount": 4,
  "tournamentType": "Single Elimination"
}
HTTP 401
[Asserts]
jsonpath "$.success" == false


DELETE http://{{host}}/tournament/aaaaaaaaaaaaaaaaaaaaaaaa
HTTP 401
[Asserts]
jsonpath "$.success" == false


POST http://{{host}}/tournament/aaaaaaaaaaaaaaaaaaaaaaaa/start
HTTP 401
[Asserts]
jsonpath "$.success" == false


POST http://{{host}}/tournament/aaaaaaaaaaaaaaaaaaaaaaaa/participants
Content-Type: application/json
{ "name": "Ghost Player" }
HTTP 401
[Asserts]
jsonpath "$.success" == false


# ── Match ─────────────────────────────────────────────────────────────────────

PATCH http://{{host}}/match/aaaaaaaaaaaaaaaaaaaaaaaa/report
Content-Type: application/json
{ "winnerId": "aaaaaaaaaaaaaaaaaaaaaaaa" }
HTTP 401
[Asserts]
jsonpath "$.success" == false


PATCH http://{{host}}/match/aaaaaaaaaaaaaaaaaaaaaaaa/override
Content-Type: application/json
{ "winnerId": "aaaaaaaaaaaaaaaaaaaaaaaa" }
HTTP 401
[Asserts]
jsonpath "$.success" == false
