// Simple in-memory state for pending slip approvals
// Key: userId, Value: { slipId, timestamp }

interface PendingApproval {
  slipId: number;
  userId: number;
  timestamp: number;
}

const pendingApprovals = new Map<string, PendingApproval>();

export function setPendingApproval(adminUserId: string, slipId: number, targetUserId: number) {
  pendingApprovals.set(adminUserId, {
    slipId,
    userId: targetUserId,
    timestamp: Date.now(),
  });
}

export function getPendingApproval(adminUserId: string): PendingApproval | undefined {
  const approval = pendingApprovals.get(adminUserId);

  // Clear approvals older than 5 minutes
  if (approval && Date.now() - approval.timestamp > 5 * 60 * 1000) {
    pendingApprovals.delete(adminUserId);
    return undefined;
  }

  return approval;
}

export function clearPendingApproval(adminUserId: string) {
  pendingApprovals.delete(adminUserId);
}
