import { useCall } from "../context/CallContext";
import { CountryFlag } from "./CountryFlag";

export function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="pulse-ring">
          {incomingCall.callType === "video" ? "📹" : "🎤"}
        </div>

        <h3>Incoming {incomingCall.callType} call</h3>

        <div className="caller-info">
          <span>{incomingCall.from?.country ? <CountryFlag countryName={incomingCall.from.country} /> : ""}</span>
          <span>{incomingCall.from.name}</span>
          {incomingCall.from.userId && (
            <span className="caller-id">#{incomingCall.from.userId}</span>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-icon btn-danger"
            onClick={rejectCall}
            type="button"
            title="Reject"
          >
            ✕
          </button>
          <button
            className="btn btn-icon btn-success"
            onClick={acceptCall}
            type="button"
            title="Accept"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}