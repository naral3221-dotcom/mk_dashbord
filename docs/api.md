# Marketing Analytics SaaS - API Documentation

## Base URL

```
https://<your-domain>/api
```

In local development:

```
http://localhost:3000/api
```

---

## Authentication

This API uses **NextAuth.js v5** with JWT session strategy. Most endpoints require an authenticated session.

### How It Works

1. Authenticate via `/api/auth/[...nextauth]` (NextAuth.js handles sign-in/sign-out flows).
2. The session JWT is stored as an HTTP-only cookie (`next-auth.session-token`).
3. Authenticated requests automatically include the cookie. No manual `Authorization` header is needed for browser-based clients.
4. Cron endpoints use a `Bearer <CRON_SECRET>` authorization header instead of session cookies.
5. The Stripe webhook endpoint uses a `stripe-signature` header for verification.

### Session User Object

After authentication, the session user contains:

| Field            | Type              | Description                          |
| ---------------- | ----------------- | ------------------------------------ |
| `id`             | `string`          | User UUID                            |
| `email`          | `string`          | User email                           |
| `name`           | `string \| null`  | User display name                    |
| `role`           | `Role`            | `OWNER`, `ADMIN`, `MEMBER`, `VIEWER` |
| `organizationId` | `string \| null`  | Current organization UUID            |

---

## Error Response Format

All API errors follow a consistent structure:

```json
{
  "error": "Human-readable error message",
  "errorCode": "MACHINE_READABLE_CODE"
}
```

### Error Codes Reference

| Error Code                | HTTP Status | Description                                         |
| ------------------------- | ----------- | --------------------------------------------------- |
| `VALIDATION_ERROR`        | 400         | Invalid input data or missing required fields        |
| `UNAUTHORIZED`            | 401         | Authentication required or session expired           |
| `FORBIDDEN`               | 403         | Insufficient permissions for the requested action    |
| `NOT_FOUND`               | 404         | Requested resource does not exist                    |
| `CONFLICT`                | 409         | Resource already exists or state conflict            |
| `PLAN_LIMIT_EXCEEDED`     | 403         | Action blocked by current subscription plan limits   |
| `EXTERNAL_SERVICE_ERROR`  | 502         | Error communicating with an external service (META, Google, Stripe, etc.) |
| `INTERNAL_ERROR`          | 500         | Unexpected server error                              |

> **Note:** Some endpoints return inline error responses (e.g., `{ error: "..." }`) without the `errorCode` field for simple validation failures that occur before the domain layer is reached. The `errorCode` field is always present when the error originates from the domain error system.

---

## Enums

### Plan

| Value        | Description          |
| ------------ | -------------------- |
| `FREE`       | Free tier            |
| `STARTER`    | Starter plan         |
| `PRO`        | Professional plan    |
| `ENTERPRISE` | Enterprise plan      |

### Role

| Value    | Description         |
| -------- | ------------------- |
| `OWNER`  | Organization owner  |
| `ADMIN`  | Administrator       |
| `MEMBER` | Regular member      |
| `VIEWER` | Read-only viewer    |

### Platform

| Value    | Description             |
| -------- | ----------------------- |
| `META`   | Meta (Facebook/Instagram) Ads |
| `GOOGLE` | Google Ads              |
| `TIKTOK` | TikTok Ads              |
| `NAVER`  | Naver Search Ads        |
| `KAKAO`  | Kakao Ads               |

### CampaignStatus

| Value      | Description          |
| ---------- | -------------------- |
| `ACTIVE`   | Campaign is running  |
| `PAUSED`   | Campaign is paused   |
| `DELETED`  | Campaign is deleted  |
| `ARCHIVED` | Campaign is archived |

---

## API Endpoints

### 1. Health

#### `GET /api/health`

Health check endpoint. Returns server and database status.

- **Authentication:** No
- **Query Parameters:** None

**Success Response (200):**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "database": "connected",
  "timestamp": "2026-02-10T12:00:00.000Z"
}
```

**Error Response (503):**

```json
{
  "status": "unhealthy",
  "version": "1.0.0",
  "uptime": 3600,
  "database": "disconnected",
  "timestamp": "2026-02-10T12:00:00.000Z"
}
```

---

### 2. Authentication

#### `POST /api/auth/register`

Register a new user with email and password.

- **Authentication:** No
- **Content-Type:** `application/json`

**Request Body:**

| Field      | Type     | Required | Description               |
| ---------- | -------- | -------- | ------------------------- |
| `email`    | `string` | Yes      | User email address        |
| `password` | `string` | Yes      | User password             |
| `name`     | `string` | No       | User display name         |

**Success Response (201):**

```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Error Responses:**

| Status | Error Code         | Condition                           |
| ------ | ------------------ | ----------------------------------- |
| 400    | --                 | Missing email or password           |
| 400    | `VALIDATION_ERROR` | Invalid email format                |
| 409    | `CONFLICT`         | Email already registered            |

---

#### `GET /api/auth/[...nextauth]`

#### `POST /api/auth/[...nextauth]`

NextAuth.js handler. Manages sign-in, sign-out, session, and OAuth callback flows.

- **Authentication:** Varies by action
- **Supported Providers:** Credentials (email/password), Google OAuth

This is a catch-all route handled by NextAuth.js. Common sub-paths:

| Path                          | Method | Description                    |
| ----------------------------- | ------ | ------------------------------ |
| `/api/auth/signin`            | GET    | Sign-in page                   |
| `/api/auth/signout`           | POST   | Sign out and clear session     |
| `/api/auth/session`           | GET    | Get current session            |
| `/api/auth/callback/google`   | GET    | Google OAuth callback          |
| `/api/auth/callback/credentials` | POST | Credentials sign-in         |
| `/api/auth/csrf`              | GET    | Get CSRF token                 |

Refer to the [NextAuth.js documentation](https://next-auth.js.org/) for full details.

---

### 3. Organizations

#### `POST /api/organizations`

Create a new organization. The authenticated user becomes the owner.

- **Authentication:** Yes (session required)
- **Content-Type:** `application/json`

**Request Body:**

| Field  | Type     | Required | Description             |
| ------ | -------- | -------- | ----------------------- |
| `name` | `string` | Yes      | Organization name       |
| `slug` | `string` | Yes      | URL-friendly slug       |

**Success Response (201):**

```json
{
  "id": "uuid-string",
  "name": "My Company",
  "slug": "my-company",
  "plan": "FREE"
}
```

**Error Responses:**

| Status | Error Code         | Condition                        |
| ------ | ------------------ | -------------------------------- |
| 401    | --                 | Not authenticated                |
| 400    | `VALIDATION_ERROR` | Invalid name or slug             |
| 409    | `CONFLICT`         | Slug already taken               |

---

### 4. Members

#### `GET /api/members`

List all members of the authenticated user's organization.

- **Authentication:** Yes (session required, must belong to an organization)

**Success Response (200):**

```json
[
  {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "OWNER"
  },
  {
    "id": "uuid-string",
    "email": "member@example.com",
    "name": "Jane Smith",
    "role": "MEMBER"
  }
]
```

**Error Responses:**

| Status | Error Code     | Condition                 |
| ------ | -------------- | ------------------------- |
| 401    | `UNAUTHORIZED` | Not authenticated         |
| 400    | --             | User has no organization  |

---

#### `PATCH /api/members/[userId]/role`

Change a user's role within the organization.

- **Authentication:** Yes (session required)
- **Content-Type:** `application/json`
- **URL Parameters:** `userId` - UUID of the target user

**Request Body:**

| Field  | Type   | Required | Description                                      |
| ------ | ------ | -------- | ------------------------------------------------ |
| `role` | `Role` | Yes      | New role: `OWNER`, `ADMIN`, `MEMBER`, or `VIEWER` |

**Success Response (200):**

```json
{
  "id": "uuid-string",
  "email": "member@example.com",
  "name": "Jane Smith",
  "role": "ADMIN"
}
```

**Error Responses:**

| Status | Error Code         | Condition                                    |
| ------ | ------------------ | -------------------------------------------- |
| 401    | `UNAUTHORIZED`     | Not authenticated                            |
| 403    | `FORBIDDEN`        | Insufficient permissions to change roles     |
| 404    | `NOT_FOUND`        | Target user not found                        |
| 400    | `VALIDATION_ERROR` | Invalid role value                           |

---

### 5. Invitations

#### `GET /api/invitations`

List all pending invitations for the authenticated user's organization.

- **Authentication:** Yes (session required, must belong to an organization)

**Success Response (200):**

```json
[
  {
    "id": "uuid-string",
    "email": "invited@example.com",
    "role": "MEMBER",
    "token": "invitation-token",
    "expiresAt": "2026-02-17T12:00:00.000Z",
    "createdAt": "2026-02-10T12:00:00.000Z"
  }
]
```

**Error Responses:**

| Status | Error Code     | Condition                 |
| ------ | -------------- | ------------------------- |
| 401    | `UNAUTHORIZED` | Not authenticated         |
| 400    | --             | User has no organization  |

---

#### `POST /api/invitations`

Invite a user to the organization.

- **Authentication:** Yes (session required, must belong to an organization)
- **Content-Type:** `application/json`

**Request Body:**

| Field   | Type     | Required | Description                                |
| ------- | -------- | -------- | ------------------------------------------ |
| `email` | `string` | Yes      | Email of the user to invite                |
| `role`  | `Role`   | Yes      | Role to assign: `ADMIN`, `MEMBER`, `VIEWER` |

**Success Response (201):**

```json
{
  "id": "uuid-string",
  "email": "invited@example.com",
  "role": "MEMBER",
  "token": "invitation-token",
  "expiresAt": "2026-02-17T12:00:00.000Z"
}
```

**Error Responses:**

| Status | Error Code              | Condition                                    |
| ------ | ----------------------- | -------------------------------------------- |
| 401    | `UNAUTHORIZED`          | Not authenticated                            |
| 400    | --                      | User has no organization                     |
| 400    | `VALIDATION_ERROR`      | Invalid email or role                        |
| 403    | `FORBIDDEN`             | Insufficient permissions to invite           |
| 409    | `CONFLICT`              | User already invited or is a member          |
| 403    | `PLAN_LIMIT_EXCEEDED`   | Max users limit reached for current plan     |

---

#### `POST /api/invitations/[token]/accept`

Accept an invitation by its token. The authenticated user joins the organization.

- **Authentication:** Yes (session required)
- **URL Parameters:** `token` - The invitation token string

**Request Body:** None (empty POST)

**Success Response (200):**

```json
{
  "success": true,
  "userId": "uuid-string"
}
```

**Error Responses:**

| Status | Error Code         | Condition                                |
| ------ | ------------------ | ---------------------------------------- |
| 401    | --                 | Not authenticated                        |
| 404    | `NOT_FOUND`        | Invalid or expired invitation token      |
| 409    | `CONFLICT`         | Invitation already accepted              |
| 400    | `VALIDATION_ERROR` | User already belongs to an organization  |

---

### 6. Meta (Facebook/Instagram) Integration

#### `GET /api/meta/auth`

Generate the Meta OAuth authorization URL.

- **Authentication:** Yes (session required)

**Success Response (200):**

```json
{
  "authUrl": "https://www.facebook.com/v21.0/dialog/oauth?client_id=...&redirect_uri=...&scope=ads_read,ads_management&state=...&response_type=code"
}
```

**Error Responses:**

| Status | Error Code | Condition                    |
| ------ | ---------- | ---------------------------- |
| 401    | --         | Not authenticated            |
| 500    | --         | `META_APP_ID` not configured |

---

#### `GET /api/meta/auth/callback`

Meta OAuth callback. Exchanges the authorization code for an access token and redirects the user.

- **Authentication:** Yes (session required)
- **Query Parameters (set by Meta):**

| Parameter | Type     | Description                              |
| --------- | -------- | ---------------------------------------- |
| `code`    | `string` | Authorization code from Meta             |
| `error`   | `string` | Error code if authorization was denied   |

**Behavior:**
- On success: Redirects to `/integrations/meta/callback?token=<short_lived_token>`
- On error: Redirects to `/integrations?error=<error_message>`
- If not authenticated: Redirects to `/auth/signin`

---

#### `GET /api/meta/accounts`

List all Meta ad accounts connected to the authenticated user's organization.

- **Authentication:** Yes (session required, must belong to an organization)

**Success Response (200):**

```json
[
  {
    "id": "uuid-string",
    "accountId": "act_123456789",
    "accountName": "My Meta Ad Account",
    "platform": "META",
    "isActive": true,
    "createdAt": "2026-02-10T12:00:00.000Z"
  }
]
```

**Error Responses:**

| Status | Error Code     | Condition                 |
| ------ | -------------- | ------------------------- |
| 401    | `UNAUTHORIZED` | Not authenticated         |
| 400    | --             | User has no organization  |

---

#### `POST /api/meta/accounts`

Connect a Meta ad account to the organization.

- **Authentication:** Yes (session required, must belong to an organization)
- **Content-Type:** `application/json`

**Request Body:**

| Field              | Type     | Required | Description                          |
| ------------------ | -------- | -------- | ------------------------------------ |
| `shortLivedToken`  | `string` | Yes      | Short-lived access token from OAuth  |
| `metaAccountId`    | `string` | Yes      | Meta ad account ID (e.g., `act_...`) |
| `metaAccountName`  | `string` | Yes      | Display name for the ad account      |

**Success Response (201 if new, 200 if reconnected):**

```json
{
  "adAccount": {
    "id": "uuid-string",
    "accountId": "act_123456789",
    "accountName": "My Meta Ad Account",
    "platform": "META",
    "isActive": true
  },
  "isNew": true
}
```

**Error Responses:**

| Status | Error Code              | Condition                                     |
| ------ | ----------------------- | --------------------------------------------- |
| 401    | `UNAUTHORIZED`          | Not authenticated                             |
| 400    | --                      | User has no organization or missing fields    |
| 403    | `PLAN_LIMIT_EXCEEDED`   | Max ad accounts reached or platform not allowed |
| 502    | `EXTERNAL_SERVICE_ERROR`| Failed to exchange token with Meta API        |

---

#### `POST /api/meta/sync/campaigns`

Sync campaigns from Meta for a specific ad account.

- **Authentication:** Yes (session required)
- **Content-Type:** `application/json`

**Request Body:**

| Field         | Type     | Required | Description               |
| ------------- | -------- | -------- | ------------------------- |
| `adAccountId` | `string` | Yes      | Internal ad account UUID  |

**Success Response (200):**

```json
{
  "synced": 15,
  "created": 5,
  "updated": 10,
  "adAccountId": "uuid-string"
}
```

**Error Responses:**

| Status | Error Code               | Condition                      |
| ------ | ------------------------ | ------------------------------ |
| 401    | --                       | Not authenticated              |
| 400    | --                       | Missing `adAccountId`          |
| 404    | `NOT_FOUND`              | Ad account not found           |
| 502    | `EXTERNAL_SERVICE_ERROR` | Meta API communication failure |

---

#### `POST /api/meta/sync/insights`

Sync campaign insights (performance data) from Meta for a specific campaign within a date range.

- **Authentication:** Yes (session required)
- **Content-Type:** `application/json`

**Request Body:**

| Field        | Type     | Required | Description                              |
| ------------ | -------- | -------- | ---------------------------------------- |
| `campaignId` | `string` | Yes      | Internal campaign UUID                   |
| `startDate`  | `string` | Yes      | Start date (ISO 8601, e.g., `2026-01-01`)|
| `endDate`    | `string` | Yes      | End date (ISO 8601, e.g., `2026-01-31`)  |

**Success Response (200):**

```json
{
  "synced": 31,
  "campaignId": "uuid-string"
}
```

**Error Responses:**

| Status | Error Code               | Condition                                  |
| ------ | ------------------------ | ------------------------------------------ |
| 401    | --                       | Not authenticated                          |
| 400    | --                       | Missing required fields                    |
| 400    | --                       | Invalid date format                        |
| 400    | --                       | `startDate` is after `endDate`             |
| 404    | `NOT_FOUND`              | Campaign not found                         |
| 502    | `EXTERNAL_SERVICE_ERROR` | Meta API communication failure             |

---

### 7. Google Ads Integration

#### `GET /api/google/auth`

Generate the Google OAuth authorization URL.

- **Authentication:** Yes (session required)

**Success Response (200):**

```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=https://www.googleapis.com/auth/adwords&state=...&access_type=offline&prompt=consent",
  "state": "uuid-state-string"
}
```

**Error Responses:**

| Status | Error Code | Condition                              |
| ------ | ---------- | -------------------------------------- |
| 401    | --         | Not authenticated                      |
| 500    | --         | `GOOGLE_ADS_CLIENT_ID` not configured  |

---

#### `GET /api/google/auth/callback`

Google OAuth callback. Exchanges the authorization code for access and refresh tokens.

- **Authentication:** Yes (session required)
- **Query Parameters (set by Google):**

| Parameter | Type     | Description                               |
| --------- | -------- | ----------------------------------------- |
| `code`    | `string` | Authorization code from Google            |
| `error`   | `string` | Error code if authorization was denied    |

**Behavior:**
- On success: Redirects to `/integrations/google/callback?token=<access_token>&refresh=<refresh_token>`
- On error: Redirects to `/integrations?error=<error_message>`
- If not authenticated: Redirects to `/auth/signin`

---

#### `GET /api/google/accounts`

List available Google Ads accounts using the provided access token.

- **Authentication:** Yes (session required, must belong to an organization)
- **Query Parameters:**

| Parameter | Type     | Required | Description                        |
| --------- | -------- | -------- | ---------------------------------- |
| `token`   | `string` | Yes      | Google OAuth access token          |

**Success Response (200):**

```json
{
  "accounts": [
    {
      "id": "1234567890",
      "name": "My Google Ads Account",
      "currency": "USD",
      "timezone": "America/New_York"
    }
  ]
}
```

**Error Responses:**

| Status | Error Code               | Condition                          |
| ------ | ------------------------ | ---------------------------------- |
| 401    | `UNAUTHORIZED`           | Not authenticated                  |
| 400    | --                       | Missing access token or no org     |
| 502    | `EXTERNAL_SERVICE_ERROR` | Google Ads API failure             |

---

#### `POST /api/google/accounts`

Connect a Google Ads account to the organization.

- **Authentication:** Yes (session required, must belong to an organization)
- **Content-Type:** `application/json`

**Request Body:**

| Field               | Type     | Required | Description                           |
| ------------------- | -------- | -------- | ------------------------------------- |
| `accessToken`       | `string` | Yes      | Google OAuth access token             |
| `refreshToken`      | `string` | No       | Google OAuth refresh token            |
| `googleAccountId`   | `string` | Yes      | Google Ads account ID                 |
| `googleAccountName` | `string` | Yes      | Display name for the ad account       |

**Success Response (201 if new, 200 if reconnected):**

```json
{
  "account": {
    "id": "uuid-string",
    "platform": "GOOGLE",
    "accountId": "1234567890",
    "accountName": "My Google Ads Account",
    "isActive": true
  },
  "isNew": true
}
```

**Error Responses:**

| Status | Error Code     | Condition                                  |
| ------ | -------------- | ------------------------------------------ |
| 401    | `UNAUTHORIZED` | Not authenticated                          |
| 400    | --             | Missing required fields or no organization |

---

#### `POST /api/google/sync/campaigns`

Sync campaigns from Google Ads for a specific ad account.

- **Authentication:** Yes (session required)
- **Content-Type:** `application/json`

**Request Body:**

| Field         | Type     | Required | Description               |
| ------------- | -------- | -------- | ------------------------- |
| `adAccountId` | `string` | Yes      | Internal ad account UUID  |

**Success Response (200):**

```json
{
  "success": true,
  "synced": 10,
  "created": 3,
  "updated": 7
}
```

**Error Responses:**

| Status | Error Code               | Condition                             |
| ------ | ------------------------ | ------------------------------------- |
| 401    | --                       | Not authenticated                     |
| 400    | --                       | Missing `adAccountId` or wrong platform |
| 404    | --                       | Ad account not found                  |
| 502    | `EXTERNAL_SERVICE_ERROR` | Google Ads API failure                |

---

### 8. TikTok Ads Integration

#### `GET /api/tiktok/auth`

Generate the TikTok Ads OAuth authorization URL.

- **Authentication:** Yes (session required)

**Success Response (200):**

```json
{
  "url": "https://business-api.tiktok.com/portal/auth?app_id=...&redirect_uri=...&state=...",
  "state": "uuid-state-string"
}
```

**Error Responses:**

| Status | Error Code | Condition                          |
| ------ | ---------- | ---------------------------------- |
| 401    | --         | Not authenticated                  |
| 500    | --         | `TIKTOK_APP_ID` not configured     |

---

#### `GET /api/tiktok/auth/callback`

TikTok Ads OAuth callback. Exchanges the auth code for access and refresh tokens.

- **Authentication:** Yes (session required)
- **Query Parameters (set by TikTok):**

| Parameter   | Type     | Description                             |
| ----------- | -------- | --------------------------------------- |
| `auth_code` | `string` | Authorization code from TikTok          |
| `error`     | `string` | Error code if authorization was denied  |

**Behavior:**
- On success: Redirects to `/integrations/tiktok/callback?token=<access_token>&refresh_token=<refresh_token>`
- On error: Redirects to `/integrations?error=<error_message>`
- If not authenticated: Redirects to `/auth/signin`

---

#### `GET /api/tiktok/accounts`

List available TikTok advertiser accounts using the provided access token.

- **Authentication:** Yes (session required, must belong to an organization)
- **Query Parameters:**

| Parameter      | Type     | Required | Description                       |
| -------------- | -------- | -------- | --------------------------------- |
| `access_token` | `string` | Yes      | TikTok OAuth access token         |

**Success Response (200):**

```json
{
  "data": [
    {
      "advertiser_id": "1234567890",
      "name": "My TikTok Ads Account",
      "currency": "USD",
      "timezone": "America/New_York",
      "is_active": true
    }
  ]
}
```

**Error Responses:**

| Status | Error Code               | Condition                          |
| ------ | ------------------------ | ---------------------------------- |
| 401    | `UNAUTHORIZED`           | Not authenticated                  |
| 400    | --                       | Missing `access_token` or no org   |
| 502    | `EXTERNAL_SERVICE_ERROR` | TikTok Ads API failure             |

---

#### `POST /api/tiktok/accounts`

Connect a TikTok advertiser account to the organization.

- **Authentication:** Yes (session required, must belong to an organization)
- **Content-Type:** `application/json`

**Request Body:**

| Field            | Type     | Required | Description                          |
| ---------------- | -------- | -------- | ------------------------------------ |
| `accessToken`    | `string` | Yes      | TikTok OAuth access token            |
| `refreshToken`   | `string` | No       | TikTok OAuth refresh token           |
| `advertiserId`   | `string` | Yes      | TikTok advertiser ID                 |
| `advertiserName` | `string` | Yes      | Display name for the ad account      |

**Success Response (201):**

```json
{
  "message": "TikTok account connection initiated",
  "advertiserId": "1234567890",
  "advertiserName": "My TikTok Ads Account"
}
```

**Error Responses:**

| Status | Error Code     | Condition                                  |
| ------ | -------------- | ------------------------------------------ |
| 401    | `UNAUTHORIZED` | Not authenticated                          |
| 400    | --             | Missing required fields or no organization |

---

#### `POST /api/tiktok/sync/campaigns`

Sync campaigns from TikTok Ads for a specific ad account.

- **Authentication:** Yes (session required)
- **Content-Type:** `application/json`

**Request Body:**

| Field         | Type     | Required | Description               |
| ------------- | -------- | -------- | ------------------------- |
| `adAccountId` | `string` | Yes      | Internal ad account UUID  |

**Success Response (200):**

```json
{
  "message": "TikTok campaign sync initiated",
  "adAccountId": "uuid-string"
}
```

**Error Responses:**

| Status | Error Code               | Condition                          |
| ------ | ------------------------ | ---------------------------------- |
| 401    | --                       | Not authenticated                  |
| 400    | --                       | Missing `adAccountId`              |
| 502    | `EXTERNAL_SERVICE_ERROR` | TikTok Ads API failure             |

---

### 9. Naver Search Ads Integration

Naver uses API Key authentication (not OAuth). Credentials are stored as encrypted JSON.

#### `GET /api/naver/accounts`

List all Naver ad accounts connected to the authenticated user's organization.

- **Authentication:** Yes (session required, must belong to an organization)

**Success Response (200):**

```json
[
  {
    "id": "uuid-string",
    "accountId": "naver-customer-id",
    "accountName": "My Naver Ads Account",
    "platform": "NAVER",
    "isActive": true,
    "createdAt": "2026-02-10T12:00:00.000Z"
  }
]
```

**Error Responses:**

| Status | Error Code     | Condition                 |
| ------ | -------------- | ------------------------- |
| 401    | `UNAUTHORIZED` | Not authenticated         |
| 400    | --             | User has no organization  |

---

#### `POST /api/naver/accounts`

Connect a Naver Search Ads account using API Key credentials. Validates credentials before storing.

- **Authentication:** Yes (session required, must belong to an organization)
- **Content-Type:** `application/json`

**Request Body:**

| Field        | Type     | Required | Description                     |
| ------------ | -------- | -------- | ------------------------------- |
| `apiKey`     | `string` | Yes      | Naver Ads API license key       |
| `apiSecret`  | `string` | Yes      | Naver Ads API secret key        |
| `customerId` | `string` | Yes      | Naver Ads customer ID           |

**Success Response (201 if new, 200 if reconnected):**

```json
{
  "id": "uuid-string",
  "accountId": "naver-customer-id",
  "accountName": "My Naver Ads Account",
  "platform": "NAVER",
  "isActive": true,
  "isNewAccount": true
}
```

**Error Responses:**

| Status | Error Code               | Condition                                     |
| ------ | ------------------------ | --------------------------------------------- |
| 401    | `UNAUTHORIZED`           | Not authenticated or invalid credentials      |
| 400    | --                       | Missing required fields or no organization    |
| 403    | `PLAN_LIMIT_EXCEEDED`    | Max ad accounts reached or platform not allowed |
| 502    | `EXTERNAL_SERVICE_ERROR` | Failed to validate credentials with Naver API |

---

#### `POST /api/naver/sync/campaigns`

Sync campaigns from Naver Search Ads for a specific ad account.

- **Authentication:** Yes (session required)
- **Content-Type:** `application/json`

**Request Body:**

| Field         | Type     | Required | Description               |
| ------------- | -------- | -------- | ------------------------- |
| `adAccountId` | `string` | Yes      | Internal ad account UUID  |

**Success Response (200):**

```json
{
  "synced": 8,
  "total": 8,
  "adAccountId": "uuid-string"
}
```

**Error Responses:**

| Status | Error Code               | Condition                          |
| ------ | ------------------------ | ---------------------------------- |
| 401    | --                       | Not authenticated                  |
| 400    | --                       | Missing `adAccountId` or wrong platform |
| 404    | --                       | Ad account not found               |
| 502    | `EXTERNAL_SERVICE_ERROR` | Naver API failure                  |

---

### 10. Dashboard

#### `GET /api/dashboard/overview`

Get the dashboard overview with aggregated KPIs for the organization.

- **Authentication:** Yes (session required, must belong to an organization)
- **Query Parameters:**

| Parameter   | Type       | Required | Default     | Description                                      |
| ----------- | ---------- | -------- | ----------- | ------------------------------------------------ |
| `startDate` | `string`   | No       | 30 days ago | Start date (ISO 8601)                            |
| `endDate`   | `string`   | No       | Today       | End date (ISO 8601)                              |
| `platform`  | `Platform` | No       | All         | Filter by platform: `META`, `GOOGLE`, `TIKTOK`, `NAVER` |

**Success Response (200):**

```json
{
  "totalSpend": 15000.50,
  "totalRevenue": 45000.00,
  "totalImpressions": 1500000,
  "totalClicks": 75000,
  "totalConversions": 3000,
  "averageCTR": 5.0,
  "averageCPC": 0.20,
  "averageCPM": 10.00,
  "averageCVR": 4.0,
  "averageCPA": 5.00,
  "averageROAS": 3.0,
  "averageROI": 200.0,
  "totalProfit": 30000.00,
  "dailyTrend": [
    {
      "date": "2026-01-10",
      "spend": 500.00,
      "revenue": 1500.00,
      "impressions": 50000,
      "clicks": 2500,
      "conversions": 100
    }
  ],
  "platformBreakdown": [
    {
      "platform": "META",
      "spend": 10000.00,
      "revenue": 30000.00,
      "impressions": 1000000,
      "clicks": 50000,
      "conversions": 2000
    }
  ]
}
```

**Error Responses:**

| Status | Error Code     | Condition                       |
| ------ | -------------- | ------------------------------- |
| 401    | --             | Not authenticated               |
| 400    | --             | No organization or invalid date |

---

#### `GET /api/dashboard/campaigns`

Get campaign-level performance data for the organization.

- **Authentication:** Yes (session required, must belong to an organization)
- **Query Parameters:**

| Parameter   | Type       | Required | Default     | Description                                      |
| ----------- | ---------- | -------- | ----------- | ------------------------------------------------ |
| `startDate` | `string`   | No       | 30 days ago | Start date (ISO 8601)                            |
| `endDate`   | `string`   | No       | Today       | End date (ISO 8601)                              |
| `platform`  | `Platform` | No       | All         | Filter by platform: `META`, `GOOGLE`, `TIKTOK`, `NAVER` |

**Success Response (200):**

```json
[
  {
    "campaignId": "uuid-string",
    "campaignName": "Summer Sale Campaign",
    "platform": "META",
    "status": "ACTIVE",
    "spend": 5000.00,
    "revenue": 15000.00,
    "impressions": 500000,
    "clicks": 25000,
    "conversions": 1000,
    "ctr": 5.0,
    "cpc": 0.20,
    "cpm": 10.00,
    "cvr": 4.0,
    "cpa": 5.00,
    "roas": 3.0,
    "roi": 200.0,
    "profit": 10000.00
  }
]
```

**Error Responses:**

| Status | Error Code     | Condition                       |
| ------ | -------------- | ------------------------------- |
| 401    | --             | Not authenticated               |
| 400    | --             | No organization or invalid date |

---

### 11. Ad Accounts

#### `GET /api/accounts`

List all ad accounts for a given organization, optionally filtered by platform.

- **Authentication:** No (but requires `organizationId` query parameter)
- **Query Parameters:**

| Parameter        | Type       | Required | Description                       |
| ---------------- | ---------- | -------- | --------------------------------- |
| `organizationId` | `string`   | Yes      | Organization UUID                 |
| `platform`       | `Platform` | No       | Filter by platform                |

**Success Response (200):**

```json
{
  "accounts": [
    {
      "id": "uuid-string",
      "platform": "META",
      "accountId": "act_123456789",
      "accountName": "My Meta Ad Account",
      "isActive": true,
      "tokenExpiresAt": "2026-03-10T12:00:00.000Z",
      "createdAt": "2026-02-10T12:00:00.000Z",
      "updatedAt": "2026-02-10T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

**Error Responses:**

| Status | Error Code | Condition                    |
| ------ | ---------- | ---------------------------- |
| 400    | --         | Missing `organizationId`     |

---

### 12. Billing

#### `POST /api/billing/checkout`

Create a Stripe Checkout session for plan subscription.

- **Authentication:** Yes (session required, must belong to an organization)
- **Content-Type:** `application/json`

**Request Body:**

| Field        | Type     | Required | Description                                        |
| ------------ | -------- | -------- | -------------------------------------------------- |
| `plan`       | `Plan`   | Yes      | Target plan: `FREE`, `STARTER`, `PRO`, `ENTERPRISE` |
| `successUrl` | `string` | Yes      | URL to redirect after successful checkout          |
| `cancelUrl`  | `string` | Yes      | URL to redirect if checkout is cancelled           |

**Success Response (200):**

```json
{
  "sessionId": "cs_live_...",
  "url": "https://checkout.stripe.com/c/pay/cs_live_..."
}
```

**Error Responses:**

| Status | Error Code               | Condition                       |
| ------ | ------------------------ | ------------------------------- |
| 401    | --                       | Not authenticated               |
| 400    | --                       | Missing fields or invalid plan  |
| 404    | `NOT_FOUND`              | User or organization not found  |
| 502    | `EXTERNAL_SERVICE_ERROR` | Stripe API failure              |

---

#### `POST /api/billing/portal`

Create a Stripe Customer Portal session for subscription management.

- **Authentication:** Yes (session required, must belong to an organization)
- **Content-Type:** `application/json`

**Request Body:**

| Field       | Type     | Required | Description                             |
| ----------- | -------- | -------- | --------------------------------------- |
| `returnUrl` | `string` | Yes      | URL to redirect after leaving the portal |

**Success Response (200):**

```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

**Error Responses:**

| Status | Error Code               | Condition                      |
| ------ | ------------------------ | ------------------------------ |
| 401    | --                       | Not authenticated              |
| 400    | --                       | Missing `returnUrl` or no org  |
| 404    | `NOT_FOUND`              | User or organization not found |
| 502    | `EXTERNAL_SERVICE_ERROR` | Stripe API failure             |

---

#### `GET /api/billing/subscription`

Get the current subscription details for the organization.

- **Authentication:** Yes (session required, must belong to an organization)

**Success Response (200):**

```json
{
  "id": "uuid-string",
  "organizationId": "uuid-string",
  "plan": "PRO",
  "status": "ACTIVE",
  "stripeSubscriptionId": "sub_...",
  "currentPeriodStart": "2026-02-01T00:00:00.000Z",
  "currentPeriodEnd": "2026-03-01T00:00:00.000Z",
  "cancelAtPeriodEnd": false,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

If no subscription exists, the response may return the organization's default plan info:

```json
{
  "plan": "FREE",
  "status": "ACTIVE",
  "subscription": null
}
```

**Error Responses:**

| Status | Error Code     | Condition                      |
| ------ | -------------- | ------------------------------ |
| 401    | --             | Not authenticated              |
| 400    | --             | No organization found          |

---

#### `GET /api/billing/usage`

Get current plan usage metrics for the organization (ad accounts count, users count, etc.).

- **Authentication:** Yes (session required, must belong to an organization)

**Success Response (200):**

```json
{
  "plan": "STARTER",
  "limits": {
    "maxAdAccounts": 3,
    "maxUsers": 5,
    "dataRetentionDays": 90,
    "apiCallsPerDay": 1000,
    "allowedPlatforms": ["META", "GOOGLE"],
    "hasAutoSync": true,
    "hasExports": false
  },
  "usage": {
    "adAccountsCount": 2,
    "usersCount": 3,
    "platformsConnected": ["META"]
  }
}
```

**Error Responses:**

| Status | Error Code     | Condition                      |
| ------ | -------------- | ------------------------------ |
| 401    | --             | Not authenticated              |
| 400    | --             | No organization found          |

---

### 13. Webhooks

#### `POST /api/webhooks/stripe`

Handle Stripe webhook events (subscription lifecycle events).

- **Authentication:** Stripe signature verification (via `stripe-signature` header)
- **Content-Type:** Raw body (Stripe sends as `application/json` but must be read as text for signature verification)

**Headers:**

| Header             | Type     | Required | Description                     |
| ------------------ | -------- | -------- | ------------------------------- |
| `stripe-signature` | `string` | Yes      | Stripe webhook signature        |

**Handled Events:**
- `checkout.session.completed` - Subscription created after checkout
- `customer.subscription.updated` - Plan change, renewal, or payment status change
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Successful payment
- `invoice.payment_failed` - Failed payment

**Success Response (200):**

```json
{
  "received": true,
  "eventType": "checkout.session.completed",
  "processed": true
}
```

**Error Responses:**

| Status | Error Code               | Condition                                   |
| ------ | ------------------------ | ------------------------------------------- |
| 400    | --                       | Missing `stripe-signature` header           |
| 400    | `VALIDATION_ERROR`       | Invalid webhook signature                   |
| 502    | `EXTERNAL_SERVICE_ERROR` | Stripe signature verification failure       |

---

### 14. Cron Jobs

Cron endpoints are protected by a shared secret (`CRON_SECRET` environment variable) passed as a Bearer token in the `Authorization` header.

#### `POST /api/cron/sync-all`

Trigger a full sync across all platforms for all eligible organizations. Respects plan limits (skips organizations on the FREE plan that do not have auto-sync enabled).

- **Authentication:** Bearer token (`Authorization: Bearer <CRON_SECRET>`)
- **Content-Type:** `application/json` (empty body is acceptable)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Sync completed for all platforms",
  "timestamp": "2026-02-10T12:00:00.000Z",
  "platforms": {
    "META": { "synced": true },
    "GOOGLE": { "synced": false, "reason": "Not yet implemented" },
    "TIKTOK": { "synced": false, "reason": "Not yet implemented" },
    "NAVER": { "synced": false, "reason": "Not yet implemented" }
  },
  "results": [
    {
      "platform": "META",
      "organizationId": "uuid-string",
      "organizationName": "My Company",
      "totalAccounts": 2,
      "synced": 2,
      "errors": 0
    }
  ]
}
```

**Error Responses:**

| Status | Error Code | Condition                        |
| ------ | ---------- | -------------------------------- |
| 401    | --         | Missing or invalid CRON_SECRET   |
| 500    | --         | CRON_SECRET not configured       |

---

#### `POST /api/cron/sync-meta`

Trigger a Meta-only sync for all organizations.

- **Authentication:** Bearer token (`Authorization: Bearer <CRON_SECRET>`)
- **Content-Type:** `application/json` (empty body is acceptable)

**Success Response (200):**

```json
{
  "success": true,
  "timestamp": "2026-02-10T12:00:00.000Z",
  "results": [
    {
      "organizationId": "uuid-string",
      "organizationName": "My Company",
      "totalAccounts": 2,
      "synced": 2,
      "errors": 0
    }
  ]
}
```

**Error Responses:**

| Status | Error Code | Condition                        |
| ------ | ---------- | -------------------------------- |
| 401    | --         | Missing or invalid CRON_SECRET   |
| 500    | --         | CRON_SECRET not configured       |

---

## Plan Limits Reference

Each subscription plan enforces different resource limits:

| Feature              | FREE          | STARTER          | PRO                    | ENTERPRISE     |
| -------------------- | ------------- | ---------------- | ---------------------- | -------------- |
| Max Ad Accounts      | 1             | 3                | 10                     | Unlimited      |
| Max Users            | 2             | 5                | 20                     | Unlimited      |
| Data Retention       | 30 days       | 90 days          | 365 days               | Unlimited      |
| API Calls/Day        | 100           | 1,000            | 10,000                 | Unlimited      |
| Allowed Platforms    | META          | META, GOOGLE     | META, GOOGLE, TIKTOK   | All            |
| Auto Sync            | No            | Yes              | Yes                    | Yes            |
| Data Exports         | No            | No               | Yes                    | Yes            |

When a plan limit is exceeded, the API returns a `403` status with error code `PLAN_LIMIT_EXCEEDED`.

---

## Rate Limiting

Rate limiting is enforced based on the organization's plan tier via the `apiCallsPerDay` limit. Exceeding the daily API call quota results in a `PLAN_LIMIT_EXCEEDED` error.

---

## Common Patterns

### Date Parameters

All date parameters accept ISO 8601 format strings:
- Full datetime: `2026-02-10T12:00:00.000Z`
- Date only: `2026-02-10`

### Pagination

Currently, most list endpoints return all results. Pagination parameters may be added in future versions.

### Platform Filtering

Dashboard and account listing endpoints support optional `platform` query parameter filtering with values: `META`, `GOOGLE`, `TIKTOK`, `NAVER`, `KAKAO`.

### Token Encryption

All OAuth tokens and API keys are encrypted using AES-256-GCM before being stored in the database. Tokens are decrypted only when needed for API calls to external services.
