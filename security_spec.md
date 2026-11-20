# SpiceBridge Firestore Security Specification

## 1. Data Invariants
1. Every document lives under `/workspaces/{workspaceId}`, where `workspaceId == request.auth.uid` and `request.auth.token.email_verified == true`.
2. Every subcollection document (`farmer_lots`, `micro_hub_batches`, `traceability_passports`, `mill_orders`, `strategy_state`) enforces Master Gate ownership by verifying `get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.ownerId == request.auth.uid` and `incoming().ownerId == request.auth.uid`.
3. Document IDs (`workspaceId`, `lotId`, `batchId`, `passportId`, `orderId`, `stateId`) must match `^[a-zA-Z0-9_-]+$` and length `<= 128`.
4. All timestamps (`createdAt`, `updatedAt`, `created_at`, `updated_at`) must equal `request.time` on write (`serverTimestamp()`).
5. Immutable identifiers (`ownerId`, `lot_id`, `batch_id`, `passport_id`, `order_id`, `createdAt`, `created_at`) cannot be altered on update.
6. String fields enforce explicit `.size()` bounds and arrays enforce bounded `.size()` limits (`source_lot_ids.size() <= 50`, `competitors_list.size() <= 6`).
7. Terminal settlement status (`settlement_status == 'settled'`) locks `mill_orders` against further mutation.

## 2. Dirty Dozen Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Any operation with `request.auth == null`.
2. **Unverified Email**: Write with `request.auth.token.email_verified == false`.
3. **Cross-Workspace Read/Write**: User A attempting to read or write `/workspaces/userB/...`.
4. **Identity Spoofing**: Creating a `farmer_lots` doc with `ownerId: "victim-uid"` inside `/workspaces/userA/farmer_lots/SB-101`.
5. **Shadow / Ghost Field Injection**: Adding `isAdmin: true` or `bypassAudit: true` to a `farmer_lots` payload (`keys().hasOnly(...)` blocks it).
6. **ID Poisoning**: Writing to `/workspaces/uid/farmer_lots/../../evil` or 200-char invalid ID (`isValidId()` blocks it).
7. **Resource Exhaustion (1MB String)**: Injecting a 10,000-character `farmer_name` or `qr_payload` (`.size()` checks block it).
8. **Unbounded Array**: Creating `micro_hub_batches` with 51+ `source_lot_ids` or `strategy_state` with 7+ `competitors_list`.
9. **Client Timestamp Forgery**: Sending `updated_at: "2020-01-01T00:00:00Z"` instead of `request.time` (`serverTimestamp()`).
10. **Immutable Field Overwrite**: Attempting to mutate `created_at` or `ownerId` during `update`.
11. **Terminal State Bypass**: Attempting to revert a `settled` mill order back to `invoiced_14d`.
12. **Blanket List Scraping**: Attempting to list `/workspaces` root or another user's subcollections without `workspaceId == request.auth.uid` and `resource.data.ownerId == request.auth.uid`.
