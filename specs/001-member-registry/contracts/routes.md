# `doGet` routes

Single web-app deployment: **Execute as** the Club account, **Who has access: Anyone** (research R2).
All pages are HtmlService output with `XFrameOptionsMode.DEFAULT`, `<meta name="viewport" content="width=device-width, initial-scale=1">`,
and both translation bundles embedded (no server round trip to switch language, FR-020).

| Route | Access | Response | FRs |
|---|---|---|---|
| `/exec`, `?page=register`, unknown params | Public | Registration form. Template variables: `formToken` (signed issued-at), `lang` (`?lang=` or empty → client picks from `sessionStorage` / `navigator.language`). No member data. | FR-007, FR-020, FR-023 |
| `?page=signin` | Public | Sign-in screen with "Sign in with Google" (calls `beginSignIn`) and an in-app-browser warning when detected. | FR-023 |
| `?code=<code>&state=<state>` | Public (callback) | Server consumes `state`, exchanges `code`, checks ID-token claims, resolves the Club user (research R1). **Success**: app shell with `{sessionToken, clientNonce}` embedded; the client accepts the token only if `clientNonce` matches its `sessionStorage`. **Failure**: sign-in screen with `SIGN_IN_FAILED` or `NOT_A_CLUB_USER`. The `code` is never logged. | FR-023, FR-024 |
| `?page=app` | Public shell | App shell with no data. If the tab holds a session token, the client calls `whoAmI`; on `NOT_SIGNED_IN` it shows only "Register" and "Sign in". Navigation shows only screens permitted by `capabilities`. | FR-023, FR-025 |

Screens inside the app shell (client-side routing, `#search`, `#member/<n>`, `#register`, `#users`):

| Screen | Required capability | Phone (360 px) required? |
|---|---|---|
| Search / results | `member.search` | Yes (FR-028) |
| Member view (details + history) | `member.viewDetails` | Yes (FR-028) |
| Register on behalf (same form component as public) | `member.register` | Yes (FR-028) |
| Edit member / Note | `member.edit` | Should |
| Delete member (confirm + reason) | `member.delete` | Should |
| Club users and roles | `clubUser.manage` | Should |

Hiding a screen is a convenience; the server enforces every capability again (contracts README §2).
