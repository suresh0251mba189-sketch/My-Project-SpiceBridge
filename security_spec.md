# SpiceBridge Firestore Security Specification

## 1. Data Invariants
1. Every document lives under `/workspaces/{workspaceId}`, where `workspaceId == request.auth.uid` and `request.auth != null`.
2. Every subcollection document (`farmer_lots`, `lots`, `micro_hub_batches`, `batches`, `traceability_passports`, `passports`, `mill_orders`, `orders`, `strategy_state`, `strategyState`) enforces Master Gate ownership by verifying `get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.ownerId == request.auth.uid` on writes and `existing().ownerId == request.auth.uid` on `list` queries (paired with client `where('ownerId', '==', uid)` filters).
3. Reading (`get`) non-existent workspace or subcollection docs as the authenticated owner (`workspaceId == request.auth.uid && resource == null`) safely returns not-found instead of throwing a null-pointer permission error.
4. Document IDs (`workspaceId`, `lotId`, `batchId`, `passportId`, `orderId`, `stateId`) must match `^[a-zA-Z0-9_-]+$` and length `<= 128`.
5. All timestamps (`createdAt`, `updatedAt`, `created_at`, `updated_at`) must equal `request.time` on write (`serverTimestamp()`).
6. Immutable identifiers (`ownerId`, `lot_id`, `batch_id`, `passport_id`, `order_id`, `createdAt`, `created_at`) cannot be altered on update.
7. String fields enforce explicit `.size()` bounds and arrays enforce bounded `.size()` limits (`source_lot_ids.size() <= 50`, `competitors_list.size() <= 6`).
8. Terminal settlement status (`settlement_status == 'settled'`) locks `mill_orders` / `orders` against further mutation.

## 2. Dirty Dozen Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Any operation with `request.auth == null`.
2. **Cross-Workspace Read/Write**: User A attempting to read or write `/workspaces/userB/...`.
3. **Identity Spoofing**: Creating a `farmer_lots` or `lots` doc with `ownerId: "victim-uid"` inside `/workspaces/userA/...`.
4. **Shadow / Ghost Field Injection**: Adding `isAdmin: true` or `bypassAudit: true` to any payload (`keys().hasOnly(...)` blocks it).
5. **ID Poisoning**: Writing to `/workspaces/uid/farmer_lots/../../evil` or 200-char invalid ID (`isValidId()` blocks it).
6. **Resource Exhaustion (1MB String)**: Injecting a 10,000-character `farmer_name` or `qr_payload` (`.size()` checks block it).
7. **Unbounded Array**: Creating `micro_hub_batches` with 51+ `source_lot_ids` or `strategy_state` with 7+ `competitors_list`.
8. **Client Timestamp Forgery**: Sending `updated_at: "2020-01-01T00:00:00Z"` instead of `request.time` (`serverTimestamp()`).
9. **Immutable Field Overwrite**: Attempting to mutate `created_at` or `ownerId` during `update`.
10. **Terminal State Bypass**: Attempting to revert a `settled` mill order back to `invoiced_14d`.
11. **Blanket List Scraping**: Attempting to list `/workspaces` root or another user's subcollections without `workspaceId == request.auth.uid` and `resource.data.ownerId == request.auth.uid`.
12. **Subcollection Orphan Write**: Attempting to write into a subcollection when the parent workspace root does not exist or belongs to another UID.
