from datetime import datetime
from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import ValidationError, PermissionDenied
from .models import Booking, Notification, OperatorJobAssignment, Equipment

# Strict 12-Step Booking State Machine
ALLOWED_STATUS_TRANSITIONS = {
    'Pending': ['Approved', 'Rejected', 'Cancelled'],
    'Approved': ['Awaiting Dispatch', 'In Transit', 'In Progress', 'Cancelled', 'Rejected'],
    'Awaiting Dispatch': ['In Transit', 'Cancelled'],
    'In Transit': ['Arrived', 'Cancelled'],
    'Arrived': ['In Progress', 'Cancelled'],
    'In Progress': ['Completed', 'Cancelled'],
    'Completed': ['Closed'],
    'Closed': [],
    'Rejected': [],
    'Cancelled': []
}

def transition_booking_status(booking, new_status, actor_user, reason=''):
    """
    Enforces strict 12-step state machine transitions and permissions:
    Pending -> Approved -> Awaiting Dispatch -> In Transit -> Arrived -> In Progress -> Completed -> Closed
    """
    # 1. RBAC Permission Checks first
    is_owner = (booking.equipment.owner == actor_user)
    is_farmer = (booking.farmer == actor_user)
    is_operator = (booking.operator_assigned == actor_user) or (
        hasattr(actor_user, 'operator_profile') and 
        booking.operator_assignments.filter(operator=actor_user.operator_profile, status__in=['ACCEPTED', 'IN_PROGRESS', 'ARRIVED_AT_FARM']).exists()
    )
    is_admin = (actor_user.role == 'Admin')

    if new_status in ['Approved', 'Rejected']:
        if not (is_owner or is_admin):
            raise PermissionDenied("Only the equipment owner or Admin can approve/reject bookings.")

    elif new_status == 'Cancelled':
        if not (is_farmer or is_owner or is_admin):
            raise PermissionDenied("Unauthorized cancellation.")
        if booking.status in ['Completed', 'Closed']:
            raise ValidationError(f"Cannot cancel a booking that is already '{booking.status}'.")

    elif new_status in ['Awaiting Dispatch', 'In Transit', 'Arrived']:
        if not (is_owner or is_operator or is_admin):
            raise PermissionDenied("Only the equipment owner, assigned operator, or Admin can update delivery/arrival tracking.")

    elif new_status == 'In Progress':
        if not (is_operator or is_owner or is_farmer or is_admin):
            raise PermissionDenied("Unauthorized to start fieldwork on this booking.")

    elif new_status == 'Completed':
        if not (is_operator or is_owner or is_farmer or is_admin):
            raise PermissionDenied("Unauthorized to complete this booking.")

    elif new_status == 'Closed':
        if not (is_farmer or is_owner or is_admin):
            raise PermissionDenied("Only farmer, owner, or admin can close the completed booking.")

    # 2. State sequence transition check
    current_status = booking.status
    allowed_next = ALLOWED_STATUS_TRANSITIONS.get(current_status, [])

    if new_status not in allowed_next:
        raise ValidationError(
            f"Invalid transition from '{current_status}' to '{new_status}'. Permitted: {allowed_next}"
        )

    now = timezone.now()

    with transaction.atomic():
        # Append audit trail note (maintaining backward-compatible tag)
        audit_entry = f" [Status Transition] {current_status} -> {new_status} at {now.isoformat()} by {actor_user.username} ({actor_user.role})"
        if reason:
            audit_entry += f" | Reason: {reason}"
        booking.notes = (booking.notes or '') + audit_entry

        booking.status = new_status

        # Escrow and Availability side effects
        if new_status in ['Completed', 'Closed']:
            booking.escrow_status = 'Released'
            # Release equipment availability
            booking.equipment.is_available = True
            booking.equipment.save()

        elif new_status in ['Rejected', 'Cancelled']:
            booking.escrow_status = 'Refunded'
            # Release equipment availability
            booking.equipment.is_available = True
            booking.equipment.save()

        elif new_status == 'Approved':
            booking.equipment.is_available = False
            booking.equipment.save()

        booking.save()

        # Idempotent notifications
        notify_parties(booking, new_status, actor_user)

    return booking


def notify_parties(booking, new_status, actor_user):
    """
    Step 9 & 11: Idempotently notifies all relevant parties (Farmer, Owner, Operator).
    """
    farmer = booking.farmer
    owner = booking.equipment.owner
    operator_user = booking.operator_assigned

    msg_map = {
        'Approved': f"Booking #{booking.id} for {booking.equipment.title} has been APPROVED by owner.",
        'Rejected': f"Booking #{booking.id} for {booking.equipment.title} was declined by owner.",
        'Cancelled': f"Booking #{booking.id} has been cancelled.",
        'Awaiting Dispatch': f"Equipment {booking.equipment.title} is queued and awaiting dispatch.",
        'In Transit': f"Equipment {booking.equipment.title} is now IN TRANSIT to your farm location.",
        'Arrived': f"Equipment {booking.equipment.title} has ARRIVED at the farm destination.",
        'In Progress': f"Farming fieldwork has commenced for Booking #{booking.id}.",
        'Completed': f"Farming work COMPLETED for Booking #{booking.id}. Escrow funds marked for payout.",
        'Closed': f"Booking #{booking.id} is officially CLOSED. Equipment released for future reservations."
    }

    content = msg_map.get(new_status, f"Booking #{booking.id} status updated to: {new_status}.")

    recipients = set()
    if actor_user != farmer:
        recipients.add(farmer)
    if actor_user != owner:
        recipients.add(owner)
    if operator_user and actor_user != operator_user:
        recipients.add(operator_user)

    for recipient in recipients:
        Notification.objects.create(
            user=recipient,
            content=content
        )
