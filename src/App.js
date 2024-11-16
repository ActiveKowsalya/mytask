import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:4000'); // Replace with your signaling server URL

const App = () => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [localStream, setLocalStream] = useState(null);
    const peerConnection = useRef(null);

    const configuration = {
        iceServers: [
            {
                urls: 'stun:stun.l.google.com:19302'
            }
        ]
    };

    // Get media from user's device
    useEffect(() => {
        const initMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localVideoRef.current.srcObject = stream;
                setLocalStream(stream);
            } catch (error) {
                console.error('Error accessing media devices.', error);
            }
        };
        initMedia();
    }, []);

    // Initialize peer connection after localStream is set
    useEffect(() => {
        if (localStream) {
            // Initialize Peer Connection
            peerConnection.current = new RTCPeerConnection(configuration);

            // Add local stream tracks to peer connection
            localStream.getTracks().forEach((track) => {
                peerConnection.current.addTrack(track, localStream);
            });

            // Listen for remote stream
            peerConnection.current.ontrack = (event) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            // ICE candidate handling
            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', event.candidate);
                }
            };

            // Handle incoming offer from the other peer
            socket.on('offer', async (offer) => {
              try {
                  // Ensure we are not already in a stable state before setting the remote offer
                  if (peerConnection.current.signalingState === 'stable') {
                      console.warn('Already in a stable state, skipping offer.');
                      return;
                  }

                  // Set the remote description with the incoming offer
                  await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));

                  // Create an answer to the offer
                  const answer = await peerConnection.current.createAnswer();
                  await peerConnection.current.setLocalDescription(answer);

                  // Send the answer back to the signaling server
                  socket.emit('answer', answer);
              } catch (error) {
                  console.error('Error handling offer:', error);
              }
            });


            // Handle incoming answer from the other peer
  socket.on('answer', async (answer) => {
    try {
        // Ensure the state is not already 'stable' before setting the remote answer
        if (peerConnection.current.signalingState !== 'have-local-offer') {
            console.warn('Cannot set remote answer in the current state:', peerConnection.current.signalingState);
            return;
        }

        // Set the remote description with the incoming answer
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
        console.error('Error handling answer:', error);
    }
  });

            // Handle ICE candidates from other peer
            socket.on('ice-candidate', (candidate) => {
                peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            });
        }
    }, [localStream]);

    // Function to initiate a call
    const startCall = async () => {
        if (!peerConnection.current) {
            console.error('PeerConnection is not initialized.');
            return;
        }

        try {
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);
            socket.emit('offer', offer);
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    };

    return (
        <div>
            <h1>WebRTC Video Call</h1>
            <div>
                <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '300px' }} />
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '300px' }} />
            </div>
            <button onClick={startCall}>Start Call</button>
        </div>
    );
};

export default App;
