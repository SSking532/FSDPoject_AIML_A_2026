import React, { useMemo } from 'react';
import { Activity, Ambulance, CheckCircle2, XCircle } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import { useAppData } from '../../context/DataContext';

export function Analytics() {
  const { requests, trips, ambulances } = useAppData();

  const metrics = useMemo(() => {
    const totalRequests = requests.length;
    const completedTrips = trips.filter((t) => t.status === 'COMPLETED').length;
    const cancelledRequests = requests.filter((r) => r.status === 'CANCELLED').length;
    const activeUnits = ambulances.filter(
      (a) => ['ASSIGNED', 'EN_ROUTE', 'ON_TRIP'].includes(a.status)
    ).length;
    const utilizationPct = ambulances.length
      ? Math.round((activeUnits / ambulances.length) * 100)
      : 0;

    return {
      totalRequests,
      completedTrips,
      cancelledRequests,
      utilizationPct
    };
  }, [requests, trips, ambulances]);

  const requestTrends = useMemo(() => {
    const counts = new Map();
    requests.forEach((r) => {
      const day = new Date(r.createdAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      });
      counts.set(day, (counts.get(day) || 0) + 1);
    });
    const entries = Array.from(counts.entries()).map(([date, count]) => ({
      date,
      count
    }));
    const maxCount = Math.max(1, ...entries.map((e) => e.count));
    return { entries, maxCount };
  }, [requests]);

  const tripDistribution = useMemo(() => {
    const map = new Map();
    trips.forEach((t) => {
      map.set(t.status, (map.get(t.status) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [trips]);

  const ambulanceDistribution = useMemo(() => {
    const statuses = ['AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_TRIP', 'OUT_OF_SERVICE'];
    return statuses.map((st) => ({
      status: st,
      count: ambulances.filter((a) => a.status === st).length
    }));
  }, [ambulances]);

  const categoryDistribution = useMemo(() => {
    const cats = ['Cardiac', 'Trauma', 'Respiratory', 'General'];
    return cats.map((cat) => {
      const matching = requests.filter((r) => r.category === cat);
      return {
        category: cat,
        total: matching.length,
        completed: matching.filter((r) => r.status === 'COMPLETED').length,
        pending: matching.filter((r) => r.status === 'PENDING').length
      };
    });
  }, [requests]);

  return (
    <AppLayout
      title="Analytics"
      subtitle="Calculated from the requests and trips recorded in the system"
    >
      <div className="alert-banner info" style={{ marginBottom: 18 }}>
        <span>
          All figures below are calculated live from the current application dataset
          (simulated prototype records, not external production dispatch metrics).
        </span>
      </div>

      {/* KPI Summary */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Total Requests</div>
            <div className="kpi-value">{metrics.totalRequests}</div>
            <div className="kpi-hint">Recorded emergency requests</div>
          </div>
          <div className="kpi-icon navy">
            <Activity size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Completed Trips</div>
            <div className="kpi-value">{metrics.completedTrips}</div>
            <div className="kpi-hint">Verified hospital handovers</div>
          </div>
          <div className="kpi-icon green">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Cancelled Requests</div>
            <div className="kpi-value">{metrics.cancelledRequests}</div>
            <div className="kpi-hint">Withdrawn prior to completion</div>
          </div>
          <div className="kpi-icon red">
            <XCircle size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Ambulance Utilization</div>
            <div className="kpi-value">{metrics.utilizationPct}%</div>
            <div className="kpi-hint">Units assigned or on active trip</div>
          </div>
          <div className="kpi-icon amber">
            <Ambulance size={20} />
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Request Trends Over Time */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Request Trends Over Time</div>
              <div className="card-subtitle">Requests grouped by recorded date</div>
            </div>
          </div>
          <div className="card-body">
            {requestTrends.entries.length === 0 ? (
              <div className="empty-state">No request records available.</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 190, paddingTop: 18 }}>
                {requestTrends.entries.map((item) => {
                  const pct = Math.round((item.count / requestTrends.maxCount) * 100);
                  return (
                    <div
                      key={item.date}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        height: '100%',
                        justifyContent: 'flex-end'
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: 12.5 }}>
                        {item.count}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: 52,
                          height: `${Math.max(16, pct * 0.72)}%`,
                          background: 'var(--navy)',
                          borderRadius: '8px 8px 4px 4px',
                          transition: 'height 0.25s'
                        }}
                      />
                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {item.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Ambulance Availability Distribution */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Ambulance Availability Distribution</div>
              <div className="card-subtitle">Current fleet breakdown ({ambulances.length} total)</div>
            </div>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 14 }}>
            {ambulanceDistribution.map((item) => {
              const pct = ambulances.length
                ? Math.round((item.count / ambulances.length) * 100)
                : 0;
              const barColor =
                item.status === 'AVAILABLE'
                  ? 'var(--green)'
                  : item.status === 'OUT_OF_SERVICE'
                  ? 'var(--amber-bright)'
                  : 'var(--navy)';
              return (
                <div key={item.status} style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <StatusBadge status={item.status} />
                    <strong>
                      {item.count} ({pct}%)
                    </strong>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: '#eef1f6',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: barColor
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Trip Status Distribution */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Trip Status Distribution</div>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 12 }}>
            {tripDistribution.length === 0 ? (
              <div className="empty-state">No trips recorded.</div>
            ) : (
              tripDistribution.map(([status, count]) => {
                const pct = trips.length ? Math.round((count / trips.length) * 100) : 0;
                return (
                  <div key={status} style={{ display: 'grid', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <StatusBadge status={status} />
                      <strong>
                        {count} ({pct}%)
                      </strong>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: '#eef1f6', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: status === 'COMPLETED' ? 'var(--green)' : 'var(--red)'
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Emergency Category Breakdown Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Requests by Emergency Category</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Total</th>
                    <th>Pending</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryDistribution.map((row) => (
                    <tr key={row.category}>
                      <td>
                        <StatusBadge status={row.category} />
                      </td>
                      <td><strong>{row.total}</strong></td>
                      <td>{row.pending}</td>
                      <td>{row.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Analytics;
