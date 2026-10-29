# Mobile camera and AR test plan

The client now has a camera-gated A-Frame/AR.js runtime, interruption detection,
resume action, marker-driven model rendering, and touch attacks. Desktop
automation verifies the camera lifecycle with a test-only media device; it is
not evidence of iOS or Android behavior. Record the following on real hardware
before the event.

## Test record

For every run, record:

- device model, OS version, browser and version;
- exact ngrok HTTPS origin and application commit;
- marker print size, paper/finish, ambient lighting, distance, and angle;
- outcome, reproduction steps, console logs if available, and operator initials.

## iOS Safari

1. Open the HTTPS player URL in Safari, join a room, and tap **Enter hunt**.
2. Test first-time Allow, first-time Deny followed by recovery, remembered
   permission, and camera already in use by another app.
3. Confirm the video fills the viewport in portrait and landscape without
   obscuring the essential HUD or safe-area controls.
4. Scan all 30 markers individually. Confirm the displayed marker ID matches the
   printed label and no other ID claims.
5. For each marker, test near/far distance, at least three viewing angles, bright
   and dim lighting, and partial occlusion. Exercise `marker-16` and `marker-18`
   together because they are the closest measured pattern pair.
   Record the smallest reliable fraction of the camera frame for each device;
   the configured 640x480 tracking resolution is not a guaranteed distance.
6. Put two and then several markers in view. Confirm one deterministic claim is
   made and repeated detection events do not create duplicate encounters.
7. Temporarily move the active marker out of view. Confirm attacks pause, the
   reacquisition prompt appears, and returning the same marker resumes local
   interaction before the lease expires.
8. Background Safari, switch apps, lock/unlock the phone, accept an interruption,
   and rotate the device. Confirm the app detects a stopped track and the
   explicit **Resume camera** flow restores it when Safari permits.
9. Reload and briefly disconnect/reconnect the network. Confirm identity, score,
   active encounter state, marker cooldowns, and deadline resynchronize.
10. Run a continuous 30-minute match and record frame-rate observations, battery
    drop, device temperature, camera failures, and model load times.

## Android Chrome

Repeat the same permission, 30-marker, multi-marker, two-phone contention,
tracking-loss, interruption, reconnect, rotation, and 30-minute thermal tests in
current Chrome on at least one representative event device.

## Multiplayer acceptance

- Two phones scan the same available marker simultaneously; exactly one receives
  the encounter and the other sees the marker as reserved.
- Two phones scan different available markers; both can receive encounters.
- After defeat, all phones observe the shared 30-second cooldown and subsequent
  release.
- At the server deadline, active play stops on every phone even if one client
  timer is delayed.
- After host finalization, all phones show the same stable leaderboard and
  co-winners.

## Exit criterion

Do not mark mobile QA complete until the test record contains all 30 marker IDs,
both platforms, the interruption cases, multiplayer contention, and the
30-minute run. Failures must be fixed or documented with a rehearsed operator
fallback; desktop emulation cannot waive these checks.
