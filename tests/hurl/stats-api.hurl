# stats-api.hurl
# The statistics query surface end to end.
#
# The server unit tests all mock mongoose, so they prove the service *shapes* a
# response but never that the aggregation pipelines are valid MongoDB — a bad
# $facet or $project stage would pass every unit test and fail in production.
# These run against the real database.
#
# Other suites share this database and CI ordering may vary, so assertions are
# about shape, contracts and invariants, never about exact totals.

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Default shape — no query params must keep working for existing callers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET http://{{host}}/stats
HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.data.cachedAt" exists
jsonpath "$.data.range" == "all"
jsonpath "$.data.wh3" exists
jsonpath "$.data['40k']" exists
jsonpath "$.data.wh3.tournaments.total" isInteger
jsonpath "$.data.wh3.matches.completionRate" isInteger
jsonpath "$.data.wh3.topPlayersTotal" isInteger
jsonpath "$.data.wh3.topFactionsTotal" isInteger
jsonpath "$.data.wh3.topCreatorsTotal" isInteger
# The historical per-section caps apply when limit/offset are omitted.
jsonpath "$.data.wh3.topPlayers" count <= 10
jsonpath "$.data.wh3.topFactions" count <= 10
jsonpath "$.data.wh3.topCreators" count <= 5
jsonpath "$.data.wh3.recentWinners" count <= 10
jsonpath "$.data.wh3.recentTournaments" count <= 5


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Time ranges
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET http://{{host}}/stats?range=7d
HTTP 200
[Asserts]
jsonpath "$.data.range" == "7d"
jsonpath "$.data.wh3.topPlayersTotal" isInteger


GET http://{{host}}/stats?range=30d
HTTP 200
[Asserts]
jsonpath "$.data.range" == "30d"


GET http://{{host}}/stats?range=90d
HTTP 200
[Asserts]
jsonpath "$.data.range" == "90d"


# A range narrows only the win-based lists. Status counts describe where things
# stand right now, so they must be identical across every window — this is the
# invariant most likely to break if date scoping is ever moved up the pipeline.
GET http://{{host}}/stats?range=all
HTTP 200
[Captures]
all_time_completed: jsonpath "$.data.wh3.tournaments.completed"
all_time_total: jsonpath "$.data.wh3.tournaments.total"
all_time_matches: jsonpath "$.data.wh3.matches.total"


GET http://{{host}}/stats?range=7d
HTTP 200
[Asserts]
jsonpath "$.data.wh3.tournaments.completed" == {{all_time_completed}}
jsonpath "$.data.wh3.tournaments.total" == {{all_time_total}}
jsonpath "$.data.wh3.matches.total" == {{all_time_matches}}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Pagination
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# limit applies to every list section in one request.
GET http://{{host}}/stats?limit=2
HTTP 200
[Asserts]
jsonpath "$.data.wh3.topPlayers" count <= 2
jsonpath "$.data.wh3.topFactions" count <= 2
jsonpath "$.data.wh3.topCreators" count <= 2
jsonpath "$.data.wh3.recentWinners" count <= 2
jsonpath "$.data.wh3.recentTournaments" count <= 2


# The total is the size of the whole list, not of the page.
GET http://{{host}}/stats?limit=1
HTTP 200
[Asserts]
jsonpath "$.data.wh3.topCreators" count <= 1
# The suites before this one each created a tournament, so paging has something
# to page through. Asserted explicitly so a change in run order fails here with
# an obvious reason rather than as a confusing missing-row error below.
jsonpath "$.data.wh3.topCreatorsTotal" >= 2
[Captures]
first_creator: jsonpath "$.data.wh3.topCreators[0].username"


# Offsetting past the first row must return a different row, not repeat it.
# Ties are broken deterministically server-side precisely so this holds.
GET http://{{host}}/stats?limit=1&offset=1
HTTP 200
[Asserts]
jsonpath "$.data.wh3.topCreators[0].username" != "{{first_creator}}"


# The export path asks for the maximum in one go.
GET http://{{host}}/stats?limit=200
HTTP 200
[Asserts]
jsonpath "$.data.wh3.topPlayers" count <= 200


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Richer per-row fields
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# The lifecycle and dispute suites both complete matches, so at least one
# player has a win by now and the extended fields must be populated.
GET http://{{host}}/stats
HTTP 200
[Asserts]
jsonpath "$.data.wh3.topPlayersTotal" >= 1
jsonpath "$.data.wh3.topPlayers[0].name" exists
jsonpath "$.data.wh3.topPlayers[0].wins" >= 1
jsonpath "$.data.wh3.topPlayers[0].matchesPlayed" >= 1
jsonpath "$.data.wh3.topPlayers[0].losses" >= 0
jsonpath "$.data.wh3.topPlayers[0].winRate" >= 0
jsonpath "$.data.wh3.topPlayers[0].winRate" <= 100
[Captures]
top_wins: jsonpath "$.data.wh3.topPlayers[0].wins"


# A win is a match played, so matchesPlayed can never trail wins.
GET http://{{host}}/stats
HTTP 200
[Asserts]
jsonpath "$.data.wh3.topPlayers[0].matchesPlayed" >= {{top_wins}}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Rejected input
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET http://{{host}}/stats?range=1y
HTTP 400
[Asserts]
jsonpath "$.success" == false
jsonpath "$.errors[0].field" == "range"


GET http://{{host}}/stats?limit=0
HTTP 400
[Asserts]
jsonpath "$.errors[0].field" == "limit"


GET http://{{host}}/stats?limit=201
HTTP 400
[Asserts]
jsonpath "$.errors[0].field" == "limit"


GET http://{{host}}/stats?limit=notanumber
HTTP 400
[Asserts]
jsonpath "$.errors[0].field" == "limit"


GET http://{{host}}/stats?offset=-1
HTTP 400
[Asserts]
jsonpath "$.errors[0].field" == "offset"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Per-user stats stay owner-only, and validate the same way
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Anonymous callers get nothing, whatever they ask for. The public /stats page
# above is deliberately open; this one must not be.
GET http://{{host}}/user/stats
HTTP 401
[Asserts]
jsonpath "$.success" == false


GET http://{{host}}/user/stats?range=7d&detail=full
HTTP 401
[Asserts]
jsonpath "$.success" == false


GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


POST http://{{host}}/user/register
Content-Type: application/json
{
  "username": "statsU_{{run_id}}",
  "email": "stats-u-{{run_id}}@test.local",
  "password": "HurlTest1!"
}
HTTP 201


POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "statsU_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


# A brand-new account has no history: every counter is zero rather than absent.
GET http://{{host}}/user/stats
HTTP 200
[Asserts]
jsonpath "$.data.range" == "all"
jsonpath "$.data.wh3.tournamentsCreated" == 0
jsonpath "$.data.wh3.matchesPlayed" == 0
jsonpath "$.data.wh3.wins" == 0
jsonpath "$.data.wh3.losses" == 0
jsonpath "$.data.wh3.factions" count == 0
jsonpath "$.data['40k']" exists


GET http://{{host}}/user/stats?range=30d&detail=full&limit=5&offset=0
HTTP 200
[Asserts]
jsonpath "$.data.range" == "30d"
jsonpath "$.data.wh3.factionsTotal" == 0


GET http://{{host}}/user/stats?detail=everything
HTTP 400
[Asserts]
jsonpath "$.errors[0].field" == "detail"


GET http://{{host}}/user/stats?range=forever
HTTP 400
[Asserts]
jsonpath "$.errors[0].field" == "range"
