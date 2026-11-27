import {
  Activity,
  Ambulance,
  BarChart3,
  Building2,
  ClipboardList,
  History,
  LayoutDashboard,
  MapPin,
  Navigation,
  PhoneCall,
  Route,
  UserCheck,
  UserCircle2
} from 'lucide-react';

export const ROLE_NAV_CONFIG = {
  patient: [
    { label: 'Home', short: 'Home', to: '/patient/dashboard', icon: LayoutDashboard },
    { label: 'Request an ambulance', short: 'Request', to: '/patient/request', icon: PhoneCall },
    { label: 'Live tracking', short: 'Track', to: '/patient/tracking/active', icon: Navigation },
    { label: 'Request history', short: 'History', to: '/patient/history', icon: History },
    { label: 'Profile', short: 'Profile', to: '/patient/profile', icon: UserCircle2 }
  ],
  driver: [
    { label: 'Today’s shift', short: 'Shift', to: '/driver/dashboard', icon: LayoutDashboard },
    { label: 'Jobs', short: 'Jobs', to: '/driver/assignments', icon: ClipboardList },
    { label: 'Active trip', short: 'Trip', to: '/driver/trip/active', icon: Route },
    { label: 'Trip history', short: 'History', to: '/driver/history', icon: History },
    { label: 'Profile', short: 'Profile', to: '/driver/profile', icon: UserCircle2 }
  ],
  admin: [
    { label: 'Command center', short: 'Home', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Emergency requests', short: 'Requests', to: '/admin/requests', icon: Activity },
    { label: 'Live tracking', short: 'Map', to: '/admin/tracking', icon: MapPin },
    { label: 'Allocate', short: 'Allocate', to: '/admin/assignments', icon: ClipboardList },
    { label: 'Ambulances', to: '/admin/ambulances', icon: Ambulance },
    { label: 'Drivers', to: '/admin/drivers', icon: UserCheck },
    { label: 'Hospitals', to: '/admin/hospitals', icon: Building2 },
    { label: 'Trips', to: '/admin/trips', icon: Route },
    { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
    { label: 'Profile', to: '/admin/profile', icon: UserCircle2 }
  ]
};

export const ROLE_LABELS = {
  patient: 'Patient portal',
  driver: 'Driver console',
  admin: 'Dispatch room'
};