# API Keys Management

This feature allows organizations to create and manage API keys for integrating AATX with external tools and services.

## Features

- Create API keys with specific permissions
- List all API keys for an organization
- Revoke API keys when no longer needed
- Automatic expiration of API keys

## API Key Permissions

API keys can have granular permissions for different resources:

- **Tracking Plans**
  - `read`: View tracking plans
  - `validate`: Validate tracking code against plans
  - `update`: Update tracking plans with new events

- **Repositories**
  - `read`: View repositories
  - `scan`: Scan repositories for tracking code

## Database Schema

API keys are stored in the `api_keys` table with the following structure:

- `id`: UUID primary key
- `name`: User-defined name for the key
- `key_prefix`: First few characters of the key (for display)
- `key_hash`: Hashed value of the full key (for security)
- `org_id`: Foreign key to organizations table
- `created_by`: Foreign key to users table
- `created_at`: Timestamp of creation
- `last_used_at`: Timestamp of last use
- `expires_at`: Expiration timestamp
- `revoked_at`: Revocation timestamp (if revoked)
- `permissions`: JSON object with permissions

## API Endpoints

### List API Keys

```
GET /api/api-keys
```

Returns all active API keys for the current organization.

### Create API Key

```
POST /api/api-keys
```

Request body:
```json
{
  "name": "GitHub Action Key",
  "expiresInDays": 365,
  "permissions": {
    "trackingPlans": {
      "read": true,
      "validate": true,
      "update": false
    },
    "repositories": {
      "read": true,
      "scan": true
    }
  }
}
```

Returns the newly created API key (full key is only returned once).

### Revoke API Key

```
POST /api/api-keys/{id}/revoke
```

Revokes an API key so it can no longer be used.

## Authentication with API Keys

API keys can be used to authenticate requests to specific endpoints. Include the API key in the `Authorization` header using one of these formats:

```
Authorization: Bearer aatx_gh_xxxx...
```

or

```
Authorization: aatx_gh_xxxx...
```

## Security Considerations

- API keys are stored as hashed values in the database
- Full API keys are only displayed once when created
- API keys have expiration dates to limit exposure
- API keys can be revoked at any time
- Row-level security ensures keys can only be managed by organization admins
