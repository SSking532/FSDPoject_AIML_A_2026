import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/DataContext';

export const ACTIVE_REQUEST_STATUSES = [
  'PENDING',
  'NO_AMBULANCE_AVAILABLE',
  'ASSIGNED',
  'ACCEPTED',
  'EN_ROUTE',
  'ARRIVED',
  'IN_TRANSIT'
];

/** Everything the driver screens need, derived once. */
export function useDriverData() {
  const { user } = useAuth();
  const data = useAppData();
  const { drivers, ambulances, assignments, requests, trips, hospitals, isLive } = data;

  return useMemo(() => {
    const driver =
      drivers.find((d) => d.userId === user?.id || d.id === user?.driverId) ||
      (isLive ? null : drivers[0]) ||
      null;
    const ambulance = ambulances.find((a) => a.id === driver?.assignedAmbulanceId) || null;
    const mine = (x) =>
      driver && (x.driverId === driver.id || (ambulance && x.ambulanceId === ambulance.id));
    const myAssignments = assignments.filter(mine);
    const offers = myAssignments
      .filter((a) => a.status === 'PENDING_ACCEPTANCE')
      .map((a) => ({
        assignment: a,
        request: requests.find((r) => r.id === a.requestId) || null,
        hospital: hospitals.find((h) => h.id === a.hospitalId) || null
      }));
    const myTrips = trips.filter(mine);
    const activeTrip = myTrips.find((t) => t.status !== 'COMPLETED') || null;
    const completedTrips = myTrips
      .filter((t) => t.status === 'COMPLETED')
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    return {
      driver,
      ambulance,
      myAssignments,
      offers,
      activeTrip,
      activeRequest: activeTrip ? requests.find((r) => r.id === activeTrip.requestId) : null,
      completedTrips,
      isApproved: !driver || driver.verificationStatus === 'VERIFIED',
      isOnline: driver?.availability === 'ONLINE'
    };
  }, [user, drivers, ambulances, assignments, requests, trips, hospitals, isLive]);
}

/** The signed-in patient's requests, newest first, and their current one. */
export function usePatientRequests() {
  const { user } = useAuth();
  const { requests, isLive } = useAppData();
  return useMemo(() => {
    const mine = requests
      .filter((r) => isLive || r.patientId === user?.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { mine, active: mine.find((r) => ACTIVE_REQUEST_STATUSES.includes(r.status)) || null };
  }, [requests, user, isLive]);
}