import { useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

interface ZegoVideoCallProps {
  roomId: string;
  appId: number;
  appSign: string;
  userName: string;
  onLeave?: () => void;
}

const ZegoVideoCall = ({ roomId, appId, appSign, userName, onLeave }: ZegoVideoCallProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<ReturnType<typeof ZegoUIKitPrebuilt.create> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const userId = `user-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    // Generate token
    const token = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appId,
      appSign,
      roomId,
      userId,
      userName
    );

    // Create client
    const client = ZegoUIKitPrebuilt.create(token);
    clientRef.current = client;

    // Join room with config
    client.joinRoom({
      container: containerRef.current,
      turnOnMicrophoneWhenJoining: true,
      turnOnCameraWhenJoining: true,
      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: true,
      showScreenSharingButton: true,
      showTextChat: true,
      showUserList: true,
      maxUsers: 2,
      layout: 'Auto',
      showLayoutButton: false,
      scenario: {
        mode: ZegoUIKitPrebuilt.OneONoneCall,
        config: {
          role: ZegoUIKitPrebuilt.Host,
        },
      },
      onLeaveRoom: () => {
        onLeave?.();
      },
    });

    return () => {
      client.destroy();
    };
  }, [roomId, appId, appSign, userName, onLeave]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[600px]"
    />
  );
};

export default ZegoVideoCall;
