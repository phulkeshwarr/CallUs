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
        <h3>Ready to call</h3>
        <p>Select an online user to start a one-to-one call.</p>
      </section>
    );
  }

  return (
    <section className="call-panel">
      <div className="call-header">
        <h3>{activeCall?.peer?.name || "Calling..."}</h3>
        <span>{callState === "in-call" ? callTimer : "Connecting..."}</span>
      </div>

      <div className="video-grid">
        <VideoPane stream={remoteStream} label="Remote" />
        <VideoPane stream={localStream} label="You" muted mirrored />
      </div>

      <div className="call-controls">
        <button className="btn" onClick={toggleMute}>{isMuted ? "Unmute" : "Mute"}</button>
        <button className="btn" onClick={toggleCamera}>{isCameraOff ? "Camera On" : "Camera Off"}</button>
        <button className="btn btn-danger" onClick={endCall}>End</button>
      </div>
    </section>
  );
}