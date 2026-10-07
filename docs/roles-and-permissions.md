# GebeyaLink — Roles and Permissions

**Version:** 1.0
**Status:** Final
**Scope:** MVP

---

# 1. Permission Model

GebeyaLink has two different concepts:

### Business participant

A person or organization involved in the agricultural transaction.

### Platform user

A person who authenticates into GebeyaLink and performs actions.

A farmer is a **business participant**, but not a platform user in MVP.

---

# 2. Platform Roles

The MVP platform roles are:

1. **GebeyaLink Admin**
2. **Cooperative Staff**
3. **Collection Agent**
4. **Buyer**
5. **Transporter**

---

# 3. Farmer

## Platform Account

**No**

## Authentication

**No**

## Direct Platform Access

**No**

## Responsibilities

The farmer:

* delivers agricultural products
* provides identifying information
* receives delivery information/receipt through the collection center

## System Representation

The farmer exists as a business record containing relevant supply/delivery history.

The farmer does not:

* log in
* create listings
* place marketplace orders
* accept orders
* manage inventory
* manage shipments
* manage disputes through the platform

---

# 4. GebeyaLink Admin

## Scope

Platform-wide administration and oversight.

## Can

### User/Organization Management

* view platform users
* manage platform access
* verify cooperatives
* verify buyers
* manage transporter approval

### Transaction Oversight

* view orders
* view payments
* view shipments
* view deliveries
* view disputes

### Disputes

* review disputes
* review evidence
* coordinate resolution
* record dispute resolution

### Monitoring

* view operational activity
* view audit records
* monitor exceptions
* review suspicious/conflicting records

## Cannot

* act as a farmer
* create farmer deliveries as normal collection activity
* change completed transaction history without an auditable administrative action
* silently change business records

---

# 5. Cooperative Staff

## Scope

Manage the cooperative's agricultural supply and commercial transactions.

## Can

### Cooperative

* view cooperative information
* manage authorized cooperative users
* view collection centers
* view cooperative farmers

### Farmers

* search farmers
* create farmer records
* view farmer delivery history
* update permitted farmer information

### Inventory

* view cooperative inventory
* view inventory lots
* create marketplace listings
* change eligible listing quantities
* change eligible listing prices
* pause listings
* remove eligible listings
* record authorized inventory adjustments

### Orders

* view cooperative orders
* review incoming orders
* accept orders
* reject orders
* provide rejection reasons
* view acceptance deadlines

### Payment

* view payment status
* record/confirm applicable payment information according to the platform's payment process

### Transportation

* arrange transportation
* select approved or external transporter
* record transport information
* record pickup information
* confirm cooperative-side pickup

### Disputes

* view disputes concerning cooperative transactions
* respond to disputes
* provide evidence
* participate in resolution

## Cannot

* access another cooperative's private data
* expose individual farmer information to buyers
* accept an order for another cooperative
* silently modify an accepted order
* silently modify completed transaction history

---

# 6. Collection Agent

## Scope

Operate a cooperative collection center and record agricultural deliveries.

## Can

### Farmer Records

* search farmer records
* create farmer records
* view relevant farmer information
* view farmer delivery history

### Collection

* create farmer deliveries
* record claimed quantity
* record measured quantity
* record product
* record quality grade
* record accepted quantity
* record rejected quantity
* issue/reference delivery records

### Offline Operations

* create delivery records while offline
* view pending synchronization records
* retry synchronization
* view synchronization status
* identify records requiring review

## Cannot

* create marketplace orders as a buyer
* accept buyer orders unless separately authorized as cooperative staff
* change marketplace prices unless separately authorized
* approve cooperative verification
* access another cooperative's records
* directly make farmer payments through GebeyaLink
* make offline records immediately sellable as inventory

---

# 7. Buyer

## Scope

Purchase agricultural products from verified cooperatives.

## Can

### Account

* manage own account
* submit required verification information
* view verification status

### Marketplace

* browse marketplace
* search listings
* filter listings
* view cooperative supply
* view product information
* view price
* view available quantity

### Orders

* create orders
* view own orders
* cancel eligible orders before cooperative acceptance
* view order status

### Payment

* view payment requirements
* submit/record payment according to the payment process
* view own payment status

### Delivery

* view shipment information
* view delivery information
* confirm delivery

### Disputes

* report quantity discrepancies
* report quality issues
* provide evidence
* view dispute status
* respond to dispute requests

## Cannot

* see individual farmer identities
* see farmer delivery histories
* see another buyer's orders
* change cooperative listings
* change order price after acceptance
* accept cooperative orders
* release cooperative inventory
* arrange transportation on behalf of the cooperative in the normal flow

---

# 8. Transporter

## Scope

Transport goods from cooperative to buyer.

## Can

### Transport

* view assigned/authorized shipments
* view pickup information
* view delivery information
* confirm receipt at pickup
* confirm pickup
* update shipment progress
* record delivery
* provide delivery evidence where applicable

### Delivery

* record delivery status
* identify failed delivery
* provide relevant delivery information

## Cannot

* change product price
* change order quantity
* accept/reject buyer orders
* release cooperative inventory
* confirm buyer acceptance
* resolve disputes
* access farmer private information unless operationally required

---

# 9. Permission Matrix

| Action                       | Admin | Cooperative Staff |        Collection Agent |       Buyer |          Transporter |
| ---------------------------- | ----: | ----------------: | ----------------------: | ----------: | -------------------: |
| Manage platform users        |     ✓ |                 — |                       — |           — |                    — |
| Verify cooperative           |     ✓ |                 — |                       — |           — |                    — |
| Verify buyer                 |     ✓ |                 — |                       — |           — |                    — |
| Manage transporter approval  |     ✓ |                 — |                       — |           — |                    — |
| Create farmer record         |    ✓* |                 ✓ |                       ✓ |           — |                    — |
| Search farmer                |    ✓* |                 ✓ |                       ✓ |           — |                    — |
| View farmer history          |    ✓* |                 ✓ |                       ✓ |           — |                    — |
| Record farmer delivery       |    ✓* |                 ✓ |                       ✓ |           — |                    — |
| Record weight                |    ✓* |                 ✓ |                       ✓ |           — |                    — |
| Record quality               |    ✓* |                 ✓ |                       ✓ |           — |                    — |
| Manage cooperative inventory |    ✓* |                 ✓ |                 Limited |           — |                    — |
| Create listing               |    ✓* |                 ✓ |                       — |           — |                    — |
| Change listing price         |    ✓* |                 ✓ |                       — |           — |                    — |
| Browse marketplace           |     ✓ |                 ✓ |                       ✓ |           ✓ |                    — |
| Place order                  |    ✓* |                 — |                       — |           ✓ |                    — |
| Accept order                 |    ✓* |                 ✓ |                       — |           — |                    — |
| Reject order                 |    ✓* |                 ✓ |                       — |           — |                    — |
| View order                   |     ✓ |   Own cooperative |                 Limited |  Own orders |   Assigned shipments |
| Cancel eligible order        |    ✓* |                 — |                       — |           ✓ |                    — |
| View payment status          |     ✓ |   Own cooperative |                       — |  Own orders |                    — |
| Arrange transportation       |    ✓* |                 ✓ |                       — |           — |                    — |
| Confirm cooperative pickup   |    ✓* |                 ✓ |                       — |           — |                    — |
| Confirm transporter pickup   |    ✓* |                 — |                       — |           — |                    ✓ |
| Update shipment              |    ✓* |                ✓* |                       — |           — |                    ✓ |
| Confirm delivery             |    ✓* |                 — |                       — |           ✓ |                   ✓* |
| Create dispute               |     ✓ |                ✓* |                       — |           ✓ |                   ✓* |
| Respond to dispute           |     ✓ |                 ✓ |                       — |           ✓ |                   ✓* |
| Resolve dispute              |     ✓ |                 — |                       — |           — |                    — |
| View audit records           |     ✓ |   Own cooperative | Own operational records | Own records | Own shipment records |

`*` = only where required for administration/oversight, not necessarily part of the normal operational flow.

---

# 10. Data Access Boundaries

## Farmer Data

Farmer information is visible only to authorized cooperative personnel and appropriate GebeyaLink administrators.

Buyers cannot see individual farmer information.

---

## Cooperative Data

Cooperative staff can access their own cooperative's:

* farmers
* collection records
* inventory
* listings
* orders
* payments
* shipments
* disputes

They cannot access another cooperative's private operational data.

---

## Buyer Data

A buyer can access its own:

* account
* orders
* payments
* shipments
* deliveries
* disputes

A buyer cannot access another buyer's information.

---

## Transporter Data

A transporter can access information necessary to perform assigned transportation and delivery operations.

---

# 11. Role Separation

The system must preserve the distinction between:

```text
Farmer
  = Business Participant
```

and:

```text
Collection Agent
  = Authenticated Platform User
```

A farmer record must never require authentication.

---

# 12. Cooperative Ownership Boundary

Cooperative users operate within their cooperative boundary.

A cooperative user cannot:

* manage another cooperative's inventory
* accept another cooperative's orders
* view another cooperative's private farmer data
* modify another cooperative's listings

---

# 13. Buyer Ownership Boundary

A buyer can manage only its own commercial activity.

A buyer cannot:

* modify another buyer's order
* access another buyer's payment information
* access another buyer's disputes
* modify cooperative inventory

---

# 14. Transporter Ownership Boundary

Transporters operate only on shipments assigned or made available to them.

They cannot modify the commercial terms of an order.

---

# 15. Administrative Boundary

GebeyaLink Admin has platform-wide oversight but administrative access must remain auditable.

Administrative access must not be used to silently alter transaction history.

---

# 16. MVP Authorization Principle

Every protected action must satisfy:

```text
Authenticated User
        +
Correct Role
        +
Correct Organization/Ownership Scope
        +
Valid Business State
        ↓
Action Allowed
```

Example:

A Collection Agent may have permission to record a farmer delivery, but only within the collection center/cooperative they are authorized to operate.

A Buyer may have permission to cancel an order, but only while that order is still eligible for cancellation.

---

# 17. Final Role Model

```text
GEBEYA LINK
│
├── Admin
│
├── Cooperative
│   ├── Cooperative Staff
│   └── Collection Agent
│
├── Buyer
│
├── Transporter
│
└── Farmer
    └── Business Record Only
```

This role model is the authorization source of truth for the MVP.
