const MATRIX = {
  createOrganisation: ['PLATFORM_ADMIN'],
  createHost: ['PLATFORM_ADMIN', 'ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER'],
  createCandidate: ['PLATFORM_ADMIN', 'ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER'],
  clock: ['CANDIDATE', 'HOST'],
  leaveRequest: ['CANDIDATE'],
  leaveApproval: ['ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER'],
  correctionApproval: ['ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER'],
};

export function can(role, permission) {
  return MATRIX[permission]?.includes(role) === true;
}
