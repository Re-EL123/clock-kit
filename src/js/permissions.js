const MATRIX = {
  createOrganisation: ['PLATFORM_ADMIN'],
  createHost: ['PLATFORM_ADMIN', 'ORG_OWNER', 'ORG_ADMIN'],
  createCandidate: ['PLATFORM_ADMIN', 'ORG_OWNER', 'ORG_ADMIN'],
  createSite: ['PLATFORM_ADMIN', 'ORG_OWNER', 'ORG_ADMIN'],
  updateSite: ['PLATFORM_ADMIN', 'ORG_OWNER', 'ORG_ADMIN'],
  createOrgUser: ['PLATFORM_ADMIN', 'ORG_OWNER', 'ORG_ADMIN'],
  assignManager: ['PLATFORM_ADMIN', 'ORG_OWNER', 'ORG_ADMIN'],
  assignCandidate: ['PLATFORM_ADMIN', 'ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER'],
  updateAnyRecord: ['PLATFORM_ADMIN'],
  deleteAnyRecord: ['PLATFORM_ADMIN'],
  clock: ['CANDIDATE', 'HOST'],
  leaveRequest: ['CANDIDATE'],
  leaveApproval: ['ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER'],
  correctionApproval: ['ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER'],
  hostConfirmAttendance: ['HOST'],
  updateHostCandidate: ['HOST'],
  exportAttendance: ['ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER'],
  viewAudit: ['PLATFORM_ADMIN', 'ORG_OWNER', 'ORG_ADMIN'],
};

export function can(role, permission) {
  return MATRIX[permission]?.includes(role) === true;
}
