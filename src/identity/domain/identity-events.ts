import { AuthRole } from './auth-role';
import { DomainEventDraft } from './domain-event';

const occurredAt = () => new Date().toISOString();

export function userRegisteredEvent(params: {
  userId: string;
  email: string;
  role: Extract<AuthRole, 'CUSTOMER' | 'SELLER'>;
}): DomainEventDraft {
  return {
    topic: 'auth.user.registered.v1',
    type: 'auth.user.registered.v1',
    payload: {
      userId: params.userId,
      email: params.email,
      role: params.role,
      occurredAt: occurredAt()
    }
  };
}

export function passwordResetRequestedEvent(params: { userId: string; email: string; resetToken: string }): DomainEventDraft {
  return {
    topic: 'auth.user.password_reset_requested.v1',
    type: 'auth.user.password_reset_requested.v1',
    payload: {
      userId: params.userId,
      email: params.email,
      resetToken: params.resetToken,
      occurredAt: occurredAt()
    }
  };
}

export function passwordChangedEvent(params: { userId: string; email: string }): DomainEventDraft {
  return {
    topic: 'auth.user.password_changed.v1',
    type: 'auth.user.password_changed.v1',
    payload: {
      userId: params.userId,
      email: params.email,
      occurredAt: occurredAt()
    }
  };
}

export function mfaEnrollmentRequestedEvent(params: { userId: string; email: string; challengeId: string; code: string }): DomainEventDraft {
  return {
    topic: 'auth.mfa.enrollment_requested.v1',
    type: 'auth.mfa.enrollment_requested.v1',
    payload: {
      userId: params.userId,
      email: params.email,
      challengeId: params.challengeId,
      code: params.code,
      occurredAt: occurredAt()
    }
  };
}

export function mfaEnabledEvent(params: { userId: string; email: string }): DomainEventDraft {
  return {
    topic: 'auth.mfa.enabled.v1',
    type: 'auth.mfa.enabled.v1',
    payload: {
      userId: params.userId,
      email: params.email,
      occurredAt: occurredAt()
    }
  };
}

export function mfaChallengeRequestedEvent(params: { userId: string; email: string; challengeId: string; code: string }): DomainEventDraft {
  return {
    topic: 'auth.mfa.challenge_requested.v1',
    type: 'auth.mfa.challenge_requested.v1',
    payload: {
      userId: params.userId,
      email: params.email,
      challengeId: params.challengeId,
      code: params.code,
      occurredAt: occurredAt()
    }
  };
}

export function mfaDisabledEvent(params: { userId: string; email: string }): DomainEventDraft {
  return {
    topic: 'auth.mfa.disabled.v1',
    type: 'auth.mfa.disabled.v1',
    payload: {
      userId: params.userId,
      email: params.email,
      occurredAt: occurredAt()
    }
  };
}

export function userRolesChangedEvent(params: { userId: string; roles: AuthRole[]; actorUserId: string }): DomainEventDraft {
  return {
    topic: 'auth.user.roles_changed.v1',
    type: 'auth.user.roles_changed.v1',
    payload: {
      userId: params.userId,
      roles: params.roles,
      actorUserId: params.actorUserId,
      occurredAt: occurredAt()
    }
  };
}

export function userDeactivatedEvent(params: { userId: string; email: string; reason?: string }): DomainEventDraft {
  return {
    topic: 'auth.user.deactivated.v1',
    type: 'auth.user.deactivated.v1',
    payload: {
      userId: params.userId,
      email: params.email,
      reason: params.reason,
      occurredAt: occurredAt()
    }
  };
}

export function userDeletionRequestedEvent(params: { userId: string; email: string; reason?: string }): DomainEventDraft {
  return {
    topic: 'auth.user.deletion_requested.v1',
    type: 'auth.user.deletion_requested.v1',
    payload: {
      userId: params.userId,
      email: params.email,
      reason: params.reason,
      occurredAt: occurredAt()
    }
  };
}

