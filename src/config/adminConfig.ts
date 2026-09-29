/**
 * Telegram Admin Authorization Configuration
 * 
 * Replace or add your Telegram User ID(s) in ADMIN_IDS.
 * Only users matching these IDs will have the Admin menu item and header controls rendered.
 */

// Add your specific Telegram User ID here (both number and string are supported)
export const ADMIN_IDS: (number | string)[] = [
  616058357285, // Current project/environment Telegram ID
  // Add your personal Telegram User ID here, e.g.:
  // 123456789,
];

/**
 * Validates if the current user ID belongs to the authorized admin list.
 */
export function checkIsAuthorizedAdmin(userId?: number | string | null): boolean {
  if (typeof window === 'undefined') return false;

  const currentUserId =
    userId ??
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  if (currentUserId !== undefined && currentUserId !== null) {
    const isMatched = ADMIN_IDS.some(
      (adminId) => String(adminId).trim() === String(currentUserId).trim()
    );
    if (isMatched) return true;
  }

  // Developer fallback & query-param testing: ?admin=true or ?admin_id=<id>
  try {
    const params = new URLSearchParams(window.location.search);
    const queryAdminId = params.get('admin_id');
    if (queryAdminId && ADMIN_IDS.some((adminId) => String(adminId).trim() === queryAdminId.trim())) {
      return true;
    }
    if (params.get('admin') === 'true' || localStorage.getItem('atlas_admin_enabled') === 'true') {
      return true;
    }
  } catch {}

  return false;
}
