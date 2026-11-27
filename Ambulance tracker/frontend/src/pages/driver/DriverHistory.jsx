import React, { useMemo, useState } from 'react';
import DataTable from '../../components/common/DataTable';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/DataContext';
import { formatDateTime } from '../../utils/geo';

export function DriverHistory() {
  const { user } = useAuth();
  const { drivers, trips } = useAppData();
  const [search, setSearch] = useState('');

  const driver =
    drivers.find((d) => d.userId === user?.id || d.id === user?.driverId) ||
    drivers[0];

  const completedTrips = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips
      .filter(
        (t) =>
          (t.driverId === driver?.id || t.ambulanceId === driver?.assignedAmbulanceId) &&
          t.status === 'COMPLETED'
      )
      .filter((t) => {
        if (!q) return true;
        return (
          t.id.toLowerCase().includes(q) ||
          t.pickupAddress.toLowerCase().includes(q) ||
          (t.destinationName || '').toLowerCase().includes(q)
        );
      });
  }, [trips, driver, search]);

  const columns = [
    { key: 'id', header: 'Trip ID', sortable: true, render: (t) => <strong>{t.id}</strong> },
    {
      key: 'startedAt',
      header: 'Date',
      sortable: true,
      render: (t) => formatDateTime(t.startedAt)
    },
    { key: 'pickupAddress', header: 'Pickup Location' },
    { key: 'destinationName', header: 'Destination' },
    {
      key: 'completedAt',
      header: 'Completion Time',
      sortable: true,
      render: (t) => formatDateTime(t.completedAt)
    },
    {
      key: 'status',
      header: 'Trip Status',
      render: (t) => <StatusBadge status={t.status} />
    }
  ];

  return (
    <AppLayout
      title="Trip history"
      subtitle="Transports you have completed"
    >
      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search trip ID, pickup, or hospital..."
        />
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={completedTrips}
          emptyTitle="No completed trips found"
          emptyDescription="Completed trips will appear here once handover is finalized."
        />
      </div>
    </AppLayout>
  );
}

export default DriverHistory;
