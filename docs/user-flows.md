# GebeyaLink — User Flows

**Version:** 1.1
**Status:** Final
**Scope:** MVP

---

## 1. Core Flow

The canonical GebeyaLink flow is:

```text
Farmer
  ↓
Collection Agent
  ↓
Farmer Delivery
  ↓
Weight & Quality Verification
  ↓
Accepted Quantity
  ↓
Cooperative Inventory
  ↓
Marketplace Listing
  ↓
Buyer
  ↓
Order
  ↓
Cooperative Acceptance
  ↓
Buyer Payment
  ↓
Transportation
  ↓
Pickup
  ↓
Delivery
  ↓
Buyer Confirmation
  ↓
Completed Transaction
```

The farmer is a **business participant**, not a platform user.

---

# 2. Authentication Flows

## 2.1 Platform Users

The following users can authenticate:

* Cooperative Staff
* Collection Agent
* Buyer
* Transporter
* GebeyaLink Admin

## 2.2 Farmer

Farmers do not authenticate in MVP.

Farmers do not need:

* a GebeyaLink account
* smartphone
* internet connection
* email address
* marketplace access

The Collection Agent records farmer information on the farmer's behalf.

---

# 3. Cooperative Onboarding Flow

**Actor:** GebeyaLink Admin + Cooperative Staff

```text
Cooperative submits registration
        ↓
Admin reviews information
        ↓
Admin verifies cooperative
        ↓
Cooperative approved
        ↓
Cooperative staff can access platform
```

If verification fails:

```text
Registration
    ↓
Rejected / Requires Correction
    ↓
Cooperative updates information
    ↓
Admin reviews again
```

---

# 4. Collection Agent Flow

**Actor:** Cooperative Staff / Collection Agent

A collection agent is associated with a cooperative and collection center.

```text
Agent logs in
    ↓
Selects collection center
    ↓
Ready for farmer deliveries
```

---

# 5. Farmer Identification Flow

**Actor:** Collection Agent

```text
Farmer arrives
    ↓
Agent searches farmer
    ↓
Farmer found?
   / \
 Yes  No
 |     |
Select  Create farmer record
   \   /
    Continue
       ↓
Record delivery
```

Creating a farmer record does **not** create a user account.

---

# 6. New Farmer Record Flow

**Actor:** Collection Agent

1. Agent selects **Add Farmer**.
2. Agent enters required farmer information.
3. Agent associates farmer with the cooperative.
4. Agent saves the farmer record.
5. System returns to the delivery process.

The farmer remains a business record only.

---

# 7. Farmer Delivery Flow

**Actor:** Collection Agent

1. Identify farmer.
2. Select collection center.
3. Select commodity/product.
4. Record claimed quantity if applicable.
5. Weigh product.
6. Record measured quantity.
7. Inspect product.
8. Assign quality grade:

   * Grade A
   * Grade B
   * Grade C
   * Rejected
9. Record accepted quantity.
10. Save delivery.

Example:

```text
Claimed:       1,200 kg
Measured:      1,150 kg
Accepted:      1,100 kg
Rejected:         50 kg
```

Only the accepted quantity can become cooperative inventory.

---

# 8. Offline Delivery Flow

Collection centers are **offline-first**.

```text
Agent records delivery
        ↓
Internet available?
     /       \
   Yes        No
    |          |
Sync normally  Save locally
    |          |
    |      Pending Sync
    |          |
    |      Connection returns
    |          |
    └──────→ Automatic Sync
                 ↓
          Central Validation
```

---

# 9. Failed Synchronization Flow

If synchronization fails:

```text
Local Record
     ↓
Sync Attempt
     ↓
Failed
     ↓
Keep Local Record
     ↓
Automatic Retry
     ↓
Successful Sync
```

The delivery record must not be lost because of network failure.

---

# 10. Offline Duplicate/Conflict Flow

When an offline record reaches the central system:

```text
Synchronize
    ↓
Duplicate / Conflict Check
    ↓
 ┌──────────────┐
 │              │
No Conflict   Conflict
 │              │
 ↓              ↓
Confirm       Flag
 │              │
 ↓              ↓
Inventory     Staff Review
Eligible
```

A suspicious record must not create duplicate sellable inventory.

---

# 11. Inventory Creation Flow

**Actor:** Central System / Authorized Cooperative Staff

```text
Farmer Delivery
      ↓
Weight Verification
      ↓
Quality Verification
      ↓
Accepted Quantity
      ↓
Central Confirmation
      ↓
Cooperative Inventory
```

Offline records cannot directly create marketplace inventory.

---

# 12. Marketplace Listing Flow

**Actor:** Cooperative Staff

1. Select available inventory.
2. Select product.
3. Select quality grade.
4. Specify quantity.
5. Set selling price.
6. System validates available inventory.
7. System validates minimum order quantity.
8. Cooperative publishes listing.

The marketplace displays the cooperative as seller.

---

# 13. Buyer Marketplace Flow

**Actor:** Verified Buyer

1. Buyer logs in.
2. Buyer searches marketplace.
3. Buyer filters supply.
4. Buyer opens listing.
5. Buyer reviews:

   * cooperative
   * product
   * grade
   * quantity
   * price
   * location
   * availability
6. Buyer selects quantity.
7. System validates quantity.
8. Buyer reviews order.
9. Buyer places order.

---

# 14. Order Reservation Flow

When the buyer places an order:

```text
Available Inventory
        ↓
     Reserved
        ↓
Pending Cooperative Acceptance
```

The reservation prevents the same inventory from being sold to another buyer.

---

# 15. Cooperative Order Review

**Actor:** Cooperative

The cooperative has **24 hours** to respond.

```text
New Order
    ↓
Cooperative Reviews
    ↓
 ┌───────────────┐
 │               │
 Accept        Reject
 │               │
 ↓               ↓
Committed      Release
Inventory      Reservation
```

---

# 16. Order Acceptance Flow

After acceptance:

```text
Order Accepted
      ↓
Inventory Committed
      ↓
Commercial Commitment Locked
      ↓
Buyer Payment
```

Quantity and displayed product price become fixed for that order.

---

# 17. Order Rejection Flow

1. Cooperative selects reject.
2. Cooperative selects rejection reason.
3. Optional explanation is recorded.
4. Order becomes rejected.
5. Reserved inventory is released.
6. Inventory becomes available again.
7. Buyer is notified.

---

# 18. Order Expiration Flow

If the cooperative does not respond within 24 hours:

```text
Pending Acceptance
       ↓
24 Hours Expired
       ↓
Order Expired
       ↓
Reservation Released
       ↓
Inventory Available
```

---

# 19. Buyer Cancellation Flow

### Before acceptance

Buyer may cancel.

```text
Pending Acceptance
       ↓
Cancelled
       ↓
Reservation Released
```

### After acceptance

Normal buyer cancellation is not permitted.

Exceptional cancellation follows the approved exception process.

---

# 20. Payment Flow

**Actor:** Buyer + Cooperative

```text
Order Accepted
      ↓
Payment Pending
      ↓
Buyer Pays Cooperative
      ↓
Payment Confirmed
      ↓
Fulfillment Can Continue
```

GebeyaLink records payment status but does not hold buyer funds.

Full product payment is required before normal pickup.

---

# 21. Transportation Flow

**Actor:** Cooperative

1. Payment is confirmed.
2. Cooperative arranges transportation.
3. Cooperative selects an approved GebeyaLink transporter or external transporter.
4. Transport information is recorded.
5. Pickup information is recorded.
6. Buyer receives shipment information.

Transportation cost is separate from product price.

---

# 22. Pickup Flow

**Actors:** Cooperative + Transporter

```text
Transporter Arrives
       ↓
Cooperative Hands Over Goods
       ↓
Cooperative Confirms Handover
       ↓
Transporter Confirms Receipt
       ↓
Pickup Confirmed
       ↓
Shipment In Transit
```

Both cooperative and transporter confirm pickup.

---

# 23. Delivery Flow

**Actors:** Transporter + Buyer

```text
Transporter
    ↓
Delivers Goods
    ↓
Buyer Inspects Goods
    ↓
 ┌───────────────┐
 │               │
 Confirm       Problem
 │               │
 ↓               ↓
Completed      Dispute
```

---

# 24. Quantity Discrepancy Flow

Example:

```text
Ordered:    3,000 kg
Delivered:  2,850 kg
```

The system does not silently change the order.

```text
Buyer Reports Difference
        ↓
Record Ordered Quantity
        ↓
Record Delivered Quantity
        ↓
Collect Explanation/Evidence
        ↓
Cooperative Responds
        ↓
GebeyaLink Reviews
        ↓
Resolution
```

---

# 25. Quality Dispute Flow

Buyer can report:

* wrong grade
* damaged goods
* contamination
* material quality mismatch
* other quality issue

Flow:

```text
Buyer Reports Issue
       ↓
Cooperative Responds
       ↓
GebeyaLink Reviews
       ↓
Resolution Recorded
```

---

# 26. Transaction Completion Flow

A transaction normally completes when:

* order was accepted
* payment was confirmed
* goods were picked up
* goods were delivered
* buyer confirmed delivery
* there is no unresolved blocking dispute

```text
Delivered
   ↓
Buyer Confirms
   ↓
Completed
```

---

# 27. Farmer History Flow

There is no farmer login.

Authorized cooperative staff can:

1. Search farmer.
2. Open farmer record.
3. View delivery history.
4. View:

   * dates
   * products
   * claimed quantities
   * measured quantities
   * accepted quantities
   * rejected quantities
   * quality grades
   * collection centers

---

# 28. Farmer Receipt Flow

After a delivery is recorded:

1. System generates delivery reference.
2. Collection agent provides the farmer with a physical receipt/reference where applicable.
3. Farmer leaves the collection center.

Digital farmer notifications are not required for MVP.

---

# 29. Inventory Adjustment Flow

**Actor:** Authorized Cooperative Staff

If physical inventory changes:

```text
Inventory Adjustment
       ↓
Select Reason
       ↓
Enter Quantity
       ↓
Record Adjustment
       ↓
Update Available Inventory
```

Adjustment history is retained.

Reserved or committed inventory cannot be silently removed.

---

# 30. Multi-Cooperative Purchase Flow

If a buyer needs products from multiple cooperatives:

```text
Buyer Requirement
      ↓
Cooperative A → Order A
Cooperative B → Order B
```

Each cooperative has a separate order, payment, fulfillment, transportation, and dispute relationship.

---

# 31. Notification Flow

Important events generate notifications.

### Buyer

* order placed
* order accepted/rejected
* payment status
* pickup/shipment updates
* delivery
* dispute updates

### Cooperative

* new order
* acceptance deadline
* payment confirmation
* pickup
* delivery
* dispute

Notifications are not required for every internal event.

---

# 32. End-to-End Happy Path

```text
Farmer delivers
      ↓
Collection Agent identifies farmer
      ↓
Agent records delivery
      ↓
Weight + quality recorded
      ↓
Accepted quantity confirmed
      ↓
Inventory created
      ↓
Cooperative lists inventory
      ↓
Buyer places order
      ↓
Inventory reserved
      ↓
Cooperative accepts within 24h
      ↓
Inventory committed
      ↓
Buyer pays cooperative
      ↓
Payment confirmed
      ↓
Cooperative arranges transport
      ↓
Pickup confirmed by cooperative + transporter
      ↓
Goods transported
      ↓
Buyer receives goods
      ↓
Buyer confirms delivery
      ↓
Transaction completed
```

---

# 33. Core Flow Invariants

The following rules apply throughout the flows:

1. Farmer does not need a platform account.
2. Collection Agent records farmer deliveries.
3. Farmer Delivery is not automatically Inventory.
4. Rejected quantity cannot become sellable inventory.
5. Offline records must synchronize before becoming inventory.
6. Duplicate/conflicting offline records require review.
7. Reserved inventory cannot be sold elsewhere.
8. Cooperative has 24 hours to accept/reject.
9. Accepted orders are commercially committed.
10. No silent partial fulfillment.
11. One order belongs to one cooperative.
12. Buyer pays cooperative directly.
13. Full payment is required before normal pickup.
14. Cooperative arranges transportation.
15. Pickup requires cooperative and transporter confirmation.
16. Buyer confirms delivery.
17. Quantity/quality problems become disputes.
18. Buyer sees the cooperative, not individual farmers.
19. Farmer information remains internal.
20. Transaction history is auditable.
