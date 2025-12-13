/**
 * Admin context management for targeting customers
 * Allows admins to set a "current customer" and then send commands
 */

interface AdminContext {
  targetLineUserId: string;
  targetUserName: string;
  setAt: Date;
}

const adminContexts = new Map<string, AdminContext>();

export function setAdminTargetUser(adminLineUserId: string, targetLineUserId: string, userName: string) {
  adminContexts.set(adminLineUserId, {
    targetLineUserId: targetLineUserId,
    targetUserName: userName,
    setAt: new Date(),
  });
}

export function getAdminTargetUser(adminLineUserId: string): AdminContext | null {
  return adminContexts.get(adminLineUserId) || null;
}

export function clearAdminTargetUser(adminLineUserId: string) {
  adminContexts.delete(adminLineUserId);
}

export function clearExpiredContexts() {
  const now = new Date();
  const oneHour = 60 * 60 * 1000;

  for (const [adminId, context] of adminContexts.entries()) {
    if (now.getTime() - context.setAt.getTime() > oneHour) {
      adminContexts.delete(adminId);
    }
  }
}

// Clear expired contexts every 30 minutes
setInterval(clearExpiredContexts, 30 * 60 * 1000);
