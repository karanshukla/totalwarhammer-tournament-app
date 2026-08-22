# match-disputes.hurl
# The contested path: what happens when two players disagree about who won.
#
# This is the app's most consequential business rule — it decides a result no
# one agreed on — and it was covered only by unit tests against a mocked
# mongoose. Here it runs against the real database and the real session/CSRF
# stack, including the audit trail an override is supposed to leave behind.
#
# Flow:
#   1. userC creates a 2-slot tournament, userD joins, userC seeds the bracket
#   2. The two players report *different* winners → the match becomes disputed
#   3. A player cannot resolve their own dispute — only the creator can
#   4. userC resolves it, recording who decided and why
#   5. userC then overrides the resolved result, appending to the audit trail
#      rather than overwriting it

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SETUP — userC creates, userD joins, bracket is seeded
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


POST http://{{host}}/user/register
Content-Type: application/json
{
  "username": "dispC_{{run_id}}",
  "email": "disp-c-{{run_id}}@test.local",
  "password": "HurlTest1!"
}
HTTP 201


POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "dispC_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "name": "Hurl Dispute Tournament",
  "playerCount": 2,
  "tournamentType": "Single Elimination"
}
HTTP 201
[Captures]
tournament_id: jsonpath "$.data._id"


POST http://{{host}}/user/register
Content-Type: application/json
{
  "username": "dispD_{{run_id}}",
  "email": "disp-d-{{run_id}}@test.local",
  "password": "HurlTest1!"
}
HTTP 201


POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "dispD_{{run_id}}",
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


POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "dispC_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


POST http://{{host}}/tournament/{{tournament_id}}/start
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{}
HTTP 200
[Captures]
match_id: jsonpath "$.matches[0]._id"
p1_participant_id: jsonpath "$.matches[0].player1.participantId"
p2_participant_id: jsonpath "$.matches[0].player2.participantId"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Conflicting reports put the match into dispute
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# userC claims player1 won.
PATCH http://{{host}}/match/{{match_id}}/report
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "winnerId": "{{p1_participant_id}}"
}
HTTP 200
[Asserts]
jsonpath "$.data.status" == "in_progress"


POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "dispD_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


# userD claims the opposite. The server must refuse to pick a side.
PATCH http://{{host}}/match/{{match_id}}/report
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "winnerId": "{{p2_participant_id}}"
}
HTTP 200
[Asserts]
jsonpath "$.data.status" == "disputed"
jsonpath "$.data.winnerId" == null
jsonpath "$.data.reportedResults" count == 2


# The admin shortcut is not a way for a player to settle their own match.
PATCH http://{{host}}/match/{{match_id}}/result
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "winnerId": "{{p2_participant_id}}"
}
HTTP 403
[Asserts]
jsonpath "$.success" == false


# A player may not adjudicate the dispute they are party to.
PATCH http://{{host}}/match/{{match_id}}/resolve
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "winnerId": "{{p2_participant_id}}"
}
HTTP 403
[Asserts]
jsonpath "$.success" == false


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# The creator resolves it, on the record
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "dispC_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


# Even the creator must go through /resolve: the record shortcut refuses a
# disputed match rather than quietly discarding the disagreement.
PATCH http://{{host}}/match/{{match_id}}/result
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "winnerId": "{{p1_participant_id}}"
}
HTTP 400
[Asserts]
jsonpath "$.success" == false


PATCH http://{{host}}/match/{{match_id}}/resolve
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "winnerId": "{{p1_participant_id}}",
  "reason": "Replay footage reviewed by the organiser"
}
HTTP 200
[Asserts]
jsonpath "$.data.status" == "completed"
jsonpath "$.data.winnerId" == "{{p1_participant_id}}"
# Resolving is itself an override: it must say who decided and why.
jsonpath "$.data.resultOverrides" count == 1
jsonpath "$.data.resultOverrides[0].reason" == "Replay footage reviewed by the organiser"
jsonpath "$.data.resultOverrides[0].newWinnerId" == "{{p1_participant_id}}"
jsonpath "$.data.resultOverrides[0].previousWinnerId" == null


# Resolving twice is meaningless once the match is no longer disputed.
PATCH http://{{host}}/match/{{match_id}}/resolve
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "winnerId": "{{p2_participant_id}}"
}
HTTP 400
[Asserts]
jsonpath "$.success" == false


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Overriding a settled result appends to the audit trail
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PATCH http://{{host}}/match/{{match_id}}/override
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "winnerId": "{{p2_participant_id}}",
  "reason": "Player 1 fielded an illegal list"
}
HTTP 200
[Asserts]
jsonpath "$.data.status" == "completed"
jsonpath "$.data.winnerId" == "{{p2_participant_id}}"
jsonpath "$.data.loserId" == "{{p1_participant_id}}"
# The earlier resolution is kept, not replaced — that is the point of the trail.
jsonpath "$.data.resultOverrides" count == 2
jsonpath "$.data.resultOverrides[1].previousWinnerId" == "{{p1_participant_id}}"
jsonpath "$.data.resultOverrides[1].newWinnerId" == "{{p2_participant_id}}"
jsonpath "$.data.resultOverrides[1].reason" == "Player 1 fielded an illegal list"


# An override cannot invent a winner who never played in the match.
PATCH http://{{host}}/match/{{match_id}}/override
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "winnerId": "aaaaaaaaaaaaaaaaaaaaaaaa"
}
HTTP 400
[Asserts]
jsonpath "$.success" == false


# The trail survives a fresh read, so it is persisted rather than echoed back.
GET http://{{host}}/match/{{match_id}}
HTTP 200
[Asserts]
jsonpath "$.data.resultOverrides" count == 2
jsonpath "$.data.winnerId" == "{{p2_participant_id}}"
