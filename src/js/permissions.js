const MATRIX = {
  clock: ['CANDIDATE', 'HOST'],
  leaveRequest: ['CANDIDATE'],
  leaveApproval: ['ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER'],
  correctionApproval: ['ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER'],
};

export function can(role, permission) {
  return MATRIX[permission]?.includes(role) === true;
}
