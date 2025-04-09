import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useRouter } from 'next/router';
import Peer from 'peerjs';

export default function Room() {
  const router = useRouter();
  const { roomId } = router.query;
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const [peerId, setPeerId] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const socketRef = useRef();
  const peerRef = useRef();

  useEffect(() => {
    if (!roomId) return;

    socketRef.current = io('https://vc-meeting-api.onrender.com');
    peerRef.current = new Peer();

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      localVideo.current.srcObject = stream;
      localVideo.current.play();

      peerRef.current.on('open', id => {
        setPeerId(id);
        socketRef.current.emit('join-room', roomId, id);
      });

      socketRef.current.on('user-connected', userId => {
        const call = peerRef.current.call(userId, stream);
        call.on('stream', remoteStream => {
          remoteVideo.current.srcObject = remoteStream;
          remoteVideo.current.play();
        });
      });

      peerRef.current.on('call', call => {
        call.answer(stream);
        call.on('stream', remoteStream => {
          remoteVideo.current.srcObject = remoteStream;
          remoteVideo.current.play();
        });
      });
    });

    socketRef.current.on('message', msg => {
      setMessages(prev => [...prev, msg]);
    });

  }, [roomId]);

  const sendMessage = () => {
    socketRef.current.emit('message', message);
    setMessages(prev => [...prev, `Me: ${message}`]);
    setMessage('');
  };

  const startScreenShare = async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const videoTrack = screenStream.getVideoTracks()[0];
    const sender = localVideo.current.srcObject.getVideoTracks()[0];
    localVideo.current.srcObject.removeTrack(sender);
    localVideo.current.srcObject.addTrack(videoTrack);
  };

  return (
    <div>
      <h2>Room: {roomId}</h2>
      <video ref={localVideo} autoPlay muted width={300} />
      <video ref={remoteVideo} autoPlay width={300} />
      <div>
        <button onClick={startScreenShare}>Present Screen</button>
        <input value={message} onChange={e => setMessage(e.target.value)} />
        <button onClick={sendMessage}>Send</button>
        <div>
          {messages.map((m, i) => <div key={i}>{m}</div>)}
        </div>
      </div>
    </div>
  );
}
