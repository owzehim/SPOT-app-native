// In React Native there is no BroadcastChannel.
// This is a no-op stub — QR expiry sync across tabs is web-only.
// On native, each screen manages its own QR state independently.
export function broadcastQRExpiry(studentNumber) {
  // no-op on native
}