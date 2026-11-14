import {Composition, continueRender, delayRender, staticFile, Audio, Img, Video, useVideoConfig, useCurrentFrame, interpolate, spring} from 'remotion';
import React, {useEffect, useState} from 'react';

export const Highlight30: React.FC = () => {
  const {fps, durationInFrames, width, height} = useVideoConfig();
  const frame = useCurrentFrame();
  // segments (in frames)
  const seg1End = 4 * fps; // 0-4s
  const seg2End = seg1End + 8 * fps; // 4-12s
  const seg3End = seg2End + 10 * fps; // 12-22s
  const seg4End = seg3End + 4 * fps; // 22-26s
  const seg5End = seg4End + 4 * fps; // 26-30s

  // zoom effect for final photo
  const zoom = interpolate(frame, [seg4End, seg5End], [1, 1.5]);
  const opacity = interpolate(frame, [seg4End, seg5End], [1, 0]);

  return (
    <div style={{flex: 1, backgroundColor: '#000'}}>
      {/* seg1: opening montage */}
      <Video
        src={staticFile('assets/part1_trim.mp4')}
        startAt={0}
        endAt={seg1End - 1}
        style={{position: 'absolute', width: '100%', height: '100%'}}
      />
      {/* seg2: AI chat */}
      <Video
        src={staticFile('assets/part2_cursor_final.mp4')}
        startAt={seg1End}
        endAt={seg2End - 1}
        style={{position: 'absolute', width: '100%', height: '100%'}}
      />
      {/* seg3 & seg4: farmer demo */}
      <Video
        src={staticFile('assets/farmer_15s.mp4')}
        startAt={seg2End}
        endAt={seg4End - 1}
        style={{position: 'absolute', width: '100%', height: '100%'}}
      />
      {/* seg5: group photo zoom out */}
      <Img
        src={staticFile('assets/group_photo.jpg')}
        style={{
          position: 'absolute',
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${zoom})`,
          opacity,
        }}
      />
      {/* audio track */}
      <Audio src={staticFile('assets/edm_loop_30s.mp3')} />
    </div>
  );
};

// Export a composition for Remotion render CLI
export const RemotionVideo = () => (
  <Composition
    id="Highlight30"
    component={Highlight30}
    durationInFrames={30 * 30} // 30s @30fps
    fps={30}
    width={1280}
    height={720}
  />
);
