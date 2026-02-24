import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CallContext = createContext(null);

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function getMediaErrorMessage(error) {
  const name = error?.name || "Error";
  const message = error?.message || "Unknown media error";
  return `${name}: ${message}`;
}

export function CallProvider({ children }) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callState, setCallState] = useState("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callTimer, setCallTimer] = useState("00:00");

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const pcRef = useRef(null);
  const pendingCallIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const queuedRemoteCandidatesRef = useRef([]);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const timerRef = useRef(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    elapsedRef.current = 0;
    setCallTimer("00:00");
  }

  function startTimer() {
    stopTimer();
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setCallTimer(formatTime(elapsedRef.current));
    }, 1000);
  }

  function cleanupStreams() {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
  }

  function cleanupPeerConnection() {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }
  }

  function resetCallState() {
    setIncomingCall(null);
    setActiveCall(null);
    setCallState("idle");
    setIsMuted(false);
    setIsCameraOff(false);
    pendingCallIdRef.current = null;
    pendingCandidatesRef.current = [];
    queuedRemoteCandidatesRef.current = [];
    stopTimer();
    cleanupPeerConnection();
    cleanupStreams();
  }

  async function flushQueuedRemoteCandidates(callId) {
    if (!pcRef.current || !callId) {
      return;
    }

    const remaining = [];
    for (const item of queuedRemoteCandidatesRef.current) {
      if (item.callId !== callId) {
        remaining.push(item);
        continue;
      }

      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(item.candidate));
      } catch (error) {
        remaining.push(item);
      }
    }
    queuedRemoteCandidatesRef.current = remaining;
  }

  async function createPeerConnection() {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        setRemoteStream(stream);
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }
      if (!pendingCallIdRef.current) {
        pendingCandidatesRef.current.push(event.candidate);
        return;
      }
      socket?.emit("call:ice-candidate", {
        callId: pendingCallIdRef.current,
        candidate: event.candidate,
      });
    };

    pcRef.current = pc;
    return pc;
  }

  async function ensureLocalStream(includeVideo = true, allowVideoFallback = false) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: includeVideo,
      });
      setLocalStream(stream);
      if (includeVideo) {
        setIsCameraOff(false);
      }
      return { stream, downgradedToAudio: false, downgradeError: null };
    } catch (error) {
      if (!includeVideo || !allowVideoFallback) {
        throw error;
      }

      // If camera capture fails, continue with audio-only instead of blocking the call.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      setLocalStream(stream);
      setIsCameraOff(true);
      return { stream, downgradedToAudio: true, downgradeError: error };
    }
  }

  async function startCall(targetUser, callType = "video") {
    if (!targetUser?._id) {
      alert("Invalid user selection.");
      return;
    }
    if (targetUser._id === user?._id) {
      alert("You cannot call your own account.");
      return;
    }
    if (!socket) {
      alert("Realtime connection unavailable. Refresh and sign in again.");
      return;
    }
    if (!socket.connected) {
      alert("Realtime connection not ready. Please wait a moment and try again.");
      return;
    }
    if (callState !== "idle") {
      alert("A call is already in progress.");
      return;
    }
    if (!navigator?.mediaDevices?.getUserMedia) {
      alert("Media devices are unavailable in this browser/context.");
      return;
    }

    let ackTimeoutId = null;
    try {
      setCallState("calling");
      setActiveCall({
        callId: null,
        peer: targetUser,
        direction: "outgoing",
        callType,
      });
      const includeVideo = callType === "video";
      const { stream, downgradedToAudio, downgradeError } = await ensureLocalStream(
        includeVideo,
        includeVideo
      );
      if (downgradedToAudio) {
        alert(
          `Camera unavailable on this browser. Starting as audio-only. (${getMediaErrorMessage(
            downgradeError
          )})`
        );
      }
      const pc = await createPeerConnection();

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      let acknowledged = false;
      ackTimeoutId = setTimeout(() => {
        if (!acknowledged) {
          alert("No response from signaling server. Please try again.");
          resetCallState();
        }
      }, 10000);

      socket.emit(
        "call:initiate",
        {
          to: targetUser._id,
          offer,
          callType,
        },
        (response) => {
          acknowledged = true;
          clearTimeout(ackTimeoutId);

          if (!response?.ok) {
            alert(response?.message || "Unable to call user");
            resetCallState();
            return;
          }

          pendingCallIdRef.current = response.callId;
          setActiveCall({
            callId: response.callId,
            peer: targetUser,
            direction: "outgoing",
            callType,
          });

          pendingCandidatesRef.current.forEach((candidate) => {
            socket.emit("call:ice-candidate", {
              callId: response.callId,
              candidate,
            });
          });
          pendingCandidatesRef.current = [];
        }
      );
    } catch (error) {
      clearTimeout(ackTimeoutId);
      console.error(error);
      alert(`Could not start call. ${getMediaErrorMessage(error)}`);
      resetCallState();
    }
  }

  async function acceptCall() {
    if (!socket || !incomingCall || callState === "in-call") {
      return;
    }

    try {
      const includeVideo = incomingCall.callType === "video";
      const { stream, downgradedToAudio, downgradeError } = await ensureLocalStream(
        includeVideo,
        includeVideo
      );
      if (downgradedToAudio) {
        alert(
          `Camera unavailable on this browser. Accepting as audio-only. (${getMediaErrorMessage(
            downgradeError
          )})`
        );
      }
      const pc = await createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pendingCallIdRef.current = incomingCall.callId;
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await flushQueuedRemoteCandidates(incomingCall.callId);

      socket.emit("call:accept", {
        callId: incomingCall.callId,
        answer,
      });

      pendingCandidatesRef.current.forEach((candidate) => {
        socket.emit("call:ice-candidate", {
          callId: incomingCall.callId,
          candidate,
        });
      });
      pendingCandidatesRef.current = [];

      setActiveCall({
        callId: incomingCall.callId,
        peer: incomingCall.from,
        direction: "incoming",
        callType: incomingCall.callType,
      });
      setIncomingCall(null);
      setCallState("in-call");
      startTimer();
    } catch (error) {
      console.error(error);
      alert(`Unable to accept call. ${getMediaErrorMessage(error)}`);
      resetCallState();
    }
  }

  function rejectCall() {
    if (!socket || !incomingCall) {
      return;
    }

    socket.emit("call:reject", {
      callId: incomingCall.callId,
      reason: "Call rejected",
    });
    setIncomingCall(null);
    setCallState("idle");
  }

  function endCall() {
    if (!socket || !pendingCallIdRef.current) {
      resetCallState();
      return;
    }

    socket.emit("call:end", {
      callId: pendingCallIdRef.current,
    });
    resetCallState();
  }

  function toggleMute() {
    if (!localStream) {
      return;
    }
    const audioTracks = localStream.getAudioTracks();
    const next = !isMuted;
    audioTracks.forEach((track) => {
      track.enabled = !next;
    });
    setIsMuted(next);
  }

  function toggleCamera() {
    if (!localStream) {
      return;
    }
    const videoTracks = localStream.getVideoTracks();
    const next = !isCameraOff;
    videoTracks.forEach((track) => {
      track.enabled = !next;
    });
    setIsCameraOff(next);
  }

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const onIncoming = (payload) => {
      if (payload.from._id === user?._id) {
        return;
      }
      setIncomingCall(payload);
      setCallState("ringing");
    };

    const onAccepted = async ({ callId, answer }) => {
      if (!pcRef.current) {
        return;
      }
      pendingCallIdRef.current = callId;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      await flushQueuedRemoteCandidates(callId);
      setCallState("in-call");
      startTimer();
    };

    const onRejected = ({ reason }) => {
      alert(reason || "Call rejected");
      resetCallState();
    };

    const onCandidate = async ({ callId, candidate }) => {
      if (!candidate) {
        return;
      }

      if (!pcRef.current || callId !== pendingCallIdRef.current) {
        queuedRemoteCandidatesRef.current.push({ callId, candidate });
        return;
      }

      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        queuedRemoteCandidatesRef.current.push({ callId, candidate });
      }
    };

    const onEnded = () => {
      resetCallState();
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:rejected", onRejected);
    socket.on("call:ice-candidate", onCandidate);
    socket.on("call:ended", onEnded);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:rejected", onRejected);
      socket.off("call:ice-candidate", onCandidate);
      socket.off("call:ended", onEnded);
    };
  }, [socket, user?._id]);

  useEffect(() => {
    if (!socket) {
      resetCallState();
      return undefined;
    }

    const onDisconnect = () => {
      resetCallState();
    };

    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onDisconnect);

    return () => {
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    return () => {
      stopTimer();
      cleanupPeerConnection();
      cleanupStreams();
    };
  }, []);

  const value = {
    incomingCall,
    activeCall,
    callState,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    callTimer,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within CallProvider");
  }
  return context;
}
