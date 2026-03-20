import { useCall } from "../context/CallContext";
import { VideoPane } from "./VideoPane";

export function CallPanel() {
  const {
    activeCall,
    callState,
    localStream,
    remoteStream,
    callTimer,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    endCall,
  } = useCall();

  if (!activeCall && callState !== "calling") {
    return (
      <section className="call-panel idle">
        <div className="idle-content">
          <div className="idle-icon">📞</div>
          <h3>Ready to Connect</h3>
          <p>Select an online user from the sidebar to start an anonymous call or chat.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="call-panel">
      <div className="call-header">
        <h3>
          {activeCall?.peer?.name || "Connecting..."}
          {activeCall?.peer?.userId && (
            <span style={{
              fontFamily: "'Courier New', monospace",
              fontSize: "0.75rem",
              color: "var(--accent)",
              marginLeft: 8,
              fontWeight: 700,
            }}>
              #{activeCall.peer.userId}
            </span>
          )}
        </h3>
        <span className="call-timer">
          {callState === "in-call" ? callTimer : "Connecting..."}
        </span>
      </div>

      <div className="video-grid">
        <VideoPane stream={remoteStream} label="Remote" />
        <VideoPane stream={localStream} label="You" muted mirrored />
      </div>

      <div className="call-controls">
        <button
          className={`btn btn-icon ${isMuted ? "btn-danger" : ""}`}
          onClick={toggleMute}
          type="button"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? "🔇" : "🎤"}
        </button>
        <button
          className={`btn btn-icon ${isCameraOff ? "btn-danger" : ""}`}
          onClick={toggleCamera}
          type="button"
          title={isCameraOff ? "Camera On" : "Camera Off"}
        >
          {isCameraOff ? "📷" : "📹"}
        </button>
        <button
          className="btn btn-icon btn-danger"
          onClick={endCall}
          type="button"
          title="End call"
        >
          📵
        </button>
      </div>
    </section>
  );
}