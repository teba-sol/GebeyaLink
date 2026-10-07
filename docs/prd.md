# GebeyaLink — Product Requirements Document

**Document:** `docs/prd.md`
**Version:** 1.0
**Status:** MVP Product Requirements
**Product:** GebeyaLink
**Product Type:** Managed agricultural B2B marketplace

---

## 1. Purpose

GebeyaLink is a managed agricultural marketplace that connects verified agricultural cooperatives with verified commercial buyers.

The platform coordinates the transaction journey from cooperative inventory through buyer delivery while keeping ownership, payment, transportation, and operational responsibilities clear.

The MVP is designed around this business flow:

> **Farmer → Cooperative Collection Center → Verified Inventory → Buyer Marketplace → Order → Cooperative Acceptance → Buyer Payment → Cooperative Transport → Pickup → Delivery → Buyer Confirmation → Completed Transaction**

GebeyaLink coordinates and records this journey.

GebeyaLink does **not** primarily own agricultural goods, operate collection centers, hold buyer funds, pay farmers directly, or operate transportation in the MVP.

---

# 2. Product Vision

Create a trusted digital marketplace where commercial agricultural buyers can discover real cooperative supply and purchase it through a controlled, transparent transaction process.

The product should reduce uncertainty around:

* What agricultural products are actually available
* How much quantity is available
* What quality grade is available
* Who the seller is
* What price the cooperative is asking
* Whether the inventory is still available
* Whether the cooperative accepted the order
* Whether payment has been made
* Whether goods were picked up
* Where the shipment is
* Whether the buyer received the goods
* Whether there is a quantity or quality dispute

---

# 3. Product Principles

The following principles govern the product.

## 3.1 Trust Before Convenience

The platform should prefer controlled and verifiable transactions over a fast but unreliable marketplace.

## 3.2 Cooperative-Centered Marketplace

The cooperative is the marketplace seller in MVP.

Individual farmers are suppliers/members of cooperatives but are not marketplace sellers.

## 3.3 Real Inventory Matters

Only accepted agricultural deliveries become sellable inventory.

A farmer delivering goods does not automatically create marketplace inventory.

## 3.4 No Silent Changes

The platform must never silently change:

* ordered quantity
* accepted quantity
* agreed price
* payment amount
* delivery quantity
* transaction status

Changes must be explicitly recorded.

## 3.5 Every Important Business Event Is Traceable

Important events should have:

* actor
* date/time
* affected transaction
* previous state where relevant
* new state
* reason where relevant

## 3.6 Separate Product Price and Transport Cost

The agricultural product price and transportation cost are separate commercial amounts.

## 3.7 One Order, One Cooperative

An order represents a commercial commitment with one cooperative.

If a buyer needs supply from multiple cooperatives, separate orders are required.

---

# 4. MVP Goals

The MVP must enable GebeyaLink to operate the complete core transaction lifecycle.

### Goal 1 — Register and verify participants

The platform must support verification of:

* Cooperatives
* Buyers
* Transporters

Farmers must be registerable as cooperative members/suppliers.

### Goal 2 — Capture cooperative supply

Cooperatives must be able to record agricultural deliveries from farmers and turn accepted deliveries into sellable inventory.

### Goal 3 — Publish inventory

Cooperatives must be able to publish available agricultural products with:

* Product
* Grade
* Quantity
* Price
* Location
* Availability information

### Goal 4 — Enable buyer discovery

Verified buyers must be able to search and filter available supply.

### Goal 5 — Prevent overselling

Placing an order must immediately reserve the requested quantity.

### Goal 6 — Control order acceptance

Cooperatives must accept or reject orders within 24 hours.

### Goal 7 — Record payment

Buyers must pay cooperatives directly.

GebeyaLink must record the payment status.

### Goal 8 — Coordinate transportation

The cooperative arranges transportation.

The platform records transporter and shipment information.

### Goal 9 — Confirm pickup and delivery

Pickup requires confirmation by both:

* Cooperative
* Transporter

Delivery is confirmed by the buyer.

### Goal 10 — Handle disputes

The platform must support quantity and quality disputes.

### Goal 11 — Record completed transactions

Completed transactions must contribute to operational and commercial reporting.

### Goal 12 — Generate marketplace revenue

GebeyaLink must be able to calculate its transaction commission/fee on successfully completed transactions.

---

# 5. MVP Non-Goals

The following are explicitly outside the MVP.

GebeyaLink will not:

* Buy agricultural goods
* Own agricultural inventory
* Operate collection centers
* Own trucks
* Directly employ transporters
* Set cooperative selling prices
* Negotiate prices between buyer and cooperative
* Hold buyer funds
* Provide buyer credit
* Pay farmers directly
* Replace cooperative accounting
* Perform laboratory quality testing
* Guarantee agricultural production
* Guarantee transporter performance
* Operate as a commodity exchange
* Support international exports
* Support international trade workflows
* Support consumer grocery purchasing
* Support individual farmers as marketplace sellers
* Support marketplace negotiation/chat as a core transaction mechanism
* Support default partial fulfillment
* Support multi-cooperative orders
* Use star ratings as the initial reputation mechanism

---

# 6. Users and Roles

## 6.1 Farmer

A farmer is a member/supplier associated with a cooperative.

### Farmer can:

* Have a profile
* Be associated with a cooperative
* Deliver agricultural products
* View own delivery history
* View accepted quantities
* View quality grades
* View delivery dates
* View cooperative association

### Farmer cannot:

* Publish marketplace listings
* Set marketplace selling prices
* Receive buyer orders
* Accept buyer orders
* View other farmers' private information
* Negotiate directly with buyers through the marketplace

---

# 6.2 Collection Agent

A collection agent is a cooperative staff member responsible for receiving farmer deliveries.

### Collection agent can:

* Record farmer deliveries
* Record measured quantity
* Record quality assessment
* Assign grade
* Accept/reject delivered quantities
* Create approved inventory from accepted deliveries
* View collection-center operations

### Collection agent cannot:

* Represent the buyer
* Accept buyer commercial orders unless separately authorized
* Change buyer orders
* Change agreed transaction prices after acceptance

---

# 6.3 Cooperative Administrator

The cooperative administrator manages the cooperative's marketplace activity.

### Cooperative administrator can:

* Manage cooperative profile
* Manage authorized users
* Manage collection centers
* Manage farmers
* Manage products
* Manage inventory
* Create marketplace listings
* Set selling prices
* View buyer orders
* Accept/reject orders
* Record payment status
* Arrange transportation
* Record transporter information
* Confirm pickup
* Respond to disputes
* View cooperative transaction history
* View cooperative performance

---

# 6.4 Buyer

The buyer is a verified commercial organization.

Examples include:

* Processor
* Wholesaler
* Trader
* Institutional buyer
* Other qualified commercial agricultural buyer

### Buyer can:

* Browse marketplace supply
* Search/filter products
* View cooperative information
* View product/grade/quantity/price
* Place orders
* View order status
* Make payment directly to cooperative
* Submit payment confirmation/details
* View shipment information
* Confirm delivery
* Report quantity discrepancies
* Report quality disputes
* View transaction history

### Buyer cannot:

* Place orders before verification
* Purchase unavailable inventory
* Negotiate price through the core marketplace
* Order below minimum order quantity
* Order from multiple cooperatives through one order
* Modify an accepted order
* Confirm pickup on behalf of the cooperative/transporter

---

# 6.5 Transporter

A transporter provides transportation for agricultural goods.

### Transporter can:

* View assigned shipments
* View pickup details
* View delivery destination
* Provide vehicle information
* Confirm receipt of goods at pickup
* Update shipment status
* Confirm delivery/arrival

### Transporter cannot:

* Change product price
* Change ordered quantity
* Accept buyer orders
* Release reserved inventory
* Resolve commercial disputes

---

# 6.6 GebeyaLink Operations/Admin

GebeyaLink operations staff manage platform-level trust and exceptions.

### Admin can:

* Verify cooperatives
* Verify buyers
* Approve transporters
* Manage platform users
* Review transactions
* Review disputes
* Resolve disputes
* Monitor operational exceptions
* View platform performance
* Manage market-price references
* Manage platform-wide minimum order quantity
* View transaction commission
* Suspend participants where necessary

Admin actions must be auditable.

---

# 7. Organization Verification

## 7.1 Cooperative Verification

A cooperative must be verified before it can sell through the marketplace.

Verification may include:

* Cooperative name
* Registration information
* Contact information
* Location
* Authorized representative
* Collection centers
* Products handled
* Relevant registration/license information
* Supporting documentation

### Cooperative verification states

* Pending
* Under Review
* Approved
* Rejected
* Suspended

Only **Approved** cooperatives may publish marketplace inventory.

---

# 7.2 Buyer Verification

A buyer may browse marketplace supply before verification.

A buyer must be verified before placing a commercial order.

Verification may include:

* Organization name
* Business type
* Contact person
* Phone
* Email
* Business location
* Relevant registration information
* Buyer category
* Supporting documentation

### Buyer verification states

* Pending
* Under Review
* Approved
* Rejected
* Suspended

Only approved buyers may place orders.

---

# 7.3 Transporter Verification

Transporters may be approved by GebeyaLink.

Transporter information may include:

* Name/company
* Contact information
* Vehicle information
* Vehicle capacity
* Driver information
* Relevant documentation

A cooperative may also use an external transporter.

External transporters must still have enough information recorded to identify the shipment operator.

---

# 8. Farmer Management

## 8.1 Farmer Registration

A farmer is registered under a cooperative.

A farmer record should support:

* Farmer identity
* Contact information
* Cooperative membership
* Location
* Registration date
* Active/inactive status

## 8.2 Farmer Delivery

A farmer delivery records physical agricultural goods delivered to a cooperative.

A delivery must capture:

* Farmer
* Cooperative
* Collection center
* Product
* Claimed quantity
* Measured quantity
* Accepted quantity
* Rejected quantity
* Quality grade
* Collection date
* Collection agent
* Notes/reason where relevant

## 8.3 Critical Rule

A farmer delivery is **not automatically inventory**.

The process is:

> Farmer arrives → delivery recorded → quantity measured → quality checked → accepted/rejected → accepted quantity becomes inventory

Example:

* Farmer claims: 1,200 kg
* Measured: 1,150 kg
* Quality-approved: 1,100 kg
* Sellable inventory: 1,100 kg

The rejected 50 kg must not become marketplace inventory.

---

# 9. Collection Center Management

Each cooperative may operate one or more collection centers.

A collection center should have:

* Name
* Location
* Cooperative
* Status
* Responsible staff
* Operating information

The MVP does not require GebeyaLink to physically operate or manage the center's physical activities.

The platform records the business events performed by cooperative staff.

---

# 10. Product Management

Products represent agricultural commodities traded through the marketplace.

Examples:

* Maize
* Wheat
* Coffee
* Sesame
* Teff

Each product should have:

* Name
* Commodity category
* Standard unit of measure
* Active/inactive status

The MVP should primarily use weight-based quantities where appropriate.

---

# 11. Quality Management

## 11.1 Quality Grades

The MVP supports:

* Grade A
* Grade B
* Grade C
* Rejected

The exact meaning of grades may be defined by the relevant agricultural product/process.

## 11.2 Quality Assessment

The collection agent performs the initial quality assessment.

The assessment must be associated with:

* Delivery
* Product
* Grade
* Assessor
* Date/time
* Notes where necessary

## 11.3 Buyer Quality Visibility

Buyers can see the marketplace quality grade.

Buyers do not normally perform independent grading before ordering.

## 11.4 Quality Dispute

A buyer may dispute delivered quality after delivery.

Examples:

* Wrong grade
* Damaged goods
* Contamination
* Material mismatch

---

# 12. Inventory Management

## 12.1 Inventory Definition

Inventory represents agricultural goods that have been accepted by the cooperative and are eligible for sale.

Inventory must not include:

* Rejected farmer deliveries
* Unverified physical claims
* Already committed goods
* Already dispatched goods
* Completed/sold goods

---

# 12.2 Inventory States

The inventory lifecycle is:

```text
AVAILABLE
   ↓
RESERVED
   ↓
COMMITTED
   ↓
DISPATCHED
   ↓
SOLD
```

Reservation can return inventory to available:

```text
RESERVED
   ↓
AVAILABLE
```

when an order is rejected or expires.

---

# 12.3 Available Quantity

A cooperative must only be able to sell quantity that is genuinely available.

Example:

```text
Total accepted inventory: 10,000 kg

Buyer A orders: 3,000 kg

Available: 7,000 kg
Reserved: 3,000 kg
```

Buyer B cannot order the reserved 3,000 kg.

---

# 12.4 Inventory Listing

A marketplace listing should show:

* Product
* Quality grade
* Available quantity
* Unit price
* Unit
* Cooperative
* Collection/location information
* Availability information
* Relevant market-price reference if available

The listing must not expose private farmer-level information.

---

# 13. Pricing

## 13.1 Cooperative Price

The cooperative sets the selling price.

Example:

```text
Product: Maize
Grade: A
Quantity: 10,000 kg
Price: 45 birr/kg
```

GebeyaLink does not set this price.

## 13.2 No Negotiation in MVP

The buyer selects from the listed price.

The MVP does not include buyer/seller price negotiation.

## 13.3 Price Lock

When the cooperative accepts an order:

* Ordered quantity is fixed
* Unit price is fixed
* Product amount is fixed

Example:

```text
3,000 kg × 45 birr/kg = 135,000 birr
```

The price must not silently change afterward.

---

# 14. Market Price Reference

GebeyaLink may display a market-price reference separately from the cooperative selling price.

Example:

```text
Market reference: 43 birr/kg
Cooperative price: 45 birr/kg
```

The market reference:

* Is informational
* Does not control the cooperative price
* Does not automatically change transaction price
* Should be clearly distinguished from the actual transaction price

---

# 15. Minimum Order Quantity

The MVP uses one platform-wide minimum order quantity.

Example:

```text
Minimum order quantity = 500 kg
```

Then:

* 100 kg → Invalid
* 250 kg → Invalid
* 500 kg → Valid
* 1,000 kg → Valid
* 5,000 kg → Valid if available

The exact minimum quantity is a configurable business value and must not be hardcoded into business logic.

---

# 16. Marketplace

## 16.1 Marketplace Purpose

The marketplace allows verified commercial buyers to discover available agricultural supply.

## 16.2 Search

Buyers should be able to search by product/commodity.

## 16.3 Filters

The MVP should support filtering by:

* Commodity/product
* Quality grade
* Quantity available
* Price
* Location
* Availability date

## 16.4 Marketplace Listing Visibility

Buyers see:

* Cooperative
* Product
* Grade
* Available quantity
* Price
* Location
* Relevant availability information

Buyers do not see:

* Individual farmer names
* Individual farmer quantities
* Individual farmer prices
* Private farmer delivery history

---

# 17. Order Creation

## 17.1 Preconditions

A buyer may place an order only if:

1. Buyer is verified.
2. Cooperative is approved.
3. Listing is active.
4. Requested quantity meets the minimum order quantity.
5. Requested quantity is not greater than available quantity.
6. Product is still available.
7. Price is still valid.

## 17.2 Order

An order belongs to exactly one cooperative.

An order contains:

* Buyer
* Cooperative
* Product
* Quantity
* Unit price
* Product amount
* Order date/time
* Status
* Relevant listing reference
* Buyer destination
* Notes where appropriate

---

# 18. Inventory Reservation

Placing an order immediately reserves the requested quantity.

This is mandatory to prevent overselling.

Example:

```text
Before order:
Available = 10,000 kg

Order:
3,000 kg

After order:
Available = 7,000 kg
Reserved = 3,000 kg
```

The reservation exists while the cooperative decides whether to accept the order.

---

# 19. Cooperative Order Response

The cooperative has **24 hours** to accept or reject an order.

## 19.1 Accept

If accepted:

```text
PLACED
→ PENDING_ACCEPTANCE
→ ACCEPTED
```

The reservation becomes a commercial commitment.

## 19.2 Reject

If rejected:

* Rejection reason is required
* Reserved inventory is released
* Buyer is notified

Example reasons:

* Insufficient actual stock
* Quality issue
* Already committed elsewhere
* Operational issue
* Incorrect order
* Other

If "Other" is selected, explanation is required.

## 19.3 Expiration

If the cooperative does not respond within 24 hours:

* Order expires
* Reservation is released
* Buyer is notified

---

# 20. No Partial Fulfillment

Partial fulfillment is not supported by default.

Example:

Buyer orders:

```text
3,000 kg
```

Cooperative only has:

```text
2,400 kg
```

The cooperative must not silently accept 2,400 kg.

The cooperative should reject the order.

The buyer can create a new order for 2,400 kg if appropriate.

---

# 21. Order Cancellation

## 21.1 Buyer Cancellation

Buyer may cancel only before cooperative acceptance.

After acceptance, the commercial commitment is locked.

Post-acceptance cancellation is only possible through an exceptional business process.

## 21.2 Cooperative Cancellation

Before acceptance, cooperative may reject the order.

After acceptance, cancellation is allowed only when there is a legitimate fulfillment problem.

A reason must be recorded.

Repeated cancellations may affect cooperative standing.

---

# 22. Order Lifecycle

Primary order lifecycle:

```text
PLACED
   ↓
PENDING_ACCEPTANCE
   ↓
ACCEPTED
   ↓
PAYMENT_PENDING
   ↓
PAYMENT_CONFIRMED
   ↓
TRANSPORT_PENDING
   ↓
PICKUP_CONFIRMED
   ↓
IN_TRANSIT
   ↓
DELIVERED
   ↓
COMPLETED
```

Alternative paths:

```text
PENDING_ACCEPTANCE → REJECTED
PENDING_ACCEPTANCE → EXPIRED

ACCEPTED → CANCELLED

DELIVERED → DISPUTED → RESOLVED
```

---

# 23. Payment

## 23.1 Payment Responsibility

The buyer pays the cooperative directly.

GebeyaLink records the payment state.

GebeyaLink does not hold buyer funds in MVP.

## 23.2 Payment Timing

The buyer must pay 100% of the product amount before pickup.

No confirmed payment means:

> No pickup.

## 23.3 Payment States

Payment should support:

* Pending
* Confirmed
* Failed / Not Received
* Disputed

## 23.4 Payment Amount

Payment is based on the accepted commercial commitment.

Example:

```text
Quantity = 3,000 kg
Unit price = 45 birr/kg

Product amount = 135,000 birr
```

Transport cost is separate.

---

# 24. Transportation

## 24.1 Transportation Responsibility

The cooperative arranges transportation.

The buyer does not need to find a truck through the marketplace.

## 24.2 Transporter

The cooperative may use:

* Approved GebeyaLink transporter
* External transporter
* Cooperative-owned/trusted transport arrangement where applicable

## 24.3 Transport Information

The platform should record:

* Transporter
* Vehicle
* Driver/contact where appropriate
* Pickup location
* Destination
* Shipment date
* Expected delivery date
* Transport cost
* Shipment status

---

# 25. Transport Cost

Transport is separate from product price.

Example:

```text
Product:
3,000 kg × 45 birr
= 135,000 birr

Transport:
15,000 birr
```

The platform must not merge transport cost into the product unit price.

The exact payment arrangement for transportation can be recorded separately from the product payment.

---

# 26. Pickup

Pickup is confirmed by both the cooperative and transporter.

## 26.1 Cooperative Confirmation

The cooperative confirms:

> Goods have been handed to the transporter.

## 26.2 Transporter Confirmation

The transporter confirms:

> Goods have been received from the cooperative.

Only after both confirmations should the shipment move into the picked-up/in-transit state.

The buyer is not required to confirm pickup.

---

# 27. Shipment Lifecycle

```text
TRANSPORT_PENDING
       ↓
PICKUP_PENDING
       ↓
PICKUP_CONFIRMED
       ↓
IN_TRANSIT
       ↓
DELIVERED
```

Exceptions may include:

* Delayed
* Failed delivery
* Cancelled
* Disputed

---

# 28. Delivery

The transporter delivers the goods to the buyer.

The buyer checks:

* Product
* Quantity
* General condition
* Quality/grade where relevant

The buyer then confirms delivery.

---

# 29. Ownership Transfer

Ownership transfers at buyer delivery/acceptance.

Before buyer acceptance:

> Cooperative remains responsible for goods.

After buyer acceptance:

> Goods are considered transferred to buyer, subject to any active dispute.

---

# 30. Delivery Confirmation

A buyer should be able to confirm:

* Delivery received
* Delivery date/time
* Delivered quantity
* Condition
* Notes
* Supporting evidence where appropriate

Successful delivery moves the transaction toward completion.

---

# 31. Quantity Discrepancy

A quantity discrepancy must be treated as a dispute.

Example:

```text
Ordered:   3,000 kg
Delivered: 2,850 kg
Difference: 150 kg
```

The system must record:

* Ordered quantity
* Accepted quantity
* Pickup quantity where available
* Delivered quantity
* Disputed quantity
* Reason
* Evidence
* Resolution

The platform must **not automatically rewrite the original order quantity**.

---

# 32. Quality Dispute

A buyer may report:

* Wrong grade
* Damaged goods
* Contamination
* Material mismatch
* Other material quality issue

The dispute must preserve the original transaction data.

---

# 33. Dispute Management

## 33.1 Dispute Process

```text
Buyer reports dispute
        ↓
Dispute opened
        ↓
Cooperative responds
        ↓
Evidence reviewed
        ↓
GebeyaLink resolves
        ↓
Resolution recorded
```

## 33.2 Possible Outcomes

Examples:

* No adjustment
* Partial refund/agreed adjustment
* Full refund/agreed adjustment
* Replacement
* Quantity adjustment
* Other mutually agreed resolution
* Escalation

The platform should not automatically assume financial liability.

---

# 34. Dispute Lifecycle

```text
OPEN
 ↓
UNDER_REVIEW
 ↓
RESPONDED
 ↓
RESOLVED
```

Alternative:

```text
OPEN
 ↓
ESCALATED
 ↓
RESOLVED
```

A resolved dispute must contain:

* Resolution
* Decision maker
* Date/time
* Reason
* Relevant evidence
* Financial adjustment if applicable

---

# 35. Notifications

Notifications are required at important milestones.

## 35.1 Buyer Notifications

Buyer should receive notifications for:

* Order placed
* Order accepted
* Order rejected
* Order expired
* Payment reminder
* Payment confirmed
* Pickup scheduled
* Pickup confirmed
* Shipment in transit
* Delivery
* Dispute update
* Dispute resolution

## 35.2 Cooperative Notifications

Cooperative should receive notifications for:

* New order
* Acceptance deadline approaching
* Order accepted/rejected
* Payment confirmation
* Pickup reminder
* Pickup confirmation
* Delivery
* Dispute opened
* Dispute update/resolution

## 35.3 Notification Principle

Do not notify users for every internal state change.

Notifications should focus on events requiring awareness or action.

---

# 36. Reputation

The MVP does not use star ratings.

Instead, the platform should calculate objective operational indicators.

Potential indicators:

### Cooperative

* Orders completed
* Orders accepted
* Orders rejected
* Cancellation rate
* On-time fulfillment
* Dispute count
* Successful transactions

### Buyer

* Orders completed
* Cancellation history
* Payment reliability
* Dispute history

### Transporter

* Shipments completed
* On-time delivery
* Delivery failures
* Dispute history

These metrics should be used internally first.

---

# 37. Transaction Commission

GebeyaLink earns revenue through transaction commission/fees.

The commission applies to successfully completed transactions according to the platform's configured commercial policy.

The exact percentage/fee is not yet fixed.

The system must therefore support a configurable commission rule rather than hardcoding a percentage.

The platform should distinguish:

* Product amount
* Transport cost
* GebeyaLink fee
* Other adjustments
* Final transaction amount

Commission should not be recognized merely because a listing exists.

The core revenue event is a successful transaction.

---

# 38. Buyer Marketplace Journey

The expected buyer journey is:

```text
Browse marketplace
      ↓
Search/filter supply
      ↓
View listing
      ↓
View cooperative
      ↓
Select quantity
      ↓
Review order
      ↓
Place order
      ↓
Inventory reserved
      ↓
Wait for cooperative acceptance
      ↓
Accepted
      ↓
Pay cooperative
      ↓
Payment confirmed
      ↓
Shipment arranged
      ↓
Pickup
      ↓
In transit
      ↓
Delivery
      ↓
Confirm delivery
      ↓
Transaction completed
```

---

# 39. Cooperative Journey

The expected cooperative journey is:

```text
Register cooperative
      ↓
Verification
      ↓
Manage farmers
      ↓
Receive farmer delivery
      ↓
Measure quantity
      ↓
Assess quality
      ↓
Accept delivery
      ↓
Create inventory
      ↓
Publish supply
      ↓
Receive buyer order
      ↓
Accept / Reject within 24h
      ↓
If accepted:
      ↓
Receive payment confirmation
      ↓
Arrange transport
      ↓
Confirm pickup
      ↓
Goods delivered
      ↓
Complete transaction
```

---

# 40. Farmer Journey

The MVP farmer journey is:

```text
Register with cooperative
      ↓
Deliver agricultural goods
      ↓
Collection agent records delivery
      ↓
Quantity measured
      ↓
Quality assessed
      ↓
Accepted / Rejected
      ↓
Accepted quantity becomes cooperative inventory
      ↓
Farmer can view delivery history
```

The farmer is not part of the buyer-facing transaction.

---

# 41. Transporter Journey

```text
Receive shipment assignment
      ↓
Review pickup information
      ↓
Arrive at cooperative
      ↓
Receive goods
      ↓
Confirm pickup
      ↓
Transport goods
      ↓
Deliver to buyer
      ↓
Update delivery status
```

---

# 42. Admin Journey

```text
Review participant registration
      ↓
Verify cooperative/buyer/transporter
      ↓
Monitor marketplace
      ↓
Monitor orders
      ↓
Monitor payment status
      ↓
Monitor shipments
      ↓
Review exceptions
      ↓
Resolve disputes
      ↓
Monitor platform performance
```

---

# 43. Core Functional Requirements

## FR-001 — User Registration

The system shall allow users to create accounts appropriate to their role.

## FR-002 — Role Assignment

The system shall assign users appropriate platform roles.

## FR-003 — Cooperative Registration

The system shall allow cooperative organizations to submit verification information.

## FR-004 — Buyer Registration

The system shall allow commercial buyers to submit verification information.

## FR-005 — Transporter Registration

The system shall allow transporters to submit relevant information.

## FR-006 — Verification

The system shall support admin approval, rejection, and suspension.

## FR-007 — Farmer Management

The system shall allow cooperatives to register and manage farmer members/suppliers.

## FR-008 — Collection Center Management

The system shall allow cooperatives to record collection centers.

## FR-009 — Farmer Delivery Recording

The system shall allow collection agents to record farmer deliveries.

## FR-010 — Quantity Verification

The system shall distinguish claimed, measured, accepted, and rejected quantities.

## FR-011 — Quality Assessment

The system shall allow collection agents to assign quality grades.

## FR-012 — Inventory Creation

The system shall create sellable inventory only from accepted quantities.

## FR-013 — Inventory Management

The system shall track inventory availability.

## FR-014 — Marketplace Listing

The system shall allow approved cooperatives to publish available inventory.

## FR-015 — Marketplace Search

The system shall allow buyers to search marketplace supply.

## FR-016 — Marketplace Filtering

The system shall allow filtering by supported marketplace criteria.

## FR-017 — Order Creation

The system shall allow verified buyers to create orders.

## FR-018 — Minimum Order Validation

The system shall reject orders below the platform minimum.

## FR-019 — Availability Validation

The system shall reject orders exceeding available quantity.

## FR-020 — Inventory Reservation

The system shall reserve inventory immediately when an order is placed.

## FR-021 — Order Acceptance

The system shall allow cooperatives to accept orders.

## FR-022 — Order Rejection

The system shall allow cooperatives to reject orders with a reason.

## FR-023 — Acceptance Deadline

The system shall enforce the 24-hour response window.

## FR-024 — Automatic Expiration

The system shall expire unanswered orders and release reservations.

## FR-025 — Price Lock

The system shall preserve the accepted transaction price.

## FR-026 — Payment Recording

The system shall record payment status.

## FR-027 — Payment Verification

The system shall support confirmation that the cooperative received buyer payment.

## FR-028 — Pickup Blocking

The system shall prevent pickup confirmation before required payment confirmation.

## FR-029 — Transport Management

The system shall allow shipment and transporter information to be recorded.

## FR-030 — Pickup Confirmation

The system shall support cooperative and transporter pickup confirmation.

## FR-031 — Shipment Tracking

The system shall track shipment lifecycle.

## FR-032 — Delivery Confirmation

The system shall allow buyers to confirm delivery.

## FR-033 — Quantity Dispute

The system shall support delivery quantity disputes.

## FR-034 — Quality Dispute

The system shall support post-delivery quality disputes.

## FR-035 — Dispute Resolution

The system shall allow authorized GebeyaLink personnel to resolve disputes.

## FR-036 — Notifications

The system shall notify users of important transaction events.

## FR-037 — Transaction History

The system shall provide transaction history appropriate to each role.

## FR-038 — Reputation Metrics

The system shall calculate objective operational performance metrics.

## FR-039 — Commission

The system shall calculate applicable GebeyaLink transaction commission.

## FR-040 — Audit Trail

The system shall maintain an audit trail for important business actions.

---

# 44. Permissions Matrix

| Capability                         |   Farmer | Collection Agent | Cooperative Admin | Buyer | Transporter | GebeyaLink Admin |
| ---------------------------------- | -------: | ---------------: | ----------------: | ----: | ----------: | ---------------: |
| View own profile                   |        ✓ |                ✓ |                 ✓ |     ✓ |           ✓ |                ✓ |
| Manage farmers                     |        — |                ✓ |                 ✓ |     — |           — |                ✓ |
| Record farmer delivery             |        — |                ✓ |                 ✓ |     — |           — |                ✓ |
| Assess quality                     |        — |                ✓ |                 ✓ |     — |           — |                ✓ |
| Manage inventory                   |        — |                ✓ |                 ✓ |     — |           — |                ✓ |
| Publish listing                    |        — |                — |                 ✓ |     — |           — |                ✓ |
| Browse marketplace                 |        — |         Optional |                 ✓ |     ✓ |           — |                ✓ |
| Place order                        |        — |                — |                 — |     ✓ |           — |                ✓ |
| Accept order                       |        — |                — |                 ✓ |     — |           — |                ✓ |
| Reject order                       |        — |                — |                 ✓ |     — |           — |                ✓ |
| Confirm payment                    |        — |                — |                 ✓ |     — |           — |                ✓ |
| Arrange transport                  |        — |                — |                 ✓ |     — |           — |                ✓ |
| Confirm pickup                     |        — |                — |                 ✓ |     — |           ✓ |                ✓ |
| Update shipment                    |        — |                — |                 ✓ |     — |           ✓ |                ✓ |
| Confirm delivery                   |        — |                — |                 — |     ✓ |   ✓/support |                ✓ |
| Open dispute                       |        — |                — |         ✓/respond |     ✓ |   ✓/support |                ✓ |
| Resolve dispute                    |        — |                — |                 — |     — |           — |                ✓ |
| View farmer private data           | Own only |         Assigned |       Cooperative |     — |           — |       Authorized |
| View farmer-level marketplace data |        — |                — |          Internal |     — |           — |       Authorized |

---

# 45. Business Rules

## BR-001

Only verified buyers can place commercial orders.

## BR-002

Only approved cooperatives can sell through the marketplace.

## BR-003

Farmers are suppliers/members, not marketplace sellers in MVP.

## BR-004

A farmer delivery does not automatically become inventory.

## BR-005

Only accepted quantities become sellable inventory.

## BR-006

Rejected quantity cannot be listed for sale.

## BR-007

Placing an order reserves inventory immediately.

## BR-008

Reserved inventory cannot be ordered by another buyer.

## BR-009

A cooperative has 24 hours to respond.

## BR-010

An unanswered order expires automatically.

## BR-011

Expired reservations return to available inventory.

## BR-012

Rejection releases reserved inventory.

## BR-013

Acceptance creates a final commercial commitment.

## BR-014

Accepted quantity and price cannot silently change.

## BR-015

The buyer must pay 100% before pickup.

## BR-016

Buyer payment goes directly to the cooperative.

## BR-017

GebeyaLink records payment but does not hold funds in MVP.

## BR-018

The cooperative arranges transportation.

## BR-019

Transport cost is separate from product price.

## BR-020

Pickup requires cooperative and transporter confirmation.

## BR-021

Ownership transfers at buyer delivery/acceptance.

## BR-022

Quantity discrepancies become disputes.

## BR-023

Quality disputes can be opened after delivery.

## BR-024

GebeyaLink coordinates dispute resolution.

## BR-025

Buyer cancellation is allowed only before acceptance in the normal flow.

## BR-026

Cooperative cancellation after acceptance requires a legitimate reason.

## BR-027

Partial fulfillment is not allowed by default.

## BR-028

One order belongs to one cooperative.

## BR-029

Farmer-level information is not visible to buyers.

## BR-030

No star ratings are required in MVP.

## BR-031

Commission is earned on successfully completed transactions.

---

# 46. Important Edge Cases

## Edge Case 1 — Inventory disappears before order

If inventory is no longer available when the buyer submits an order, the order must fail rather than reserve unavailable quantity.

## Edge Case 2 — Two buyers order simultaneously

The platform must ensure that the same inventory cannot be successfully reserved for both orders.

## Edge Case 3 — Cooperative does not respond

After 24 hours:

```text
Order → EXPIRED
Reservation → RELEASED
Inventory → AVAILABLE
```

## Edge Case 4 — Cooperative rejects order

The cooperative must provide a rejection reason.

Reserved inventory is released.

## Edge Case 5 — Buyer cancels before acceptance

Reservation is released.

## Edge Case 6 — Buyer attempts cancellation after acceptance

Normal cancellation must be blocked.

Exceptional cancellation requires authorized handling.

## Edge Case 7 — Payment not confirmed

Pickup cannot proceed.

## Edge Case 8 — Payment failed

Order remains unresolved until payment issue is resolved or appropriate cancellation occurs.

## Edge Case 9 — Transporter changes

A shipment may have its transporter changed before pickup, provided the change is authorized and recorded.

## Edge Case 10 — Pickup only one party confirms

Shipment should not be considered fully picked up until both required confirmations exist.

## Edge Case 11 — Buyer reports less quantity received

Open quantity dispute.

Do not rewrite original order.

## Edge Case 12 — Buyer reports poor quality

Open quality dispute.

Do not automatically mark transaction as invalid.

## Edge Case 13 — Buyer does not confirm delivery

The transaction should remain awaiting buyer confirmation or move into an operational exception process.

## Edge Case 14 — Cooperative attempts to sell committed inventory

The system must prevent committed inventory from appearing available.

## Edge Case 15 — Farmer delivers less than claimed

Only measured/accepted quantity contributes to inventory.

## Edge Case 16 — Farmer delivery rejected

Rejected quantity does not enter inventory.

## Edge Case 17 — Cooperative price changes after order

Existing accepted commercial commitments must retain their agreed price.

## Edge Case 18 — Buyer requests multiple cooperatives

The platform must create separate orders.

## Edge Case 19 — Buyer orders more than available

The order must be rejected by validation.

## Edge Case 20 — Buyer orders below minimum

The order must be rejected by validation.

---

# 47. Auditability Requirements

The platform should maintain an auditable record for:

* User verification
* Cooperative verification
* Buyer verification
* Farmer delivery
* Quantity changes
* Quality assessment
* Inventory creation
* Inventory reservation
* Inventory release
* Listing creation
* Listing changes
* Order creation
* Order acceptance
* Order rejection
* Order expiration
* Order cancellation
* Payment status
* Transport assignment
* Pickup confirmation
* Shipment status
* Delivery confirmation
* Disputes
* Dispute resolutions
* Commission calculations
* Administrative actions

Important records should include:

* Actor
* Timestamp
* Action
* Entity/transaction
* Relevant reason
* Previous/new state where applicable

---

# 48. Data Visibility Rules

## Farmer

Can see:

* Own profile
* Own delivery history
* Own accepted quantities
* Own grades
* Cooperative relationship

Cannot see:

* Other farmers' private information
* Buyer private information
* Marketplace buyer order details unless explicitly authorized

## Cooperative

Can see:

* Its farmers
* Its inventory
* Its listings
* Its orders
* Buyer information required to fulfill orders
* Transport information
* Its transactions
* Relevant disputes

## Buyer

Can see:

* Approved cooperative identity
* Marketplace listings
* Product
* Grade
* Available quantity
* Price
* Relevant location
* Its own orders
* Its own shipments
* Its own disputes

Cannot see:

* Individual farmer identity
* Individual farmer delivery history
* Farmer-level pricing
* Other buyers' transactions

## Transporter

Can see only information required to perform assigned transportation.

## GebeyaLink Admin

Can access platform operational information according to administrative permissions.

---

# 49. MVP Screens / Product Areas

The exact UI can evolve, but the MVP should provide the following functional areas.

## Authentication

* Sign in
* Sign up
* Password/account recovery
* Role-aware access

## Onboarding

* Cooperative registration
* Buyer registration
* Transporter registration
* Verification status

## Farmer Management

* Farmer list
* Farmer profile
* Farmer registration
* Delivery history

## Collection

* Collection center
* New farmer delivery
* Quantity verification
* Quality assessment
* Delivery history

## Inventory

* Inventory list
* Inventory detail
* Available/reserved/committed quantities
* Create inventory from accepted delivery

## Marketplace

* Marketplace listing
* Search
* Filters
* Listing detail
* Cooperative information

## Orders

* Buyer orders
* Cooperative orders
* Order detail
* Accept/reject
* Acceptance deadline
* Cancellation where permitted

## Payments

* Payment status
* Payment confirmation
* Payment details/history

## Transport

* Shipment
* Transporter
* Vehicle
* Pickup
* Shipment tracking
* Delivery

## Disputes

* Open dispute
* Dispute detail
* Evidence
* Cooperative response
* Admin resolution

## Notifications

* Notification center
* Important transaction alerts

## Administration

* Verification queue
* Participants
* Transactions
* Disputes
* Operational metrics
* Market-price reference
* Platform configuration

---

# 50. MVP Reporting

## Platform Reports

GebeyaLink should be able to monitor:

* Total cooperatives
* Verified cooperatives
* Total buyers
* Verified buyers
* Active listings
* Available inventory
* Reserved inventory
* Orders
* Completed transactions
* Rejected orders
* Expired orders
* Cancelled orders
* Disputes
* Transaction volume
* Commission revenue
* Delivery performance

## Cooperative Reports

A cooperative should be able to see:

* Inventory
* Orders
* Completed sales
* Rejected orders
* Cancellations
* Deliveries
* Disputes
* Revenue-related transaction information
* Farmer delivery history

## Buyer Reports

A buyer should be able to see:

* Orders
* Purchased quantities
* Spending
* Deliveries
* Disputes
* Transaction history

---

# 51. Success Metrics

The MVP should be evaluated using business outcomes rather than only application usage.

## Marketplace Metrics

* Number of verified cooperatives
* Number of verified buyers
* Active supply
* Available inventory quantity
* Number of active listings
* Marketplace order volume

## Transaction Metrics

* Orders placed
* Orders accepted
* Orders rejected
* Orders expired
* Orders completed
* Transaction value
* Average order size

## Operational Metrics

* Average cooperative response time
* Acceptance rate
* Payment confirmation time
* Pickup completion rate
* On-time delivery rate
* Dispute rate
* Cancellation rate

## Trust Metrics

* Quantity discrepancy rate
* Quality dispute rate
* Cooperative fulfillment rate
* Buyer payment reliability
* Transporter delivery reliability

## Revenue Metrics

* Gross transaction value
* Completed transaction value
* GebeyaLink commission
* Commission per completed order

---

# 52. MVP Acceptance Criteria

The MVP is considered functionally complete when the following end-to-end scenario works.

## Scenario

A verified farmer delivers maize to an approved cooperative.

### Step 1

Collection agent records:

```text
Claimed quantity: 1,200 kg
Measured quantity: 1,150 kg
Accepted quantity: 1,100 kg
Rejected quantity: 50 kg
Grade: A
```

### Step 2

The platform creates 1,100 kg of sellable cooperative inventory.

The 50 kg rejected quantity is not sellable.

### Step 3

The cooperative publishes:

```text
Maize
Grade A
1,100 kg
45 birr/kg
```

### Step 4

A verified buyer discovers the listing.

### Step 5

Buyer orders:

```text
500 kg
```

assuming 500 kg is the configured minimum.

### Step 6

The system immediately reserves 500 kg.

Available quantity becomes:

```text
600 kg
```

### Step 7

Cooperative accepts within 24 hours.

The order becomes commercially committed.

### Step 8

The system calculates:

```text
500 kg × 45 birr/kg
= 22,500 birr
```

### Step 9

Buyer pays the cooperative.

Payment is recorded as confirmed.

### Step 10

Cooperative arranges transportation.

Transport cost is recorded separately.

### Step 11

Cooperative confirms handover.

Transporter confirms receipt.

### Step 12

Shipment becomes in transit.

### Step 13

Transporter delivers the goods.

### Step 14

Buyer confirms delivery.

### Step 15

The transaction becomes completed.

### Step 16

GebeyaLink records the applicable transaction commission.

### Step 17

The transaction becomes available for reporting.

---

# 53. Failed Scenario Acceptance Criteria

## Scenario A — Order Rejected

Buyer orders available quantity.

Cooperative rejects it.

Expected:

```text
Order → REJECTED
Reservation → RELEASED
Inventory → AVAILABLE
Buyer notified
Rejection reason recorded
```

## Scenario B — Order Expires

Cooperative does not respond for 24 hours.

Expected:

```text
Order → EXPIRED
Reservation → RELEASED
Inventory → AVAILABLE
Buyer notified
```

## Scenario C — Insufficient Inventory

Buyer requests more than available.

Expected:

```text
Order rejected
No reservation created
Inventory unchanged
```

## Scenario D — Payment Not Confirmed

Accepted order exists but payment is not confirmed.

Expected:

```text
Pickup cannot proceed
```

## Scenario E — Quantity Dispute

Buyer receives 450 kg against 500 kg order.

Expected:

```text
Original order remains 500 kg
Delivered quantity = 450 kg
Dispute = 50 kg
Resolution handled separately
```

## Scenario F — Quality Dispute

Buyer claims delivered goods do not match Grade A.

Expected:

```text
Order remains historically accurate
Quality dispute opened
Cooperative can respond
GebeyaLink can resolve
Resolution recorded
```

---

# 54. Product State vs Physical Reality

The product must distinguish digital records from physical events.

For example:

```text
Farmer says:
"I brought 1,200 kg."

Digital record:
Claimed = 1,200 kg

Collection agent measures:
1,150 kg

Digital record:
Measured = 1,150 kg

Quality assessment:
1,100 kg accepted

Digital record:
Accepted = 1,100 kg
Rejected = 50 kg

Marketplace:
Available inventory = 1,100 kg
```

The platform must not treat user claims as automatically authoritative.

---

# 55. Source of Truth

The following hierarchy applies when implementing features.

### Business Domain Model

Defines:

> What the business entities and rules mean.

### PRD

Defines:

> What the product must allow users to do.

### UI/UX Design

Defines:

> How users interact with those requirements.

### Technical Architecture

Defines:

> How the product is implemented.

A lower-level implementation must not contradict a higher-level business rule.

If a proposed technical or product feature conflicts with the business model:

1. Identify the conflict.
2. Explain the business consequence.
3. Ask for a business decision.
4. Update the business model.
5. Update the PRD.
6. Only then implement.

---

# 56. Explicit Product Boundaries

The following distinctions must remain clear.

## Farmer vs Cooperative

Farmer supplies goods.

Cooperative sells goods.

## Delivery vs Inventory

Physical farmer delivery is not automatically marketplace inventory.

## Listing vs Order

A listing advertises available supply.

An order represents buyer intent and reserves inventory.

## Reservation vs Commitment

Reservation temporarily blocks inventory.

Acceptance creates commercial commitment.

## Payment vs Order

An accepted order does not mean payment is confirmed.

## Pickup vs Delivery

Pickup means transporter received the goods.

Delivery means buyer received the goods.

## Delivery vs Completion

Delivery must be confirmed before normal transaction completion.

## Dispute vs History

A dispute does not rewrite historical transaction facts.

---

# 57. Deferred Features

The following should be considered after MVP.

## Marketplace

* Buyer/seller negotiation
* Chat
* Offers
* Auctions
* Dynamic pricing
* Multi-cooperative cart
* Buyer subscriptions

## Farmer

* Direct farmer marketplace selling
* Farmer payments through GebeyaLink
* Farmer wallets
* Farmer financing
* Farmer input purchasing

## Quality

* Laboratory testing
* Digital certificates
* Advanced crop-specific quality metrics
* Third-party inspection
* Automated quality scoring

## Finance

* Buyer credit
* Payment terms
* Escrow
* Digital wallet
* Financing
* Insurance

## Logistics

* Advanced route optimization
* Real-time GPS tracking
* Fleet management
* Automated transporter matching

## Reputation

* Star ratings
* Reviews
* Public reputation scores

## Market Intelligence

* Advanced commodity analytics
* Forecasting
* Price prediction
* Regional supply/demand analytics

## International Trade

* Export workflows
* Customs
* International shipping
* Foreign currency settlement
* Trade finance

---

# 58. Future Evolution

The product architecture should not prevent future expansion into:

```text
MVP
Cooperatives
   ↓
Managed marketplace
   ↓
Verified buyers
   ↓
Controlled transaction workflow

Future
   ↓
Individual farmers
   ↓
More products
   ↓
More logistics
   ↓
Financial services
   ↓
Market intelligence
   ↓
Regional/international trade
```

However, future possibilities must not complicate MVP behavior unnecessarily.

---

# 59. MVP Priority

## P0 — Must Have

* Authentication
* Role management
* Cooperative verification
* Buyer verification
* Farmer management
* Collection centers
* Farmer delivery recording
* Quantity verification
* Quality grading
* Inventory
* Marketplace
* Search/filter
* Order creation
* Inventory reservation
* 24-hour acceptance
* Order rejection/expiration
* Price locking
* Payment status
* Transport records
* Pickup confirmation
* Shipment status
* Delivery confirmation
* Quantity disputes
* Quality disputes
* Admin dispute resolution
* Notifications
* Transaction history
* Audit trail
* Commission calculation

## P1 — Important

* Market-price reference
* Operational reputation metrics
* Advanced reporting
* Transporter management
* Evidence attachments
* Operational dashboards

## P2 — Later

* Ratings
* Negotiation
* Direct farmer selling
* Buyer credit
* Wallets
* Advanced logistics
* Advanced quality
* International trade

---

# 60. Definition of Done for a Transaction

A transaction is considered successfully completed when:

1. Buyer was verified.
2. Cooperative was approved.
3. Inventory was valid.
4. Order was placed.
5. Inventory was reserved.
6. Cooperative accepted the order.
7. Price and quantity were committed.
8. Buyer paid the cooperative.
9. Payment was confirmed.
10. Transport was arranged.
11. Cooperative confirmed pickup.
12. Transporter confirmed pickup.
13. Shipment reached buyer.
14. Buyer confirmed delivery.
15. No unresolved blocking dispute remains.
16. Applicable GebeyaLink commission was recorded.

---

# 61. Golden Business Flow

This is the canonical MVP flow.

```text
FARMER
  │
  │ delivers agricultural goods
  ▼
COOPERATIVE COLLECTION CENTER
  │
  ├── measure
  ├── inspect
  └── grade
  │
  ▼
ACCEPTED FARMER DELIVERY
  │
  ▼
COOPERATIVE INVENTORY
  │
  ▼
MARKETPLACE LISTING
  │
  ▼
VERIFIED BUYER
  │
  │ searches supply
  ▼
ORDER
  │
  ▼
INVENTORY RESERVED
  │
  ▼
COOPERATIVE
  │
  ├── ACCEPT → commercial commitment
  │
  └── REJECT → inventory released
  │
  ▼
BUYER PAYMENT
  │
  ▼
PAYMENT CONFIRMED
  │
  ▼
COOPERATIVE ARRANGES TRANSPORT
  │
  ▼
PICKUP
  │
  ├── cooperative confirms
  └── transporter confirms
  │
  ▼
IN TRANSIT
  │
  ▼
BUYER DELIVERY
  │
  ├── confirm delivery
  └── or open dispute
  │
  ▼
COMPLETED TRANSACTION
  │
  ├── commission calculated
  ├── reputation metrics updated
  └── reporting updated
```

---

# 62. Final Product Rule

When implementing GebeyaLink, never reduce the platform to:

> "A website where cooperatives post products and buyers buy them."

The actual product is:

> **A controlled transaction coordination system for agricultural supply, where inventory, commitment, payment, logistics, delivery, and disputes are connected into one auditable business workflow.**

The marketplace is only one part of the product.

The transaction lifecycle is the core product.

---

# 63. Relationship to the Business Domain Model

This PRD must be interpreted together with:

```text
docs/business-domain-model.md
```

The Business Domain Model defines the business concepts and invariants.

This PRD translates those concepts into product behavior.

If there is any conflict between implementation assumptions and these documents, do not silently choose an implementation.

Return to the business rule and resolve the conflict first.

---

# 64. Implementation Handoff Rule

The coding assistant may now use this PRD to design:

* Application modules
* Screens
* User flows
* Permissions
* Validation
* State transitions
* Notifications
* Reporting
* Data structures
* APIs
* Background processes

However, implementation details must not introduce new business rules without approval.

The next technical artifacts should therefore be derived from this PRD rather than invented independently.

---

# 65. Recommended Next Artifact

After this PRD, the next artifact should be:

```text
docs/user-flows.md
```

It should translate the PRD into detailed flows for:

1. Farmer delivery
2. Collection agent processing
3. Inventory creation
4. Cooperative listing
5. Buyer marketplace discovery
6. Buyer ordering
7. Cooperative acceptance/rejection
8. Payment confirmation
9. Transport arrangement
10. Pickup
11. Shipment
12. Delivery
13. Quantity dispute
14. Quality dispute
15. Admin resolution
16. Transaction completion

Only after the user flows are agreed should the project move into technical architecture and implementation.
