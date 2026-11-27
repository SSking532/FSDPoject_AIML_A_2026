import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import {
  INITIAL_ACTIVITY,
  INITIAL_AMBULANCES,
  INITIAL_ASSIGNMENTS,
  INITIAL_DRIVERS,
  INITIAL_HOSPITALS,
  INITIAL_REQUESTS,
  INITIAL_TRIPS
} from '../data/mockData';
import { USE_MOCK_DATA } from '../services/api';
import { ambulanceService } from '../services/ambulanceService';
import { assignmentService } from '../services/assignmentService';
import { dashboardService } from '../services/dashboardService';
import { driverService } from '../services/driverService';
import { hospitalService } from '../services/hospitalService';
import { requestService } from '../services/requestService';
import { trackingService } from '../services/trackingService';
import { isValidTripTransition, tripService } from '../services/tripService';
import { wsService } from '../services/wsService';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

const DATA_STORAGE_KEY = 'smart_ambulance_dev_state_v2';
const LIVE = !USE_MOCK_DATA;

/** Ambulance status that follows each trip status (mirrors the backend). */
export const AMBULANCE_STATUS_FOR_TRIP = {
  ACCEPTED: 'ASSIGNED',
  EN_ROUTE: 'EN_ROUTE',
  ARRIVED: 'ON_TRIP',
  IN_TRANSIT: 'ON_TRIP',
  COMPLETED: 'AVAILABLE'
};

const DataContext = createContext(null);

function getSeedState() {
  return {
    requests: INITIAL_REQUESTS,
    ambulances: INITIAL_AMBULANCES,
    drivers: INITIAL_DRIVERS,
    assignments: INITIAL_ASSIGNMENTS,
    trips: INITIAL_TRIPS,
    hospitals: INITIAL_HOSPITALS,
    activity: INITIAL_ACTIVITY
  };
}

function getEmptyState() {
  return {
    requests: [],
    ambulances: [],
    drivers: [],
    assignments: [],
    trips: [],
    hospitals: [],
    activity: []
  };
}

function loadState() {
  if (LIVE) return getEmptyState();
  try {
    const raw = localStorage.getItem(DATA_STORAGE_KEY);
    if (!raw) return getSeedState();
    return { ...getSeedState(), ...JSON.parse(raw) };
  } catch {
    return getSeedState();
  }
}

const shortId = (prefix, min, span) => `${prefix}-${Math.floor(min + Math.random() * span)}`;

export function DataProvider({ children }) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [state, setState] = useState(loadState);
  const [syncing, setSyncing] = useState(LIVE);
  const [syncError, setSyncError] = useState('');
  const [connection, setConnection] = useState(LIVE ? 'connecting' : 'demo');
  const refreshTimer = useRef(null);

  // ------------------------------------------------------------ live sync
  const refresh = useCallback(async () => {
    if (!LIVE || !user) return;
    try {
      const [requests, ambulances, drivers, assignments, trips, hospitals, activity] =
        await Promise.all([
          requestService.list(),
          ambulanceService.list(),
          driverService.list(),
          assignmentService.list(),
          tripService.list(),
          hospitalService.list(),
          user.role === 'admin' ? dashboardService.activity(25) : Promise.resolve([])
        ]);
      setState({ requests, ambulances, drivers, assignments, trips, hospitals, activity });
      setSyncError('');
    } catch (err) {
      setSyncError(err.message || 'Could not reach the server.');
    } finally {
      setSyncing(false);
    }
  }, [user]);

  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refresh, 150);
  }, [refresh]);

  useEffect(() => {
    if (!LIVE) return undefined;
    if (!user) {
      setState(getEmptyState());
      setSyncing(true);
      return undefined;
    }
    refresh();
    // Safety net in case a WebSocket frame is missed.
    const poll = setInterval(refresh, 30000);
    return () => clearInterval(poll);
  }, [user, refresh]);

  useEffect(() => {
    if (!LIVE) return undefined;
    const offConn = wsService.subscribe('connection', ({ status }) => {
      setConnection(status);
      if (status === 'live') scheduleRefresh();
    });
    setConnection(wsService.status === 'idle' ? 'connecting' : wsService.status);

    const offLoc = wsService.subscribe('location:update', (loc) => {
      setState((prev) => ({
        ...prev,
        ambulances: prev.ambulances.map((a) =>
          a.id === loc.ambulanceId
            ? {
                ...a,
                lat: loc.lat,
                lng: loc.lng,
                currentLocation: loc.currentLocation || a.currentLocation,
                lastUpdated: loc.updatedAt
              }
            : a
        )
      }));
    });

    const offAny = wsService.subscribe('*', (payload) => {
      if (payload.event === 'connected' || payload.event === 'location:update') return;
      if (payload.notification) addNotification(payload.notification);
      scheduleRefresh();
    });
    return () => {
      offConn();
      offLoc();
      offAny();
    };
  }, [scheduleRefresh, addNotification]);

  // ------------------------------------------------------------ demo persistence
  useEffect(() => {
    if (LIVE) return;
    try {
      localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota issues
    }
  }, [state]);

  const appendActivity = (prev, message, type = 'info') => [
    { id: `ACT-${Date.now()}`, message, time: new Date().toISOString(), type },
    ...prev.slice(0, 24)
  ];

  const resetDemoData = () => {
    if (LIVE) return;
    const fresh = getSeedState();
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(fresh));
    setState(fresh);
  };

  // ------------------------------------------------------------ requests
  const createRequest = async (payload) => {
    if (LIVE) {
      const created = await requestService.create(payload);
      await refresh();
      return created;
    }
    const newReq = {
      id: shortId('REQ', 2044, 700),
      patientId: payload.patientId,
      patientName: payload.patientName,
      contactNumber: payload.contactNumber,
      category: payload.category,
      pickupAddress: payload.pickupAddress,
      lat: Number(payload.lat) || 28.6139,
      lng: Number(payload.lng) || 77.209,
      details: payload.details || '',
      status: 'PENDING',
      assignedAmbulanceId: null,
      createdAt: new Date().toISOString()
    };
    setState((prev) => ({
      ...prev,
      requests: [newReq, ...prev.requests],
      activity: appendActivity(
        prev.activity,
        `New ${newReq.category} request ${newReq.id} from ${newReq.patientName}`,
        'emergency'
      )
    }));
    addNotification({
      title: `New ${newReq.category} request (${newReq.id})`,
      message: `${newReq.patientName} needs an ambulance at ${newReq.pickupAddress}.`,
      type: 'emergency',
      roles: ['admin'],
      link: '/admin/requests'
    });
    return newReq;
  };

  const cancelRequest = async (requestId) => {
    if (LIVE) {
      await requestService.cancel(requestId);
      await refresh();
      return;
    }
    setState((prev) => {
      const target = prev.requests.find((r) => r.id === requestId);
      const freed = target?.assignedAmbulanceId;
      return {
        ...prev,
        requests: prev.requests.map((r) =>
          r.id === requestId ? { ...r, status: 'CANCELLED' } : r
        ),
        ambulances: freed
          ? prev.ambulances.map((a) => (a.id === freed ? { ...a, status: 'AVAILABLE' } : a))
          : prev.ambulances,
        assignments: prev.assignments.map((asn) =>
          asn.requestId === requestId && asn.status !== 'COMPLETED'
            ? { ...asn, status: 'CANCELLED' }
            : asn
        ),
        trips: prev.trips.filter((t) => !(t.requestId === requestId && t.status !== 'COMPLETED')),
        activity: appendActivity(prev.activity, `Request ${requestId} was cancelled`, 'warning')
      };
    });
  };

  // ------------------------------------------------------------ assignments
  const assignAmbulance = async ({ requestId, ambulanceId, hospitalId }) => {
    if (LIVE) {
      await assignmentService.create({ requestId, ambulanceId, hospitalId });
      await refresh();
      return;
    }
    const now = new Date().toISOString();
    setState((prev) => {
      const ambulance = prev.ambulances.find((a) => a.id === ambulanceId);
      const newAssignment = {
        id: shortId('ASN', 310, 600),
        requestId,
        ambulanceId,
        driverId: ambulance?.driverId || null,
        hospitalId: hospitalId || prev.hospitals[0]?.id || null,
        status: 'PENDING_ACCEPTANCE',
        assignedAt: now
      };
      return {
        ...prev,
        requests: prev.requests.map((r) =>
          r.id === requestId ? { ...r, status: 'ASSIGNED', assignedAmbulanceId: ambulanceId } : r
        ),
        ambulances: prev.ambulances.map((a) =>
          a.id === ambulanceId ? { ...a, status: 'ASSIGNED', lastUpdated: now } : a
        ),
        assignments: [newAssignment, ...prev.assignments],
        activity: appendActivity(
          prev.activity,
          `Assigned ${ambulance?.registrationNumber || ambulanceId} to ${requestId}`
        )
      };
    });
    addNotification({
      title: 'New emergency assignment',
      message: `You have been assigned to emergency request ${requestId}.`,
      type: 'emergency',
      roles: ['driver'],
      link: '/driver/assignments'
    });
    addNotification({
      title: 'Ambulance assigned',
      message: `An ambulance has been assigned to your request ${requestId}.`,
      type: 'info',
      roles: ['patient'],
      link: `/patient/tracking/${requestId}`
    });
  };

  const getRecommendations = async (requestId) => {
    if (!LIVE) return null;
    return assignmentService.recommend(requestId);
  };

  const respondToAssignment = async (assignmentId, action) => {
    if (LIVE) {
      const result = await assignmentService.respond(assignmentId, action);
      await refresh();
      return result?.tripId || null;
    }
    const now = new Date().toISOString();
    if (action === 'accept') {
      const asn = state.assignments.find((a) => a.id === assignmentId);
      if (!asn) return null;
      const tripId = shortId('TRP', 910, 800);
      setState((prev) => {
        const req = prev.requests.find((r) => r.id === asn.requestId);
        const hosp = prev.hospitals.find((h) => h.id === asn.hospitalId);
        const newTrip = {
          id: tripId,
          requestId: asn.requestId,
          assignmentId: asn.id,
          ambulanceId: asn.ambulanceId,
          driverId: asn.driverId,
          hospitalId: asn.hospitalId,
          pickupAddress: req?.pickupAddress || 'Assigned pickup',
          destinationName: hosp?.name || 'Nearest receiving hospital',
          status: 'ACCEPTED',
          startedAt: now,
          completedAt: null,
          statusHistory: [{ status: 'ACCEPTED', time: now }]
        };
        return {
          ...prev,
          assignments: prev.assignments.map((a) =>
            a.id === assignmentId ? { ...a, status: 'ACCEPTED' } : a
          ),
          requests: prev.requests.map((r) =>
            r.id === asn.requestId ? { ...r, status: 'ACCEPTED' } : r
          ),
          trips: [newTrip, ...prev.trips],
          activity: appendActivity(
            prev.activity,
            `Driver accepted ${asn.requestId}; trip ${tripId} started`
          )
        };
      });
      addNotification({
        title: 'Driver accepted your request',
        message: 'Your ambulance is preparing to head to you.',
        type: 'success',
        roles: ['patient', 'admin'],
        link: `/patient/tracking/${asn.requestId}`
      });
      return tripId;
    }

    setState((prev) => {
      const asn = prev.assignments.find((a) => a.id === assignmentId);
      if (!asn) return prev;
      return {
        ...prev,
        assignments: prev.assignments.map((a) =>
          a.id === assignmentId ? { ...a, status: 'REJECTED' } : a
        ),
        requests: prev.requests.map((r) =>
          r.id === asn.requestId ? { ...r, status: 'PENDING', assignedAmbulanceId: null } : r
        ),
        ambulances: prev.ambulances.map((amb) =>
          amb.id === asn.ambulanceId ? { ...amb, status: 'AVAILABLE', lastUpdated: now } : amb
        ),
        activity: appendActivity(
          prev.activity,
          `Assignment ${assignmentId} declined; ${asn.requestId} back in queue`,
          'warning'
        )
      };
    });
    addNotification({
      title: 'Assignment declined',
      message: `Assignment ${assignmentId} needs re-allocation.`,
      type: 'warning',
      roles: ['admin'],
      link: '/admin/assignments'
    });
    return null;
  };

  // ------------------------------------------------------------ trips
  const advanceTripStatus = async (tripId, nextStatus) => {
    const trip = state.trips.find((t) => t.id === tripId);
    if (!trip) throw new Error('Trip not found.');
    if (!isValidTripTransition(trip.status, nextStatus)) {
      throw new Error(`Cannot move a trip from ${trip.status} to ${nextStatus}.`);
    }
    if (LIVE) {
      await tripService.updateStatus(tripId, nextStatus);
      await refresh();
      return;
    }
    const now = new Date().toISOString();
    setState((prev) => {
      const hosp = prev.hospitals.find((h) => h.id === trip.hospitalId);
      return {
        ...prev,
        trips: prev.trips.map((t) =>
          t.id !== tripId
            ? t
            : {
                ...t,
                status: nextStatus,
                completedAt: nextStatus === 'COMPLETED' ? now : t.completedAt,
                statusHistory: [...(t.statusHistory || []), { status: nextStatus, time: now }]
              }
        ),
        requests: prev.requests.map((r) =>
          r.id === trip.requestId ? { ...r, status: nextStatus } : r
        ),
        ambulances: prev.ambulances.map((a) => {
          if (a.id !== trip.ambulanceId) return a;
          const done = nextStatus === 'COMPLETED' && hosp;
          return {
            ...a,
            status: AMBULANCE_STATUS_FOR_TRIP[nextStatus],
            lat: done ? hosp.lat : a.lat,
            lng: done ? hosp.lng : a.lng,
            currentLocation: done ? `${hosp.name} (handover complete)` : a.currentLocation,
            lastUpdated: now
          };
        }),
        assignments: prev.assignments.map((asn) =>
          asn.id === trip.assignmentId && nextStatus === 'COMPLETED'
            ? { ...asn, status: 'COMPLETED' }
            : asn
        ),
        activity: appendActivity(
          prev.activity,
          `Trip ${tripId} updated to ${nextStatus.replace(/_/g, ' ').toLowerCase()}`,
          nextStatus === 'COMPLETED' ? 'success' : 'info'
        )
      };
    });
    addNotification({
      title: `Trip ${nextStatus.replace(/_/g, ' ').toLowerCase()}`,
      message: `Request ${trip.requestId} is now ${nextStatus.replace(/_/g, ' ').toLowerCase()}.`,
      type: nextStatus === 'COMPLETED' ? 'success' : 'info',
      roles: ['patient', 'admin'],
      link: `/patient/tracking/${trip.requestId}`
    });
  };

  // ------------------------------------------------------------ driver & GPS
  const toggleDriverAvailability = async (driverId) => {
    const driver = state.drivers.find((d) => d.id === driverId);
    if (!driver) return;
    const next = driver.availability === 'ONLINE' ? 'OFF_DUTY' : 'ONLINE';
    if (LIVE) {
      await driverService.setAvailability(driverId, next);
      await refresh();
      return;
    }
    setState((prev) => ({
      ...prev,
      drivers: prev.drivers.map((d) => (d.id === driverId ? { ...d, availability: next } : d)),
      activity: appendActivity(prev.activity, `Driver ${driver.name} switched to ${next}`)
    }));
  };

  const toggleDriverGps = async (driverId) => {
    const driver = state.drivers.find((d) => d.id === driverId);
    if (!driver) return;
    if (LIVE) {
      await driverService.setGpsSharing(driverId, !driver.gpsSharing);
      await refresh();
      return;
    }
    setState((prev) => ({
      ...prev,
      drivers: prev.drivers.map((d) =>
        d.id === driverId ? { ...d, gpsSharing: !d.gpsSharing } : d
      )
    }));
  };

  const updateAmbulanceLocation = async ({ ambulanceId, lat, lng, currentLocation }) => {
    const result = await trackingService.updateLocation({ ambulanceId, lat, lng, currentLocation });
    const now = result?.updatedAt || new Date().toISOString();
    setState((prev) => ({
      ...prev,
      ambulances: prev.ambulances.map((a) =>
        a.id === ambulanceId
          ? {
              ...a,
              lat: Number(lat),
              lng: Number(lng),
              currentLocation: currentLocation || a.currentLocation,
              lastUpdated: now
            }
          : a
      )
    }));
    if (!LIVE) wsService.emitLocal('location:update', { ambulanceId, lat, lng, updatedAt: now });
  };

  // ------------------------------------------------------------ fleet CRUD
  const addAmbulance = async (payload) => {
    if (LIVE) {
      const created = await ambulanceService.create(payload);
      await refresh();
      return created;
    }
    const driver = state.drivers.find((d) => d.id === payload.driverId);
    const newAmb = {
      id: shortId('AMB', 105, 890),
      registrationNumber: payload.registrationNumber.trim().toUpperCase(),
      category: payload.category,
      driverId: payload.driverId || null,
      driverName: driver ? driver.name : 'Unassigned',
      status: payload.status || 'AVAILABLE',
      currentLocation: payload.currentLocation || 'Central Fleet Hub',
      lat: Number(payload.lat) || 28.6139,
      lng: Number(payload.lng) || 77.209,
      lastUpdated: new Date().toISOString()
    };
    setState((prev) => ({
      ...prev,
      ambulances: [newAmb, ...prev.ambulances],
      drivers: prev.drivers.map((d) =>
        d.id === payload.driverId ? { ...d, assignedAmbulanceId: newAmb.id } : d
      ),
      activity: appendActivity(prev.activity, `Added ambulance ${newAmb.registrationNumber}`)
    }));
    return newAmb;
  };

  const updateAmbulance = async (id, payload) => {
    if (LIVE) {
      await ambulanceService.update(id, payload);
      await refresh();
      return;
    }
    const driver = state.drivers.find((d) => d.id === payload.driverId);
    setState((prev) => ({
      ...prev,
      ambulances: prev.ambulances.map((a) =>
        a.id === id
          ? {
              ...a,
              ...payload,
              driverName:
                payload.driverId !== undefined ? driver?.name || 'Unassigned' : a.driverName,
              lastUpdated: new Date().toISOString()
            }
          : a
      )
    }));
  };

  const addDriver = async (payload) => {
    if (LIVE) {
      const created = await driverService.create(payload);
      await refresh();
      return created;
    }
    const newDriver = {
      id: shortId('DRV', 105, 890),
      userId: `USR-DRV-${Date.now().toString().slice(-3)}`,
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      licenseNumber: payload.licenseNumber.trim().toUpperCase(),
      assignedAmbulanceId: payload.assignedAmbulanceId || null,
      availability: payload.availability || 'OFF_DUTY',
      verificationStatus: payload.verificationStatus || 'VERIFIED',
      gpsSharing: false
    };
    setState((prev) => ({
      ...prev,
      drivers: [newDriver, ...prev.drivers],
      ambulances: newDriver.assignedAmbulanceId
        ? prev.ambulances.map((a) =>
            a.id === newDriver.assignedAmbulanceId
              ? { ...a, driverId: newDriver.id, driverName: newDriver.name }
              : a
          )
        : prev.ambulances,
      activity: appendActivity(prev.activity, `Registered driver ${newDriver.name}`)
    }));
    return newDriver;
  };

  const updateDriver = async (id, payload) => {
    if (LIVE) {
      await driverService.update(id, payload);
      await refresh();
      return;
    }
    setState((prev) => ({
      ...prev,
      drivers: prev.drivers.map((d) => (d.id === id ? { ...d, ...payload } : d))
    }));
  };

  const addHospital = async (payload) => {
    if (LIVE) {
      const created = await hospitalService.create(payload);
      await refresh();
      return created;
    }
    const newHospital = {
      id: shortId('HSP', 10, 89),
      name: payload.name.trim(),
      shortName: payload.name.trim().split(' ').slice(0, 2).join(' '),
      address: payload.address.trim(),
      contactNumber: payload.contactNumber.trim(),
      lat: Number(payload.lat),
      lng: Number(payload.lng)
    };
    setState((prev) => ({
      ...prev,
      hospitals: [...prev.hospitals, newHospital],
      activity: appendActivity(prev.activity, `Added hospital ${newHospital.name}`)
    }));
    return newHospital;
  };

  const updateHospital = async (id, payload) => {
    if (LIVE) {
      await hospitalService.update(id, payload);
      await refresh();
      return;
    }
    setState((prev) => ({
      ...prev,
      hospitals: prev.hospitals.map((h) =>
        h.id === id
          ? {
              ...h,
              ...payload,
              lat: Number(payload.lat),
              lng: Number(payload.lng),
              shortName: (payload.name || h.name).split(' ').slice(0, 2).join(' ')
            }
          : h
      )
    }));
  };

  const deleteHospital = async (id) => {
    if (LIVE) {
      await hospitalService.remove(id);
      await refresh();
      return;
    }
    setState((prev) => ({ ...prev, hospitals: prev.hospitals.filter((h) => h.id !== id) }));
  };

  return (
    <DataContext.Provider
      value={{
        ...state,
        isLive: LIVE,
        syncing,
        syncError,
        connection,
        refresh,
        resetDemoData,
        createRequest,
        cancelRequest,
        assignAmbulance,
        getRecommendations,
        respondToAssignment,
        advanceTripStatus,
        toggleDriverAvailability,
        toggleDriverGps,
        updateAmbulanceLocation,
        addAmbulance,
        updateAmbulance,
        addDriver,
        updateDriver,
        addHospital,
        updateHospital,
        deleteHospital
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useAppData must be used inside DataProvider');
  return ctx;
}
