# GebeyaLink — Business Domain Model

> Version: 1.0
> Status: Approved Business Model
> Purpose: Source of truth for business rules and domain concepts.
>
> This document describes WHAT GebeyaLink does and HOW the business works.
> It intentionally does not prescribe programming languages, frameworks,
> database technologies, API structures, or UI implementation.

---

# 1. Business Overview

GebeyaLink is a managed agricultural marketplace that connects
cooperative-based agricultural supply with commercial buyers.

The core business flow is:

Farmer
  ↓
Cooperative Collection Center
  ↓
Quality & Weight Verification
  ↓
Cooperative Inventory
  ↓
Marketplace
  ↓
Buyer Order
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
Buyer Acceptance
  ↓
Completed Transaction

GebeyaLink coordinates and records this process.

GebeyaLink does NOT normally own the agricultural goods.

The cooperative is the seller.

The buyer purchases from the cooperative.

---

# 2. Core Business Principle

The primary commercial relationship is:

    COOPERATIVE → BUYER

Farmers supply the cooperative.

GebeyaLink facilitates the transaction between the cooperative and buyer.

The buyer does not purchase directly from an individual farmer in V1.

The buyer sees the cooperative as the seller.

---

# 3. Business Actors

## 3.1 Farmer

A farmer is a member/supplier associated with a cooperative.

Responsibilities:

- Produce agricultural goods.
- Deliver goods to the cooperative collection center.
- Provide delivery information when required.

The farmer is NOT a marketplace seller in V1.

The farmer's individual information is private from buyers.

A farmer may have:

- Cooperative membership
- Supplier profile
- Delivery history
- Accepted quantities
- Rejected quantities
- Quality history

---

## 3.2 Collection Agent

A collection agent is a cooperative staff member responsible for receiving farmer deliveries.

Responsibilities:

- Receive agricultural goods.
- Weigh delivered goods.
- Inspect quality.
- Assign quality grade.
- Accept or reject delivered quantities.
- Record the delivery.

The collection agent works for the cooperative.

GebeyaLink does not operate the physical collection center.

---

## 3.3 Cooperative

The cooperative is the primary seller on GebeyaLink.

Responsibilities:

- Manage farmer relationships.
- Operate collection centers.
- Receive agricultural goods.
- Verify weight.
- Assess quality.
- Create/maintain inventory.
- Set selling prices.
- Accept or reject buyer orders.
- Receive buyer payments.
- Arrange transportation.
- Hand goods to transporter.
- Respond to disputes.

The cooperative is the marketplace seller visible to buyers.

---

## 3.4 Buyer

A buyer is a verified commercial customer.

Possible buyer types:

- Processor
- Wholesaler
- Trader
- Institutional buyer
- Other commercial agricultural buyer

Responsibilities:

- Browse available inventory.
- Place orders.
- Pay the cooperative.
- Pay transportation costs.
- Receive goods.
- Confirm delivery.
- Report legitimate discrepancies/disputes.

---

## 3.5 Transporter

A transporter physically moves goods from the cooperative to the buyer.

A transporter may be:

1. An approved GebeyaLink transporter.
2. An external transporter selected by the cooperative.

Responsibilities:

- Receive goods from cooperative.
- Transport goods.
- Deliver goods to buyer.
- Confirm pickup.
- Provide delivery status.

---

## 3.6 GebeyaLink Admin

The platform administrator oversees platform operations.

Responsibilities:

- Verify organizations/users.
- Manage marketplace operations.
- Review disputes.
- Monitor transactions.
- Manage platform rules.
- Review suspicious activity.
- Maintain platform integrity.

---

# 4. Core Business Concepts

The primary business concepts are:

1. Organization
2. Cooperative
3. Buyer
4. Farmer
5. Collection Center
6. Collection Agent
7. Product
8. Quality Grade
9. Farmer Delivery
10. Inventory
11. Inventory Listing
12. Order
13. Payment
14. Transporter
15. Shipment
16. Pickup
17. Delivery
18. Dispute
19. Market Price Reference

---

# 5. Organization Model

GebeyaLink works primarily with organizations.

Examples:

- Cooperative organization
- Buyer organization
- Transport organization

An organization may have multiple users.

Example:

Cooperative ABC
  ├── Manager
  ├── Collection Agent 1
  ├── Collection Agent 2
  └── Finance Staff

A buyer organization may have:

Buyer Company XYZ
  ├── Purchasing Manager
  └── Operations Staff

Users act on behalf of their organization.

---

# 6. Cooperative

A Cooperative represents a verified agricultural cooperative.

Important business information:

- Name
- Registration/identification information
- Contact information
- Location
- Verification status
- Collection centers
- Members/farmers
- Marketplace status

A cooperative can:

- Receive farmer deliveries.
- Create inventory.
- Publish inventory for sale.
- Set prices.
- Accept orders.
- Reject orders.
- Arrange transportation.

A cooperative is a seller.

---

# 7. Buyer Organization

A Buyer represents a verified commercial buyer organization.

Important information:

- Organization name
- Contact information
- Location
- Verification status
- Buyer type
- Authorized users

A buyer can:

- Browse inventory.
- Place orders.
- Make payments to cooperatives.
- Track orders.
- Confirm deliveries.
- Raise disputes.

---

# 8. Farmer

A Farmer belongs to a cooperative.

Relationship:

    Farmer ── belongs to ──> Cooperative

A farmer can make multiple deliveries.

Relationship:

    Farmer ── makes ──> Farmer Delivery

A farmer's delivery does not automatically become marketplace inventory.

---

# 9. Collection Center

A Collection Center is a physical location operated by a cooperative.

Relationship:

    Cooperative
        │
        └── operates ──> Collection Center

A cooperative may have multiple collection centers.

A collection center receives farmer deliveries.

Important information:

- Name
- Location
- Cooperative
- Operational status

---

# 10. Collection Agent

A Collection Agent is a cooperative user responsible for physical intake.

Relationship:

    Cooperative
        │
        └── employs/assigns ──> Collection Agent

The collection agent records:

- Farmer
- Collection center
- Product
- Claimed quantity
- Measured quantity
- Accepted quantity
- Rejected quantity
- Quality grade
- Date/time
- Notes

---

# 11. Product

A Product represents an agricultural commodity.

Examples:

- Maize
- Wheat
- Teff
- Coffee
- Sorghum

A Product describes WHAT is being sold.

It does NOT represent physical stock.

Example:

    Product = Maize

is different from:

    Inventory = 10,000 kg of Grade A Maize at Cooperative ABC

---

# 12. Quality Grade

V1 uses a simple quality model:

- Grade A
- Grade B
- Grade C
- Rejected

Quality grade is assigned during cooperative collection.

The grade is associated with accepted agricultural quantity.

---

# 13. Farmer Delivery

A Farmer Delivery represents a physical delivery from a farmer to a cooperative.

A delivery contains:

- Farmer
- Cooperative
- Collection center
- Product
- Claimed quantity
- Measured quantity
- Accepted quantity
- Rejected quantity
- Quality grade
- Collection agent
- Delivery date
- Status

Important rule:

    Farmer Delivery != Inventory

A delivery becomes inventory only after successful acceptance.

---

# 14. Farmer Delivery Lifecycle

Recommended lifecycle:

    RECEIVED
       ↓
    WEIGHED
       ↓
    QUALITY_CHECKED
       ↓
    ACCEPTED
       OR
    REJECTED

If accepted:

    ACCEPTED
       ↓
    INVENTORY_CREATED

If rejected:

    REJECTED
       ↓
    NO_SELLABLE_INVENTORY

---

# 15. Inventory

Inventory represents actual sellable agricultural stock owned/controlled by
the cooperative.

Inventory must represent:

- Cooperative
- Product
- Quality grade
- Quantity
- Location
- Availability
- Source/origin information
- Status

Example:

    Cooperative: ABC
    Product: Maize
    Grade: A
    Quantity: 10,000 kg
    Location: Collection Center X
    Status: AVAILABLE

---

# 16. Inventory Availability

Inventory must distinguish between:

- Available quantity
- Reserved quantity
- Committed quantity
- Dispatched quantity
- Sold/completed quantity

Example:

Total stock = 10,000 kg

Buyer orders 3,000 kg.

After order:

    Available = 7,000 kg
    Reserved = 3,000 kg

The reserved quantity cannot be purchased by another buyer.

---

# 17. Inventory Lifecycle

Conceptual lifecycle:

    AVAILABLE
        ↓
    RESERVED
        ↓
    COMMITTED
        ↓
    DISPATCHED
        ↓
    SOLD

If an order expires or is rejected:

    RESERVED
        ↓
    AVAILABLE

Important rule:

Rejected or unaccepted farmer deliveries must never appear as
available marketplace inventory.

---

# 18. Inventory Listing

An Inventory Listing exposes available cooperative inventory to buyers.

It contains information such as:

- Cooperative
- Product
- Grade
- Available quantity
- Price per unit
- Location
- Minimum order quantity
- Availability information

Buyer-visible example:

    Cooperative ABC
    Maize
    Grade A
    Available: 10,000 kg
    Price: 45 birr/kg
    Minimum order: 500 kg

The listing does NOT expose individual farmer information.

---

# 19. Pricing

The cooperative sets its own selling price.

Example:

    Product: Maize
    Grade: A
    Price: 45 birr/kg

GebeyaLink does not set the cooperative's selling price.

Market reference prices are informational only.

The cooperative's confirmed order price becomes fixed once
the cooperative accepts the order.

---

# 20. Minimum Order Quantity

V1 uses a platform-wide minimum order quantity.

Example:

    Minimum = 500 kg

Valid:

- 500 kg
- 1,000 kg
- 1,500 kg
- 2,000 kg

Invalid:

- 100 kg
- 250 kg

The actual minimum value is a configurable business parameter.

---

# 21. Order

An Order represents a buyer's request to purchase cooperative inventory.

An order belongs to:

- One buyer
- One cooperative
- One product/inventory source

Important:

    One order = One cooperative

If a buyer needs goods from multiple cooperatives,
those are separate orders.

---

# 22. Order Contents

An order contains:

- Buyer
- Cooperative
- Product
- Quality grade
- Quantity
- Unit price
- Product total
- Transport cost
- Total transaction amount where applicable
- Order status
- Creation time
- Acceptance/rejection information

---

# 23. Order Pricing

Example:

    Quantity = 3,000 kg
    Unit price = 45 birr/kg

Product value:

    3,000 × 45 = 135,000 birr

Transportation is separate.

Example:

    Product = 135,000 birr
    Transport = 15,000 birr

The product price does not silently change after acceptance.

---

# 24. Order Reservation Rule

When a buyer places an order:

    AVAILABLE
        ↓
    RESERVED

The requested quantity is immediately removed from
the available quantity.

This prevents overselling.

---

# 25. Order Response Window

The cooperative has 24 hours to respond.

Possible outcomes:

    PENDING
       ├── ACCEPTED
       ├── REJECTED
       └── EXPIRED

If the cooperative rejects:

    RESERVED → AVAILABLE

If the cooperative does not respond within 24 hours:

    RESERVED → AVAILABLE

---

# 26. Order Acceptance

When the cooperative accepts:

- Quantity becomes committed.
- Price becomes fixed.
- Order becomes commercially confirmed.
- Buyer must pay.
- Inventory cannot be offered to another buyer.

Example:

    3,000 kg × 45 birr
    = 135,000 birr

This becomes the confirmed product transaction value.

---

# 27. Order Rejection

The cooperative must provide a reason when rejecting an order.

Possible reasons:

- Insufficient actual stock
- Quality issue
- Stock already committed
- Operational problem
- Incorrect order
- Other

If "Other" is selected, an explanation should be provided.

---

# 28. Order Cancellation

Buyer:

    Can cancel before cooperative acceptance.

After acceptance:

    Normal cancellation is not allowed.

Cooperative:

    Can reject before acceptance.

After acceptance:

    Cancellation should only happen because of a legitimate
    fulfillment problem and must include a reason.

---

# 29. Partial Fulfillment

V1 does NOT support silent partial fulfillment.

If buyer orders:

    3,000 kg

The cooperative must normally commit to:

    3,000 kg

If the cooperative can only provide:

    2,400 kg

It should not silently modify the order.

The buyer can place a new order for the available amount.

---

# 30. Payment

Payment is a direct relationship:

    Buyer → Cooperative

GebeyaLink does not hold the buyer's funds in V1.

GebeyaLink records payment status.

---

# 31. Payment Timing

Full payment is required before pickup.

Flow:

    Order Accepted
         ↓
    Payment Pending
         ↓
    Buyer Pays Cooperative
         ↓
    Payment Confirmed
         ↓
    Pickup Allowed

No confirmed payment:

    No pickup

---

# 32. Payment Status

Conceptual payment states:

    PENDING
    CONFIRMED
    FAILED
    DISPUTED

The exact payment verification mechanism is a separate business/technical
decision.

---

# 33. Transportation

The cooperative is responsible for arranging transportation.

The cooperative may choose:

1. Approved GebeyaLink transporter
2. External transporter

GebeyaLink records the transport information.

---

# 34. Transport Cost

The buyer pays transportation separately.

Example:

    Product = 135,000 birr
    Transport = 15,000 birr

Transport cost does not change the cooperative's product unit price.

---

# 35. Transporter

A Transporter represents the person/company moving the goods.

Important information:

- Name
- Contact information
- Vehicle information
- Verification/approval status where applicable
- External/approved status

---

# 36. Shipment

A Shipment represents the physical movement of goods
from cooperative to buyer.

A shipment is associated with:

- Order
- Cooperative
- Transporter
- Pickup location
- Delivery location
- Goods/quantity
- Pickup information
- Delivery information
- Shipment status

---

# 37. Pickup

Pickup represents the handover from cooperative to transporter.

Pickup requires two confirmations:

### Cooperative

    "Goods were handed over."

### Transporter

    "Goods were received."

After both confirmations:

    CONFIRMED PICKUP
         ↓
    IN TRANSIT

The buyer does not need to confirm pickup.

---

# 38. Shipment Lifecycle

Conceptual lifecycle:

    TRANSPORT_PENDING
        ↓
    TRANSPORT_ASSIGNED
        ↓
    PICKUP_PENDING
        ↓
    PICKED_UP
        ↓
    IN_TRANSIT
        ↓
    DELIVERED

---

# 39. Delivery

Delivery represents arrival of the agricultural goods at the buyer.

The buyer checks the delivery.

Normal outcome:

    Transporter delivers
         ↓
    Buyer checks goods
         ↓
    Buyer confirms delivery
         ↓
    Order completed

---

# 40. Delivery Confirmation

Buyer confirms:

- Goods arrived.
- Delivered quantity appears correct.
- No major obvious issue exists.

Once confirmed:

    Shipment = DELIVERED
    Order = COMPLETED

Unless a dispute is raised.

---

# 41. Quantity Discrepancy

A buyer may report:

    Ordered quantity != Delivered quantity

Example:

    Ordered = 3,000 kg
    Delivered = 2,850 kg
    Difference = 150 kg

The discrepancy becomes a dispute.

The platform must preserve:

- Ordered quantity
- Pickup quantity
- Delivered quantity
- Disputed quantity
- Explanation
- Evidence where applicable
- Resolution

The system must not silently overwrite the original order quantity.

---

# 42. Quality Dispute

Buyer may report:

- Wrong grade
- Damaged product
- Contaminated product
- Product materially different from order

A dispute should reference:

- Order
- Buyer
- Cooperative
- Product
- Delivered quantity
- Dispute type
- Description
- Evidence
- Response
- Resolution
- Resolution date

---

# 43. Dispute Lifecycle

Conceptual lifecycle:

    OPEN
      ↓
    UNDER_REVIEW
      ↓
    COOPERATIVE_RESPONSE
      ↓
    RESOLUTION
      ↓
    RESOLVED

Possible outcomes:

- No adjustment
- Quantity adjustment
- Partial refund/agreement
- Full refund/agreement
- Replacement
- Other agreed resolution
- Escalation

---

# 44. Ownership Transfer

The intended commercial ownership boundary is:

    Cooperative
         ↓
    Delivery/Buyer Acceptance
         ↓
    Buyer

The cooperative remains responsible for the goods
during transportation until delivery/acceptance.

---

# 45. Farmer Payment

Buyer payment is made to the cooperative.

The cooperative is responsible for its own relationship
and payment arrangements with its farmers.

GebeyaLink does not directly pay farmers in V1.

GebeyaLink may record farmer delivery/value history,
but does not become the cooperative's accounting system.

---

# 46. Market Price Reference

Market price information is separate from cooperative pricing.

Example:

    Market reference = 43 birr/kg
    Cooperative price = 45 birr/kg

Market reference:

- Is informational.
- Does not control the transaction.
- Does not automatically change cooperative pricing.

---

# 47. Buyer Visibility Rules

Buyer can see:

- Cooperative
- Product
- Grade
- Available quantity
- Price
- Location
- Minimum order
- Availability
- Order status
- Shipment status

Buyer cannot normally see:

- Individual farmer names
- Farmer contribution amounts
- Farmer-level payment information
- Internal cooperative farmer records

---

# 48. Farmer Visibility Rules

Farmer can see their own relevant information, such as:

- Cooperative membership
- Own deliveries
- Delivered quantities
- Accepted quantities
- Rejected quantities
- Quality grades
- Delivery history

Farmer does not become a marketplace seller in V1.

---

# 49. Cooperative Visibility

Cooperative can see:

- Its farmers
- Farmer deliveries
- Collection centers
- Inventory
- Marketplace listings
- Buyer orders
- Payment status
- Transportation
- Shipments
- Delivery status
- Disputes
- Transaction history

---

# 50. Buyer Visibility

Buyer can see:

- Marketplace inventory
- Cooperative information
- Prices
- Product/grade information
- Own orders
- Own payments
- Own shipments
- Own deliveries
- Own disputes

Buyer cannot access another buyer's data.

---

# 51. Transaction Boundary

A complete successful transaction consists of:

    SUPPLY
      ↓
    INVENTORY
      ↓
    ORDER
      ↓
    ACCEPTANCE
      ↓
    PAYMENT
      ↓
    TRANSPORT
      ↓
    PICKUP
      ↓
    DELIVERY
      ↓
    COMPLETION

Each stage must have a clear business state.

---

# 52. Complete Happy-Path Example

## Step 1 — Farmer Delivery

Farmer A delivers:

    1,200 kg Maize

Actual weight:

    1,150 kg

Accepted after quality check:

    1,100 kg

Grade:

    A

Result:

    1,100 kg becomes sellable cooperative inventory.

---

## Step 2 — Cooperative Lists Inventory

Cooperative ABC publishes:

    Product: Maize
    Grade: A
    Quantity: 10,000 kg
    Price: 45 birr/kg
    Minimum order: 500 kg

---

## Step 3 — Buyer Orders

Buyer XYZ orders:

    3,000 kg

Product value:

    3,000 × 45
    = 135,000 birr

Inventory becomes:

    Available = 7,000 kg
    Reserved = 3,000 kg

---

## Step 4 — Cooperative Accepts

Cooperative accepts within 24 hours.

Order becomes:

    CONFIRMED

The 3,000 kg is committed to Buyer XYZ.

---

## Step 5 — Buyer Pays

Buyer pays:

    135,000 birr

Payment status:

    CONFIRMED

---

## Step 6 — Transportation

Cooperative selects transporter.

Transport cost:

    15,000 birr

Buyer pays transport separately.

---

## Step 7 — Pickup

Cooperative confirms:

    "Goods handed over."

Transporter confirms:

    "Goods received."

Shipment becomes:

    IN_TRANSIT

---

## Step 8 — Delivery

Transporter delivers:

    3,000 kg

Buyer confirms delivery.

Order becomes:

    COMPLETED

---

# 53. Important Business Invariants

These rules must NEVER be violated by the system.

## Invariant 1

A rejected farmer delivery cannot become sellable inventory.

---

## Invariant 2

Reserved inventory cannot be sold to another buyer.

---

## Invariant 3

An expired/rejected order releases its reservation.

---

## Invariant 4

A cooperative must accept an order before it becomes commercially confirmed.

---

## Invariant 5

The confirmed order price cannot silently change.

---

## Invariant 6

Full product payment must be confirmed before pickup.

---

## Invariant 7

One order belongs to one cooperative.

---

## Invariant 8

Partial fulfillment is not silently allowed.

---

## Invariant 9

Buyer payment goes directly to the cooperative in V1.

---

## Invariant 10

Transportation is arranged by the cooperative.

---

## Invariant 11

Transportation cost is separate from the product price.

---

## Invariant 12

Pickup requires cooperative and transporter confirmation.

---

## Invariant 13

Delivery requires buyer confirmation under the normal flow.

---

## Invariant 14

Individual farmers are not marketplace sellers in V1.

---

## Invariant 15

Buyers see the cooperative as the seller.

---

## Invariant 16

Farmer-level information is not exposed to buyers.

---

## Invariant 17

A buyer cannot purchase more inventory than is available.

---

## Invariant 18

A dispute must not silently modify the original transaction history.

---

# 54. V1 State Model

## Farmer Delivery

```text
RECEIVED
   ↓
WEIGHED
   ↓
QUALITY_CHECKED
   ├── ACCEPTED → INVENTORY_CREATED
   └── REJECTED
Inventory
AVAILABLE
   ↓
RESERVED
   ↓
COMMITTED
   ↓
DISPATCHED
   ↓
SOLD

Reservation can return:

RESERVED → AVAILABLE

when an order is rejected or expires.

Order
PLACED
   ↓
PENDING_ACCEPTANCE
   ├── ACCEPTED
   │     ↓
   │  PAYMENT_PENDING
   │     ↓
   │  PAYMENT_CONFIRMED
   │     ↓
   │  TRANSPORT_PENDING
   │     ↓
   │  PICKUP_CONFIRMED
   │     ↓
   │  IN_TRANSIT
   │     ↓
   │  DELIVERED
   │     ↓
   │  COMPLETED
   │
   ├── REJECTED
   │
   └── EXPIRED

Exception paths:

ACCEPTED → CANCELLED
DELIVERED → DISPUTED → RESOLVED
55. Domain Relationships

The conceptual relationships are:

Farmer
  │
  ├── belongs to ──────────────> Cooperative
  │
  └── makes ───────────────────> Farmer Delivery
                                      │
                                      ├── Product
                                      ├── Collection Center
                                      ├── Collection Agent
                                      └── Quality Grade
                                              │
                                              ↓
                                         Inventory
                                              │
                                              ↓
                                      Inventory Listing
                                              │
                                              ↓
                                           Order
                                          /     \
                                         /       \
                                    Buyer       Cooperative
                                      │             │
                                      │             │
                                      ↓             ↓
                                   Payment      Transporter
                                                    │
                                                    ↓
                                                 Shipment
                                                    │
                              ┌─────────────────────┴──────────────────┐
                              ↓                                        ↓
                           Pickup                                  Delivery
                                                                       │
                                                                       ↓
                                                                    Buyer
                                                                       │
                                                                       ↓
                                                                   Dispute
56. Aggregate Business Boundaries

The following are conceptual business boundaries.

Cooperative Supply

Responsible for:

Farmers
Collection Centers
Farmer Deliveries
Quality assessment
Inventory creation
Marketplace

Responsible for:

Inventory visibility
Pricing
Listings
Buyer discovery
Orders
Reservations
Transaction

Responsible for:

Order
Commercial commitment
Payment status
Cancellation
Logistics

Responsible for:

Transporter
Shipment
Pickup
Delivery
Dispute Management

Responsible for:

Quantity discrepancies
Quality disputes
Investigation
Resolution
57. What V1 Deliberately Leaves for Later

The following are future capabilities, not V1 requirements:

Individual farmer direct selling
Buyer/cooperative negotiation
Buyer credit
Payment-after-delivery
GebeyaLink-held funds
Advanced quality laboratory workflows
Automated transporter assignment
Advanced route optimization
Warehouse management
Export workflows
International buyers
Commodity exchange functionality
Advanced farmer payments
Advanced ratings
Dynamic pricing
Automated market-price pricing
Complex auction mechanisms
58. Future Direct Farmer Marketplace

The current model intentionally prepares for a future capability:

V1:

Farmer
   ↓
Cooperative
   ↓
GebeyaLink
   ↓
Buyer

Future:

Farmer ───────────────┐
                      │
Cooperative ──────────┼──> GebeyaLink ──> Buyer
                      │
Other approved sellers ┘

The V1 business model must not be designed in a way that
makes future direct farmer selling impossible.

However, direct farmer selling is NOT active in V1.

59. Business Glossary
Term	Meaning
Farmer	Cooperative member/supplier
Cooperative	Agricultural organization acting as marketplace seller
Collection Center	Physical location where cooperative receives farmer goods
Collection Agent	Cooperative staff member handling physical intake
Product	Agricultural commodity such as maize or wheat
Grade	Quality classification A/B/C/Rejected
Farmer Delivery	Physical goods delivered by farmer to cooperative
Inventory	Accepted, sellable agricultural stock
Listing	Marketplace representation of sellable inventory
Buyer	Verified commercial purchaser
Order	Buyer's request to purchase cooperative inventory
Reservation	Temporary lock on inventory after order placement
Commitment	Confirmed inventory after cooperative acceptance
Payment	Buyer payment to cooperative
Transporter	Party physically transporting goods
Shipment	Movement of goods from cooperative to buyer
Pickup	Handover from cooperative to transporter
Delivery	Arrival of goods at buyer
Dispute	Formal disagreement about quantity, quality, or fulfillment
Market Reference Price	Informational external/reference price
Completed Transaction	Successfully delivered and accepted order
60. Source-of-Truth Rule

When implementing GebeyaLink, this document should be treated as
the business source of truth.

If a proposed feature conflicts with these rules, do not
silently change the business behavior.

Instead:

Identify the conflict.
Explain which business rule is affected.
Ask for a business decision.
Update this document after the decision is approved.

Technical implementation should follow the approved business model,
not redefine it accidentally.

61. Golden Business Flow

The canonical GebeyaLink flow is:

FARMER
  ↓
COOPERATIVE COLLECTION CENTER
  ↓
WEIGH + QUALITY CHECK
  ↓
ACCEPTED DELIVERY
  ↓
COOPERATIVE INVENTORY
  ↓
MARKETPLACE LISTING
  ↓
BUYER
  ↓
ORDER
  ↓
INVENTORY RESERVED
  ↓
COOPERATIVE ACCEPTS
  ↓
COMMERCIAL COMMITMENT
  ↓
BUYER PAYS COOPERATIVE
  ↓
PAYMENT CONFIRMED
  ↓
COOPERATIVE ARRANGES TRANSPORT
  ↓
PICKUP
  ↓
TRANSPORT
  ↓
BUYER DELIVERY
  ↓
BUYER CONFIRMS
  ↓
COMPLETED TRANSACTION