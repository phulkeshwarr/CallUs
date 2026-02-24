import { useEffect, useRef } from "react";

export function VideoPane({ stream, muted = false, label, mirrored = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream || null;
    }
  }, [stream]);

  return (
    <div className="video-pane">
      <video ref={ref} autoPlay playsInline muted={muted} className={mirrored ? "mirrored" : ""} />
      <div className="video-label">{label}</div>
    </div>
  );
}