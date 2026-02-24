import { useCall } from "../context/CallContext";

export function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>Incoming {incomingCall.callType} call</h3>
        <p>{incomingCall.from.name}</p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={rejectCall}>Reject</button>
          <button className="btn btn-success" onClick={acceptCall}>Accept</button>
        </div>
      </div>
    </div>
  );
}