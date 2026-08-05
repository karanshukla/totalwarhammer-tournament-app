# validation.hurl
# Exercises the server's input-validation layer end-to-end: every request here
# is authenticated and CSRF-clean, so a 400 can only come from the validation
# middleware itself.
#
# Rate-limit budget (see app.js): /user/register and /user/login share a 20-per-
# 15-min limiter, and /password-reset is capped at 5 per hour. This file stays
# well inside both — 6 auth-endpoint hits and 3 password-reset hits.

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REGISTRATION VALIDATION (public endpoint, no CSRF required)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Username below the 3-character minimum
POST http://{{host}}/user/register
Content-Type: application/json
{
  "username": "ab",
  "email": "hurl-v-short-{{run_id}}@test.local",
  "password": "HurlTest1!"
}
HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.errors[*].field" includes "username"


# Username containing characters outside [a-zA-Z0-9_-]
POST http://{{host}}/user/register
Content-Type: application/json
{
  "username": "bad name!",
  "email": "hurl-v-chars-{{run_id}}@test.local",
  "password": "HurlTest1!"
}
HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.errors[*].field" includes "username"


# Malformed email address
POST http://{{host}}/user/register
Content-Type: application/json
{
  "username": "hurlV_{{run_id}}",
  "email": "not-an-email",
  "password": "HurlTest1!"
}
HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.errors[*].field" includes "email"


# Password below the 8-character minimum
POST http://{{host}}/user/register
Content-Type: application/json
{
  "username": "hurlV_{{run_id}}",
  "email": "hurl-v-pw-{{run_id}}@test.local",
  "password": "short"
}
HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.errors[*].field" includes "password"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SETUP — a real session to exercise the authenticated validators
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST http://{{host}}/user/register
Content-Type: application/json
{
  "username": "hurlV_{{run_id}}",
  "email": "hurl-v-{{run_id}}@test.local",
  "password": "HurlTest1!"
}
HTTP 201


POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "hurlV_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOURNAMENT CREATION VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Name absent
POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "playerCount": 4,
  "tournamentType": "Single Elimination"
}
HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.errors[*].field" includes "name"
jsonpath "$.message" contains "required"


# Name below the 3-character minimum
POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "name": "ab",
  "playerCount": 4,
  "tournamentType": "Single Elimination"
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "name"


# Name that is whitespace only — trimmed, then rejected as empty
POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "name": "     ",
  "playerCount": 4,
  "tournamentType": "Single Elimination"
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "name"


# Player count below the minimum of 2
POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "name": "Too Few Players",
  "playerCount": 1,
  "tournamentType": "Single Elimination"
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "playerCount"


# Player count above the maximum of 128
POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "name": "Too Many Players",
  "playerCount": 129,
  "tournamentType": "Single Elimination"
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "playerCount"


# Tournament type outside the supported set
POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "name": "Unknown Format",
  "playerCount": 4,
  "tournamentType": "Battle Royale"
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "tournamentType"


# Banned factions containing a name that is not in the registry
POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "name": "Fake Faction Ban",
  "playerCount": 4,
  "tournamentType": "Single Elimination",
  "bannedFactions": ["Skaven", "Atlanteans"]
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "bannedFactions"


# Banned factions sent as a bare string instead of an array
POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "name": "Not An Array",
  "playerCount": 4,
  "tournamentType": "Single Elimination",
  "bannedFactions": "Skaven"
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "bannedFactions"


# Description sent as a number rather than a string
POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "name": "Numeric Description",
  "playerCount": 4,
  "tournamentType": "Single Elimination",
  "description": 12345
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "description"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SETUP — a valid tournament to aim the remaining validators at
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "name": "Hurl Validation Tournament",
  "playerCount": 4,
  "tournamentType": "Single Elimination",
  "bannedFactions": ["Skaven"]
}
HTTP 201
[Captures]
tournament_id: jsonpath "$.data._id"
tournament_code: jsonpath "$.data.code"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ROUTE PARAMETER VALIDATION — malformed IDs are 400, not 500
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET http://{{host}}/tournament/not-an-object-id
HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.errors[*].field" includes "id"


GET http://{{host}}/match/not-an-object-id
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "id"


GET http://{{host}}/match/tournament/not-an-object-id
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "tournamentId"


DELETE http://{{host}}/tournament/not-an-object-id
X-CSRF-Token: {{csrf_token}}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "id"


POST http://{{host}}/tournament/not-an-object-id/start
X-CSRF-Token: {{csrf_token}}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "id"


POST http://{{host}}/tournament/not-an-object-id/advance
X-CSRF-Token: {{csrf_token}}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "id"


# A well-formed but non-existent participant ID still reaches the controller (404);
# a malformed one is stopped at the validation layer (400).
DELETE http://{{host}}/tournament/{{tournament_id}}/participants/nope
X-CSRF-Token: {{csrf_token}}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "participantId"


# Tournament codes are short alphanumerics — punctuation never reaches the query
GET http://{{host}}/tournament/code/AB-12
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "code"


# Sanity: the real code still resolves
GET http://{{host}}/tournament/code/{{tournament_code}}
HTTP 200
[Asserts]
jsonpath "$.success" == true


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOURNAMENT LIST QUERY VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET http://{{host}}/tournament?status=active,pending
HTTP 200
[Asserts]
jsonpath "$.success" == true


GET http://{{host}}/tournament?status=deleted
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "status"


# Parameter pollution: hpp (app.js) collapses the repeat to the last value before
# validation sees it, so this is a well-formed single-status request. The
# validator's isString() check is the backstop if that middleware ever moves.
GET http://{{host}}/tournament?status=active&status=pending
HTTP 200
[Asserts]
jsonpath "$.success" == true


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PARTICIPANT VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Name absent
POST http://{{host}}/tournament/{{tournament_id}}/participants
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{ "faction": "Empire" }
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "name"


# Name is whitespace only
POST http://{{host}}/tournament/{{tournament_id}}/participants
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{ "name": "   " }
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "name"


# Name is an object rather than a string
POST http://{{host}}/tournament/{{tournament_id}}/participants
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{ "name": { "first": "Queek" } }
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "name"


# Faction outside the registry
POST http://{{host}}/tournament/{{tournament_id}}/participants
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{ "name": "Queek", "faction": "Atlanteans" }
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "faction"


# Valid participant — name is trimmed, empty faction means "none"
POST http://{{host}}/tournament/{{tournament_id}}/participants
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{ "name": "  Queek Headtaker  ", "faction": "" }
HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.participants[1].name" == "Queek Headtaker"


# ── Join ──────────────────────────────────────────────────────────────────────

POST http://{{host}}/tournament/{{tournament_id}}/join
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{ "faction": "Atlanteans" }
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "faction"


# ── Description ───────────────────────────────────────────────────────────────

PATCH http://{{host}}/tournament/{{tournament_id}}/description
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "description"


PATCH http://{{host}}/tournament/{{tournament_id}}/description
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{ "description": 42 }
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "description"


PATCH http://{{host}}/tournament/{{tournament_id}}/description
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{ "description": "A perfectly ordinary description." }
HTTP 200
[Asserts]
jsonpath "$.success" == true


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MATCH VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Winner ID missing
PATCH http://{{host}}/match/aaaaaaaaaaaaaaaaaaaaaaaa/report
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "winnerId"


# Winner ID is not an ObjectId
PATCH http://{{host}}/match/aaaaaaaaaaaaaaaaaaaaaaaa/result
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{ "winnerId": "whoever-i-say" }
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "winnerId"


# Match status is constrained to the two an admin may set
PATCH http://{{host}}/match/aaaaaaaaaaaaaaaaaaaaaaaa/status
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{ "status": "completed" }
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "status"


# Manual match creation requires a well-formed round, number, and both slots
POST http://{{host}}/match
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "tournamentId": "{{tournament_id}}",
  "round": 0,
  "matchNumber": 1,
  "player1": { "name": "Queek" },
  "player2": { "name": "Grimgor" }
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "round"


POST http://{{host}}/match
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "tournamentId": "{{tournament_id}}",
  "round": 1,
  "matchNumber": 1,
  "player1": { "name": "" },
  "player2": { "name": "Grimgor" }
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "player1.name"


POST http://{{host}}/match
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "tournamentId": "{{tournament_id}}",
  "round": 1,
  "matchNumber": 1,
  "player1": { "name": "Queek", "faction": "Atlanteans" },
  "player2": { "name": "Grimgor" }
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "player1.faction"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ACCOUNT UPDATE VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST http://{{host}}/user/update-username
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{ "username": "no spaces allowed" }
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "username"


POST http://{{host}}/user/update-password
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "currentPassword": "HurlTest1!",
  "newPassword": "short",
  "confirmPassword": "short"
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "newPassword"


# Confirmation must match the new password
POST http://{{host}}/user/update-password
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "currentPassword": "HurlTest1!",
  "newPassword": "BrandNew1!",
  "confirmPassword": "Different1!"
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "confirmPassword"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PASSWORD RESET VALIDATION (limiter allows 5/hour — three cases used)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST http://{{host}}/password-reset/request
Content-Type: application/json
{ "email": "not-an-email" }
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "email"


POST http://{{host}}/password-reset/verify
Content-Type: application/json
{ "token": "tooshort" }
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "token"


POST http://{{host}}/password-reset/reset
Content-Type: application/json
{
  "token": "a-token-long-enough-to-pass-the-length-check",
  "newPassword": "short"
}
HTTP 400
[Asserts]
jsonpath "$.errors[*].field" includes "newPassword"
