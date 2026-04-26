/** Title shown in the top header for the current dashboard route. */

export function getDashboardPageTitle(pathname: string): string {
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return 'Dashboard';
  }
  if (pathname.startsWith('/dashboard/notifications')) return 'Notifications';
  if (pathname.startsWith('/dashboard/users')) return 'Users';
  if (pathname.startsWith('/dashboard/account')) return 'Account';
  if (pathname.startsWith('/dashboard/bookings/restaurants')) {
    return 'Restaurant bookings';
  }
  if (pathname.startsWith('/dashboard/bookings')) return 'Bookings';
  if (pathname.startsWith('/dashboard/events')) return 'Event nights';
  if (pathname.startsWith('/dashboard/restaurants')) return 'Restaurants';
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  return 'Admin';
}
