import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, MapPin, Navigation, Send, Sparkles } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import { useAppData } from '../../context/DataContext';
import { formatDateTime, rankAmbulances, requiredTypeFor } from '../../utils/geo';

export function Assignments() {
  const [searchParams] = useSearchParams();
  const initialReqId = searchParams.get('requestId') || '';

  const {
    requests,
    ambulances,
    drivers,
    hospitals,
    assignments,
    assignAmbulance,
    getRecommendations,
    isLive
  } = useAppData();

  const pendingRequests = useMemo(
    () => requests.filter((r) => ['PENDING', 'NO_AMBULANCE_AVAILABLE'].includes(r.status)),
    [requests]
  );

  const [selectedRequestId, setSelectedRequestId] = useState(initialReqId);
  const [selectedAmbId, setSelectedAmbId] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverRanking, setServerRanking] = useState(null);

  const selectedRequest =
    pendingRequests.find((r) => r.id === selectedRequestId) || pendingRequests[0] || null;

  // Live mode: ask the backend allocation module (Haversine + category filter).
  useEffect(() => {
    let active = true;
    setServerRanking(null);
    if (isLive && selectedRequest) {
      getRecommendations(selectedRequest.id)
        .then((res) => {
          if (!active || !res) return;
          setServerRanking(
            res.candidates.map((c) => ({
              amb: c.ambulance,
              driver: c.driver,
              distanceKm: c.distanceKm,
              eta: c.etaMinutes,
              isEligible: c.eligible,
              typeMatch: c.typeMatch,
              reasons: c.reasons
            }))
          );
        })
        .catch(() => active && setServerRanking(null));
    }
    return () => {
      active = false;
    };
    // re-rank whenever fleet positions/status change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, selectedRequest?.id, ambulances]);

  const ranked = useMemo(
    () => serverRanking || rankAmbulances(selectedRequest, ambulances, drivers),
    [serverRanking, selectedRequest, ambulances, drivers]
  );
  const recommended = ranked.find((c) => c.isEligible) || null;

  // Pre-select the recommendation and the nearest hospital.
  useEffect(() => {
    setSelectedAmbId(recommended?.amb.id || '');
  }, [selectedRequest?.id, recommended?.amb.id]);

  useEffect(() => {
    if (!selectedRequest || !hospitals.length) return;
    const nearest = [...hospitals].sort(
      (a, b) =>
        Math.hypot(a.lat - selectedRequest.lat, a.lng - selectedRequest.lng) -
        Math.hypot(b.lat - selectedRequest.lat, b.lng - selectedRequest.lng)
    )[0];
    setSelectedHospitalId(nearest.id);
  }, [selectedRequest?.id, hospitals.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = ranked.find((c) => c.amb.id === selectedAmbId);

  const handleConfirm = async () => {
    if (!selectedRequest || !selectedAmbId) return;
    setError('');
    setSubmitting(true);
    try {
      await assignAmbulance({
        requestId: selectedRequest.id,
        ambulanceId: selectedAmbId,
        hospitalId: selectedHospitalId
      });
      setConfirmation(
        `${chosen?.amb.registrationNumber || selectedAmbId} dispatched to ${selectedRequest.id}. Waiting for the driver to accept.`
      );
      setSelectedRequestId('');
    } catch (err) {
      setError(err.message || 'Could not confirm the assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Allocate an ambulance"
      subtitle="Pick a request, review ranked units, confirm the dispatch"
    >
      {confirmation && (
        <div className="alert-banner success" style={{ marginBottom: 18 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={17} />
            {confirmation}
          </span>
        </div>
      )}

      <div className="grid-main-aside" style={{ marginBottom: 22 }}>
        <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Waiting requests</div>
                <div className="card-subtitle">
                  {pendingRequests.length === 1
                    ? '1 request needs an ambulance'
                    : `${pendingRequests.length} requests need an ambulance`}
                </div>
              </div>
            </div>
            <div className="card-body">
              {pendingRequests.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 12px' }}>
                  <p className="empty-title">Queue is clear</p>
                  <p className="empty-text">New requests appear here the moment patients send them.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  <Input
                    label="Request"
                    as="select"
                    value={selectedRequest?.id || ''}
                    onChange={(e) => {
                      setSelectedRequestId(e.target.value);
                      setConfirmation('');
                      setError('');
                    }}
                  >
                    {pendingRequests.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id}, {r.patientName} ({r.category}), {r.pickupAddress}
                      </option>
                    ))}
                  </Input>

                  {selectedRequest && (
                    <div className="detail-list" style={{ padding: 16, borderRadius: 12, background: 'var(--paper)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <strong style={{ fontSize: 15 }}>
                          {selectedRequest.patientName}
                        </strong>
                        <StatusBadge status={selectedRequest.category} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5 }}>
                        <MapPin size={15} className="text-red" />
                        {selectedRequest.pickupAddress}
                      </div>
                      <div className="muted-small">
                        Needs {requiredTypeFor(selectedRequest) || 'any unit'} · requested{' '}
                        {formatDateTime(selectedRequest.createdAt)}
                      </div>
                      {selectedRequest.details && <div className="detail-note">{selectedRequest.details}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedRequest && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Ranked units</div>
                  <div className="card-subtitle">
                    Eligible units first, then by straight-line distance to the pickup
                  </div>
                </div>
                {isLive && serverRanking && <span className="badge badge-teal">From allocation service</span>}
              </div>
              <div className="card-body" style={{ display: 'grid', gap: 10 }}>
                {ranked.map(({ amb, driver, distanceKm, eta, isEligible, reasons }) => {
                  const isSelected = selectedAmbId === amb.id;
                  const isRec = recommended?.amb.id === amb.id;
                  return (
                    <div
                      key={amb.id}
                      className={`unit-option ${isSelected ? 'selected' : ''} ${isEligible ? '' : 'ineligible'} ${
                        isRec && !isSelected ? 'recommended' : ''
                      }`}
                    >
                      <div style={{ display: 'grid', gap: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 15 }}>{amb.registrationNumber}</strong>
                          {isRec && (
                            <span className="rec-tag">
                              <Sparkles size={11} /> Best match
                            </span>
                          )}
                          <StatusBadge status={amb.status} />
                        </div>
                        <div className="muted-small">
                          {amb.category} · {driver?.name || amb.driverName || 'No driver'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                          <Navigation size={13} />
                          {distanceKm != null ? `${distanceKm} km away, about ${eta} min` : amb.currentLocation}
                        </div>
                        {!isEligible && <div className="reason-text">{reasons.join(' · ')}</div>}
                      </div>
                      <Button
                        variant={isSelected ? 'primary' : 'secondary'}
                        size="sm"
                        disabled={!isEligible}
                        onClick={() => setSelectedAmbId(amb.id)}
                      >
                        {isSelected ? 'Selected' : isEligible ? 'Select' : 'Unavailable'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: 92 }}>
          <div className="card-header">
            <div className="card-title">Confirm dispatch</div>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 16 }}>
            <Input
              label="Receiving hospital"
              as="select"
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Input>

            <div className="detail-list" style={{ padding: 14, borderRadius: 12, background: 'var(--paper)' }}>
              <div className="detail-row" style={{ gridTemplateColumns: '84px 1fr' }}>
                <span>Request</span>
                <strong>{selectedRequest?.id || 'None selected'}</strong>
              </div>
              <div className="detail-row" style={{ gridTemplateColumns: '84px 1fr' }}>
                <span>Unit</span>
                <strong>{chosen?.amb.registrationNumber || 'Choose a unit'}</strong>
              </div>
              <div className="detail-row" style={{ gridTemplateColumns: '84px 1fr' }}>
                <span>Arrival</span>
                <strong>{chosen?.eta != null ? `about ${chosen.eta} min` : '—'}</strong>
              </div>
            </div>

            {error && <div className="alert-banner danger">{error}</div>}

            <Button
              variant="primary"
              size="lg"
              loading={submitting}
              disabled={!selectedRequest || !selectedAmbId}
              onClick={handleConfirm}
            >
              <Send size={16} />
              Dispatch ambulance
            </Button>
            <p className="muted-small">The driver is notified instantly and must accept before the trip starts.</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Assignment log</div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Request</th>
                <th>Ambulance</th>
                <th>Hospital</th>
                <th>Assigned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((asn) => {
                const amb = ambulances.find((a) => a.id === asn.ambulanceId);
                const hosp = hospitals.find((h) => h.id === asn.hospitalId);
                return (
                  <tr key={asn.id}>
                    <td><strong>{asn.id}</strong></td>
                    <td>{asn.requestId}</td>
                    <td>{amb?.registrationNumber || asn.ambulanceId}</td>
                    <td>{hosp?.name || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{formatDateTime(asn.assignedAt)}</td>
                    <td><StatusBadge status={asn.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

export default Assignments;
