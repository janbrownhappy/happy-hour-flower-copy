# Happy Hour Flower auth.md

How an AI agent can get access to Happy Hour Flower (https://happyhourflower.com).

## Summary

- Public pages, `/llms.txt` and `/sitemap.xml` need no credentials.
- There is no public REST API, API key or developer token to request.
- The only agent access is delegated OAuth sign-in to the MCP server. The agent acts as
  a real user, with that user's permissions.

## Accounts

Access always belongs to a person with a Happy Hour Flower account. Users must be 21 or older.

- Sign up: https://happyhourflower.com/register (email and password with a one-time email code, or Google)
- Sign in: https://happyhourflower.com/login
- Reset password: https://happyhourflower.com/forgot-password

Agents must not create accounts or enter passwords for a person. Send the person to these
pages and let them finish.

## MCP server (OAuth)

- Endpoint: `https://happyhourflower.com/api/mcp` (streamable HTTP)
- Auth method: OAuth 2.0 bearer token, sent as `Authorization: Bearer <token>`
- Without a token the server returns `401` with a `WWW-Authenticate` header.
- Protected resource metadata: https://happyhourflower.com/.well-known/oauth-protected-resource
  lists the authorization server to use.

Flow:

1. Connect your MCP client to the endpoint above.
2. The client reads the protected resource metadata and starts the OAuth flow.
3. The person signs in at `/login` and approves access on the consent page (`/oauth/consent`).
4. The client gets a token and calls the server's tools as that person.

Tokens can stop working when the app publishes changes to its tool list. If that happens,
authorize again.
