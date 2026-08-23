# tournament-lifecycle.hurl
# The happy path the other suites never exercise: a tournament driven from
# creation to completion through the real HTTP surface, against real MongoDB.
#
# Everything else in tests/hurl asserts what the API *rejects*. Unit tests cover
# the bracket logic, but they mock mongoose — so nothing until now proved that
# creating, seeding, reporting and advancing actually work end to end.
#
# Flow:
#   1. userA registers, logs in, creates a 2-slot Single Elimination tournament
#      (the creator is auto-enrolled as participant #1)
#   2. userB registers, logs in, joins — the roster is now full
#   3. userA starts it; the server seeds a one-match bracket
#   4. Both players report the same winner → consensus completes the match
#   5. userA advances the round → no opponents left, so the tournament completes
#   6. The completed result is visible to an anonymous caller and in userA's stats
#
# Every login regenerates the session ID (Passport guards against session
# fixation), which invalidates the CSRF token — hence the re-fetch after each.

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SETUP — userA creates the tournament
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


POST http://{{host}}/user/register
Content-Type: application/json
{
  "username": "lifeA_{{run_id}}",
  "email": "life-a-{{run_id}}@test.local",
  "password": "HurlTest1!"
}
HTTP 201


POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "lifeA_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


# Two slots keeps the bracket to a single match, so the whole lifecycle fits in
# one round without making the test a bracket-shape assertion in disguise.
POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "name": "Hurl Lifecycle Tournament",
  "playerCount": 2,
  "tournamentType": "Single Elimination"
}
HTTP 201
[Captures]
tournament_id: jsonpath "$.data._id"
tournament_code: jsonpath "$.data.code"
[Asserts]
jsonpath "$.data.status" == "pending"
# The creator is enrolled automatically — the roster is half full already.
jsonpath "$.data.participants" count == 1
jsonpath "$.data.participants[0].name" == "lifeA_{{run_id}}"


# The join code is what a second player is given, so prove it resolves.
GET http://{{host}}/tournament/code/{{tournament_code}}
HTTP 200
[Asserts]
jsonpath "$.data._id" == "{{tournament_id}}"
jsonpath "$.data.status" == "pending"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# userB joins — the session switches with the login
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST http://{{host}}/user/register
Content-Type: application/json
{
  "username": "lifeB_{{run_id}}",
  "email": "life-b-{{run_id}}@test.local",
  "password": "HurlTest1!"
}
HTTP 201


POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "lifeB_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


POST http://{{host}}/tournament/{{tournament_id}}/join
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{}
HTTP 200
[Asserts]
jsonpath "$.data.participants" count == 2


# A full roster must not accept a third player.
POST http://{{host}}/tournament/{{tournament_id}}/join
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{}
HTTP 400
[Asserts]
jsonpath "$.success" == false


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# userA seeds the bracket
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "lifeA_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


# Seeding order is not part of the contract, so capture whichever participant
# landed in each slot rather than assuming userA is player1.
POST http://{{host}}/tournament/{{tournament_id}}/start
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{}
HTTP 200
[Captures]
match_id: jsonpath "$.matches[0]._id"
p1_participant_id: jsonpath "$.matches[0].player1.participantId"
[Asserts]
jsonpath "$.data.status" == "active"
jsonpath "$.matches" count == 1
jsonpath "$.matches[0].round" == 1
jsonpath "$.matches[0].status" == "pending"


# Restarting an active tournament must not seed a second bracket.
POST http://{{host}}/tournament/{{tournament_id}}/start
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{}
HTTP 400
[Asserts]
jsonpath "$.success" == false


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Consensus — one report is not enough, two agreeing reports complete the match
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PATCH http://{{host}}/match/{{match_id}}/report
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "winnerId": "{{p1_participant_id}}"
}
HTTP 200
[Asserts]
# One side has spoken; the match waits for the other rather than completing.
jsonpath "$.data.status" == "in_progress"
jsonpath "$.data.winnerId" == null
jsonpath "$.data.reportedResults" count == 1


POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "lifeB_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


PATCH http://{{host}}/match/{{match_id}}/report
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "winnerId": "{{p1_participant_id}}"
}
HTTP 200
[Asserts]
jsonpath "$.data.status" == "completed"
jsonpath "$.data.winnerId" == "{{p1_participant_id}}"
jsonpath "$.data.loserId" != "{{p1_participant_id}}"
jsonpath "$.data.completedAt" exists
jsonpath "$.data.reportedResults" count == 2


# The completed match is readable on its own route, not just in the report reply.
GET http://{{host}}/match/{{match_id}}
HTTP 200
[Asserts]
jsonpath "$.data.status" == "completed"
jsonpath "$.data.winnerId" == "{{p1_participant_id}}"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# userA advances — with no opponents left the tournament completes
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "lifeA_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


POST http://{{host}}/tournament/{{tournament_id}}/advance
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{}
HTTP 200
[Asserts]
jsonpath "$.completed" == true
jsonpath "$.data.status" == "completed"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# The result is durable and publicly visible
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET http://{{host}}/tournament/{{tournament_id}}
HTTP 200
[Asserts]
jsonpath "$.data.status" == "completed"
jsonpath "$.data.participants" count == 2


GET http://{{host}}/match/tournament/{{tournament_id}}
HTTP 200
[Asserts]
jsonpath "$.data" count == 1
jsonpath "$.data[0].status" == "completed"


# userA played and created, so their own stats must show it. The tournament is
# WH3 (enable40kFactions defaulted false), and detail=full adds the faction
# split — asserted here because this endpoint is otherwise only unit tested.
GET http://{{host}}/user/stats?detail=full
HTTP 200
[Asserts]
jsonpath "$.data.range" == "all"
jsonpath "$.data.wh3.tournamentsCreated" >= 1
jsonpath "$.data.wh3.matchesPlayed" >= 1


# The public statistics page must see the completed tournament too. Other suites
# share this database, so assert direction rather than exact totals.
GET http://{{host}}/stats
HTTP 200
[Asserts]
jsonpath "$.data.wh3.tournaments.completed" >= 1
jsonpath "$.data.wh3.matches.completed" >= 1
