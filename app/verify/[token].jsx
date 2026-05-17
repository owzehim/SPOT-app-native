import { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { totp } from '../../src/lib/totp';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VerifyPage() {
  const { token } = useLocalSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15);
  const scanTimeRef = useRef(Date.now());

  const parseToken = (qrToken) => {
    const parts = qrToken?.split('_');
    if (!parts || parts.length < 2) return null;
    return { otpToken: parts[0], studentNumber: parts[1] };
  };

  const verifyQRCode = async (qrToken) => {
    const parsed = parseToken(qrToken);
    if (!parsed) {
      setResult({ valid: false, reason: 'Invalid QR code.' });
      return;
    }
    const { otpToken, studentNumber } = parsed;
    try {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('student_number', studentNumber)
        .single();

      if (memberError || !member) {
        setResult({ valid: false, reason: 'Member not found.' });
        return;
      }

      // Verify TOTP by generating expected token and comparing
      const expectedToken = totp(member.totp_secret);
      const isValidToken = expectedToken === otpToken;

      const isActiveMember =
        member.is_member &&
        member.membership_valid_until &&
        new Date(member.membership_valid_until) >= new Date();

      if (!isValidToken) {
        setResult({ valid: false, reason: 'QR code has expired. Please ask the member to refresh.' });
      } else if (!isActiveMember) {
        setResult({ valid: false, reason: 'Membership is not active.', member });
      } else {
        setResult({ valid: true, member });
      }
    } catch (error) {
      setResult({ valid: false, reason: 'Verification error. Please try again.' });
    }
  };

  useEffect(() => {
    scanTimeRef.current = Date.now();
    verifyQRCode(token).then(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (loading || !result?.valid) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - scanTimeRef.current) / 1000);
      const remaining = Math.max(0, 15 - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        setResult({ valid: false, reason: 'QR code has expired.', member: result.member });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [loading, result]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <Text style={{ color: '#6b7280' }}>Verifying...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{
          backgroundColor: 'white', borderRadius: 16, borderWidth: 1,
          borderColor: '#f3f4f6', padding: 24, width: '100%', maxWidth: 384
        }}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontWeight: 'bold', color: '#111827', fontSize: 18 }}>UvA-IN Membership</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              University of Amsterdam Korean Student Association
            </Text>
          </View>

          {result?.valid ? (
            <View style={{ gap: 16 }}>
              {/* Valid badge */}
              <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#16a34a', fontWeight: 'bold', fontSize: 24 }}>✓ Valid</Text>
                <Text style={{ color: '#22c55e', fontSize: 14, marginTop: 4 }}>Membership is active</Text>
              </View>

              {/* Member details */}
              <View style={{ gap: 8 }}>
                {[
                  { label: 'Name', value: `${result.member.first_name} ${result.member.last_name}` },
                  { label: 'Student No.', value: result.member.student_number },
                  { label: 'Major', value: result.member.major },
                  { label: 'Valid Until', value: result.member.membership_valid_until, green: true },
                ].map(({ label, value, green }) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}>
                    <Text style={{ color: '#9ca3af', fontSize: 14 }}>{label}</Text>
                    <Text style={{ fontWeight: '500', fontSize: 14, color: green ? '#16a34a' : '#111827' }}>{value}</Text>
                  </View>
                ))}
              </View>

              {/* Countdown */}
              <View style={{ backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Expiring in:</Text>
                <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#2563eb' }}>{timeLeft}s</Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {/* Invalid badge */}
              <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 24 }}>✗ Invalid</Text>
                <Text style={{ color: '#f87171', fontSize: 14, marginTop: 4, textAlign: 'center' }}>{result?.reason}</Text>
              </View>

              {result?.member && (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}>
                    <Text style={{ color: '#9ca3af', fontSize: 14 }}>Name</Text>
                    <Text style={{ fontWeight: '500', fontSize: 14 }}>{result.member.first_name} {result.member.last_name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                    <Text style={{ color: '#9ca3af', fontSize: 14 }}>Valid Until</Text>
                    <Text style={{ fontWeight: '500', fontSize: 14, color: '#ef4444' }}>{result.member.membership_valid_until}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <Text style={{ fontSize: 11, color: '#d1d5db', textAlign: 'center', marginTop: 24 }}>
            UvA-IN © {new Date().getFullYear()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
