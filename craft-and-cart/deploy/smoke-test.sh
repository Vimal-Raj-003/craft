#!/usr/bin/env bash
# Smoke test for the deployed site. Run it from anywhere (your laptop or the VPS):
#
#   BASE_URL=https://craft.jilljill.in ADMIN_EMAIL=admin@craftandcart.local ADMIN_PASSWORD='...' bash deploy/smoke-test.sh
#
# It only READS data, except that it signs in as the admin and signs out again. It creates no orders.
# For a test on the server itself without Nginx use BASE_URL=http://127.0.0.1:3215 and set INSECURE_HTTP=1
# (the login cookie is "Secure", so over plain http only the sign-in step can be checked).

set -u
BASE_URL="${BASE_URL:-https://craft.jilljill.in}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@craftandcart.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT
fail=0
pass() { printf 'PASS  %s\n' "$1"; }
bad()  { printf 'FAIL  %s\n' "$1"; fail=1; }
CURL_OPTS="${CURL_OPTS:-}"   # e.g. CURL_OPTS=-k to accept a self-signed test certificate
curl() { command curl $CURL_OPTS "$@"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "Testing $BASE_URL"

# 1) the site and its database answer
[ "$(code "$BASE_URL/api/health")" = "200" ] && pass "health check (site + database)" || bad "health check"
curl -s "$BASE_URL/api/products" | grep -q '"products":\[{' && pass "products load from the database" || bad "products API"
for p in / /shop /checkout /login; do
  [ "$(code "$BASE_URL$p")" = "200" ] && pass "page $p opens" || bad "page $p"
done
[ "$(code "$BASE_URL/kolam-chain.svg")" = "200" ] && pass "static files are served" || bad "static files"
[ "$(code "$BASE_URL/_next/image?url=%2Fproducts%2Fsunflower-keychain.jpg&w=640&q=75")" = "200" ] && pass "image optimiser works" || bad "image optimiser"

# 2) HTTPS and redirects
if [ "${SKIP_REDIRECT_CHECK:-0}" != "1" ]; then
  case "$BASE_URL" in
    https://*)
      host="${BASE_URL#https://}"
      [ "$(code "http://$host/")" = "301" ] && pass "http redirects to https" || bad "http -> https redirect"
      ;;
  esac
fi

# 3) security rules
[ "$(code "$BASE_URL/api/admin/orders")" = "403" ] && pass "admin API is closed without a login" || bad "admin API open without login"
[ "$(code -X POST -d '{}' "$BASE_URL/api/webhooks/phonepe")" = "401" ] && pass "payment webhook rejects unsigned calls" || bad "webhook accepts unsigned calls"
[ "$(code -X POST -d '{"orderId":"00000000-0000-0000-0000-000000000000"}' "$BASE_URL/api/checkout/verify")" = "403" ] && pass "demo-payment endpoint is disabled" || bad "demo-payment endpoint is open"
[ "$(code -H 'Cookie: cc_session=forged.value.here' "$BASE_URL/api/admin/orders")" = "403" ] && pass "forged login cookie is rejected" || bad "forged cookie accepted"

# 4) admin sign-in session (the cookie is HttpOnly + Secure + SameSite=Lax, so use a cookie jar over HTTPS)
if [ -n "$ADMIN_PASSWORD" ]; then
  hdrs="$(curl -s -i -c "$JAR" -X POST -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" "$BASE_URL/api/auth/login")"
  echo "$hdrs" | grep -qi '^HTTP/.* 200' && pass "admin sign-in succeeds" || bad "admin sign-in"
  echo "$hdrs" | grep -i '^set-cookie: cc_session' | grep -qi 'HttpOnly' && pass "cookie is HttpOnly" || bad "cookie not HttpOnly"
  echo "$hdrs" | grep -i '^set-cookie: cc_session' | grep -qi 'Secure' && pass "cookie is Secure" || bad "cookie not Secure"
  echo "$hdrs" | grep -i '^set-cookie: cc_session' | grep -qi 'SameSite=lax' && pass "cookie is SameSite=Lax" || bad "cookie SameSite"
  case "$BASE_URL" in
    https://*)
      curl -s -b "$JAR" "$BASE_URL/api/auth/me" | grep -q '"role":"admin"' && pass "/api/auth/me recognises the signed-in admin" || bad "/api/auth/me after login"
      [ "$(code -b "$JAR" "$BASE_URL/api/admin/orders")" = "200" ] && pass "admin orders API works after login" || bad "admin orders API after login"
      curl -s -b "$JAR" "$BASE_URL/admin" | grep -q 'Recent orders' && pass "admin dashboard renders" || bad "admin dashboard"
      curl -s -b "$JAR" -X POST "$BASE_URL/api/auth/logout" >/dev/null && pass "sign-out works"
      ;;
    *) echo "SKIP  session checks need HTTPS because the cookie is Secure" ;;
  esac
else
  echo "SKIP  admin session checks (set ADMIN_PASSWORD to run them)"
fi

echo
[ "$fail" = "0" ] && echo "ALL CHECKS PASSED" || echo "SOME CHECKS FAILED"
exit "$fail"
