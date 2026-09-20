# Security Specification for Multi-Agent Orchestrator

This document outlines the security invariants, payload validation cases, and test scenarios designed to prevent unauthorized access, state shortcuts, and resource poisoning for the `saved_results` collection.

## 1. Data Invariants

1. **Owner Exclusivity (Identity)**: A saved result document inside `/saved_results/{resultId}` must belong exclusively to the authenticated user who created it (`userId == request.auth.uid`). No other user can read, update, or delete this document.
2. **Strict Structure (Integrity)**: Every doc in `/saved_results` must contain all required fields: `id`, `title`, `agentId`, `agentName`, `prompt`, `result`, `savedAt`, and `userId`.
3. **Immutability**:
   - `id`, `userId`, `savedAt`, and `agentId` are immutable once the document is created.
4. **Data Verification**:
   - The owner's email must be verified (`request.auth.token.email_verified == true`) for writes, as standard under hardened security rules.
   - Text fields must have strict size limits to prevent "Denial of Wallet" or storage pollution. For example, `title`, `prompt` and `result` must be capped.

---

## 2. The "Dirty Dozen" Payloads

These payloads represent attempts to bypass the security rules. All must be rejected with `PERMISSION_DENIED`.

### Payload 1: Identity Spoofing (Save for another user)
```json
{
  "id": "res_123",
  "title": "My Task Output",
  "agentId": "writer",
  "agentName": "Redator Sênior",
  "prompt": "Write a blog post",
  "result": "Some content",
  "savedAt": "SERVER_TIMESTAMP",
  "userId": "other_malicious_user_id"
}
```
*Expected Result: PERMISSION_DENIED (userId must match request.auth.uid)*

### Payload 2: Anonymous write on authentication-mandatory path
An unauthenticated request trying to write to `/saved_results/res_123`.
*Expected Result: PERMISSION_DENIED (Must be signed in)*

### Payload 3: Email Not Verified
An authenticated user with `email_verified == false` trying to create a document.
*Expected Result: PERMISSION_DENIED (email_verified must be true)*

### Payload 4: Invalid Identifier Poisoning
Attempting to create a document with a non-alphanumeric `resultId` (e.g. injected path characters `/saved_results/nested/doc/path`).
*Expected Result: PERMISSION_DENIED (Document ID must match alphanumeric regex)*

### Payload 5: Shadow Fields / Injection of Ghost Keys
Adding unmapped fields like `"isAdmin": true` or `"verifiedByAgent": true` on document creation or update.
```json
{
  "id": "res_123",
  "title": "My Task Output",
  "agentId": "writer",
  "agentName": "Redator Sênior",
  "prompt": "Write a blog post",
  "result": "Some content",
  "savedAt": "SERVER_TIMESTAMP",
  "userId": "current_user_uid",
  "isAdmin": true
}
```
*Expected Result: PERMISSION_DENIED (Strict key validation hasOnly or size constraint)*

### Payload 6: Modifying Immutable Creator Field on Update
An authenticated owner trying to change the `userId` of an existing document to a different user.
```json
{
  "userId": "some_other_uid"
}
```
*Expected Result: PERMISSION_DENIED (userId is immutable)*

### Payload 7: Modifying Immutable Timestamp field
Attempting to change `savedAt` during an update.
```json
{
  "savedAt": "2030-01-01T00:00:00Z"
}
```
*Expected Result: PERMISSION_DENIED (savedAt is immutable)*

### Payload 8: Deny of Wallet - Oversized String Inject
Attempting to inject an excessively large title (e.g., > 10,000 characters) or prompt.
*Expected Result: PERMISSION_DENIED (Bounds verification: title.size() <= 200)*

### Payload 9: Invalid Data Types
Sending `title` as a Boolean or list instead of string.
```json
{
  "title": true
}
```
*Expected Result: PERMISSION_DENIED (Schema Validation rules: title is string)*

### Payload 10: Non-owner Read (Get) Attempt
User B attempting to read a document created by User A.
*Expected Result: PERMISSION_DENIED (Read restricted to owner)*

### Payload 11: Bulk Unbounded Collection Queries without Owner filter (List Scraping)
Attempting to query `/saved_results` without filtering by `userId == request.auth.uid`.
*Expected Result: PERMISSION_DENIED (Query enforcer checks)*

### Payload 12: Malicious Deletion of Other User's Item
User B attempting to delete `/saved_results/res_123` owned by User A.
*Expected Result: PERMISSION_DENIED (Delete restricted to owner)*

---

## 3. Test Cases (TDD Rules Validation)

These scenarios can be validated against the security rules to ensure zero-trust compliance.
- Every write must start with static type validations.
- Every read/list requires owner identification.
