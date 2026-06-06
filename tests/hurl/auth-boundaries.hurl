# auth-boundaries.hurl
# Verifies that an authenticated user cannot manipulate another user's data.
#
# Flow:
#   1. Register + login as userA, create a tournament
#   2. Register + login as userB (Hurl's cookie jar switches to userB's session)
#   3. Assert userB's mutation attempts against userA's resources are all rejected
#   4. Assert that an authenticated request missing the CSRF token is also rejected

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SETUP — userA
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Step 1: Initialise a session and grab a pre-login CSRF token
GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


# Step 2: Register userA (no CSRF required on this endpoint)
POST http://{{host}}/user/register
Content-Type: application/json
{
  "username": "hurlA_{{run_id}}",
  "email": "hurl-a-{{run_id}}@test.local",
  "password": "HurlTest1!"
}
HTTP 201


# Step 3: Login as userA — Passport regenerates the session ID to prevent
# session fixation, so the CSRF token captured above is now stale.
# Using /user/login (no extra validation middleware) — same controller as /auth/login.
POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "hurlA_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


# Step 4: Re-fetch CSRF token now that we have a fresh post-login session
GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


# Step 5: Create a tournament as userA — capture its ID for later attack tests
POST http://{{host}}/tournament
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{
  "name": "Hurl Boundary Tournament",
  "playerCount": 4,
  "tournamentType": "Single Elimination"
}
HTTP 201
[Captures]
tournament_id: jsonpath "$.data._id"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SETUP — userB (session switches when we log in)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Step 6: Register userB — no CSRF, existing session cookie does not matter
POST http://{{host}}/user/register
Content-Type: application/json
{
  "username": "hurlB_{{run_id}}",
  "email": "hurl-b-{{run_id}}@test.local",
  "password": "HurlTest1!"
}
HTTP 201


# Step 7: Login as userB — Hurl's cookie jar now holds userB's session
POST http://{{host}}/user/login
Content-Type: application/json
{
  "identifier": "hurlB_{{run_id}}",
  "password": "HurlTest1!"
}
HTTP 200


# Step 8: Fresh CSRF token for userB's new session
GET http://{{host}}/auth/csrf-token
HTTP 200
[Captures]
csrf_token: jsonpath "$.csrfToken"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TESTS — userB attempts to manipulate userA's tournament
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Test 1: userB tries to delete userA's tournament
DELETE http://{{host}}/tournament/{{tournament_id}}
X-CSRF-Token: {{csrf_token}}
HTTP 404
[Asserts]
jsonpath "$.success" == false


# Test 2: userB tries to start userA's tournament
POST http://{{host}}/tournament/{{tournament_id}}/start
X-CSRF-Token: {{csrf_token}}
HTTP 404
[Asserts]
jsonpath "$.success" == false


# Test 3: userB tries to add a participant to userA's tournament
POST http://{{host}}/tournament/{{tournament_id}}/participants
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
{ "name": "Injected Player" }
HTTP 404
[Asserts]
jsonpath "$.success" == false


# Test 4: userB tries to advance the round of userA's tournament
POST http://{{host}}/tournament/{{tournament_id}}/advance
X-CSRF-Token: {{csrf_token}}
HTTP 404
[Asserts]
jsonpath "$.success" == false


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST — CSRF bypass: authenticated but no token header
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Test 5: Authenticated session but deliberately omit X-CSRF-Token — must be 403
POST http://{{host}}/tournament
Content-Type: application/json
{
  "name": "CSRF bypass attempt",
  "playerCount": 4,
  "tournamentType": "Single Elimination"
}
HTTP 403
[Asserts]
jsonpath "$.success" == false
