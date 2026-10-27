# 03. The 12-Step Booking Lifecycle & Escrow State Machine

AgriRent enforces a strict 12-step booking state machine managed by `backend/api/workflow_service.py` (`transition_booking_status`). The system ensures complete financial protection via automated escrow deposits, delivery validation, and dispute prevention.

---

## State Machine Diagram

```
[ Step 1: DRAFT (Cart) ]
         │
         ▼
[ Step 2: SUBMITTED (Pending Owner Review) ]
         │
         ├──────────────────────────┐
         │ (Owner Declines)         │ (Owner Approves)
         ▼                          ▼
[ Step 2B: REJECTED ]        [ Step 3: APPROVED ]
 (Escrow Refunded)                  │
                                    ├──────────────────────────┐
                                    │ (Requires Operator)      │ (Self-Pickup)
                                    ▼                          ▼
                             [ Step 4: OPERATOR_REQUESTED ] [ Step 5: IN_TRANSIT ]
                                    │
                                    ▼
                             [ Step 4B: OPERATOR_ASSIGNED ]
                                    │
                                    ▼
                             [ Step 5: IN_TRANSIT ]
                                    │
                                    ▼
                             [ Step 6: ARRIVED_AT_FARM ]
                                    │
                                    ▼
                             [ Step 7: PRE_OPERATION_INSPECTION ]
                                    │
                                    ▼
                             [ Step 8: IN_PROGRESS (Field Work) ]
                                    │
                                    ▼
                             [ Step 9: POST_OPERATION_INSPECTION ]
                                    │
                                    ▼
                             [ Step 10: COMPLETED ]
                              (Escrow Released)
                                    │
                                    ▼
                             [ Step 11: SETTLED & RATED ]
                                    │
                                    ▼
                             [ Step 12: CLOSED ]
```

---

## Detailed Step Walkthrough

### Step 1: Draft / Cart Configuration
- Farmer selects machinery in `EquipmentDetailDrawer.jsx` or AI Suitability Matcher.
- Configures shift duration (hourly or 8-hour daily shift), dates, delivery preference (`Pickup` vs `Delivery`), and toggles `Requires Operator`.
- Item is staged in `SmartBookingCart.jsx`.

### Step 2: Submitted / Pre-Authorization (Status: `Pending`)
- Farmer clicks `"Review & Confirm Booking"` in `BookingReviewModal.jsx`.
- Escrow pre-authorization is secured (via Razorpay or simulated payment).
- Escrow status is set to `Held`.
- Equipment owner receives an immediate notification of the new reservation request.

### Step 3: Owner Approval (Status: `Approved`)
- Equipment owner reviews dates, location, and farmer profile in `OwnerDashboard.jsx`.
- Owner clicks `"Approve"` (`PATCH /api/bookings/:id/status/` with `status: 'Approved'`).
- The machine is marked unavailable (`is_available = False`) to prevent double-booking.
- If the farmer requested an operator, the backend automatically triggers AI proximity dispatch.

### Step 4: Operator Dispatch & Matching (Status: `Approved` or `Awaiting Dispatch`)
- `dispatch_booking_to_matching_operators` ranks certified nearby drivers using machine compatibility, distance, rating, and availability.
- A job offer is dispatched to the top-ranked driver.
- When the driver accepts, status updates to `ACCEPTED`, linking `booking.operator_assigned = operator_user`.

### Step 5: Transit to Farm (Status: `In Transit`)
- If delivery or operator-assisted: the driver/owner transports machinery to the farmer's field coordinates.
- Farmer can track progress live in `live-mission` tab with GPS telemetry and estimated arrival time.

### Step 6: Arrival at Farm (Status: `Arrived`)
- Operator or owner marks arrival at the farm boundary.
- Farmer receives arrival notification.

### Step 7: Pre-Operation Inspection & Handover
- Machine hours, fuel level, and implement condition are verified by farmer and operator before starting work.

### Step 8: Field Operation Underway (Status: `In Progress`)
- Field plowing, harvesting, or spraying commences.
- Both owner and farmer dashboards reflect active operational state.

### Step 9: Field Completion & Post-Operation Check
- Farm work concludes. Both parties inspect implement condition and verify acreage covered.

### Step 10: Completion & Escrow Payout (Status: `Completed`)
- Either owner or farmer clicks `"Complete Rental"` / `"Complete Job"`.
- Escrow engine automatically updates status from `Held` to `Released`.
- Machine is restored to available (`is_available = True`).
- Payout is credited to owner ledger (95% net after 5% platform service fee) and driver compensation is awarded.

### Step 11: Mutual Rating & Settlement
- Farmer rates machine performance and operator reliability (1 to 5 stars).
- Owner and driver rate farmer field coordination.

### Step 12: Officially Closed (Status: `Closed`)
- Final invoice receipt is generated and permanently stored in payment history.

---

## Cancellation & Refund Rules

1. **Farmer Cancellation**:
   - Allowed when booking is in `Pending` or `Approved` status prior to machine dispatch.
   - Action: Farmer clicks `"Cancel Rent"` in `FarmerDashboard.jsx`.
   - Result: Booking transitions to `Cancelled`, equipment availability is unlocked, and escrow funds are marked `Refunded`.
2. **Owner Rejection**:
   - Owner clicks `"Reject"` on a pending booking.
   - Result: Booking transitions to `Rejected`, escrow funds are immediately marked `Refunded`, and the farmer is notified.
3. **Mid-Operation Dispute**:
   - If mechanical breakdown occurs during `In Progress` status, either party can file a dispute ticket in `SupportCenter.jsx`.
   - Escrow funds remain frozen until Admin review.
