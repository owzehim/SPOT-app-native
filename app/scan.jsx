import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { logRedemption } from '../src/lib/redemption';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';

const STATE = {
  SCANNING: 'scanning',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function ScanPage() {
  const [state, setState] = useState(STATE.SCANNING);
  const [storeName, setStoreName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const handlingRef = useRef(false);

  async function handleScan({ data: rawValue }) {
    if (handlingRef.current || state !== STATE.SCANNING) return;
    handlingRef.current = true;

    let storeId = null;
    try {
      const url = new URL(rawValue);
      storeId = url.searchParams.get('store_id');
    } catch {
      if (rawValue.startsWith('store:')) storeId = rawValue.replace('store:', '');
    }

    if (!storeId) {
      setState(STATE.ERROR);
      setErrorMsg('유효하지 않은 QR 코드입니다. 매장 QR을 스캔해주세요.');
      handlingRef.current = false;
      return;
    }

    setState(STATE.LOADING);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setState(STATE.ERROR);
        setErrorMsg('로그인이 필요합니다.');
        handlingRef.current = false;
        return;
      }
      const result = await logRedemption({ storeId });
      if (result.success) {
        setStoreName(result.storeName || '매장');
        setState(STATE.SUCCESS);
      } else {
        setState(STATE.ERROR);
        setErrorMsg(result.message || '할인을 적용할 수 없습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      setState(STATE.ERROR);
      setErrorMsg('오류가 발생했습니다: ' + (err?.message || '알 수 없는 오류'));
    }
    handlingRef.current = false;
  }

  const reset = () => {
    handlingRef.current = false;
    setState(STATE.SCANNING);
    setStoreName('');
    setErrorMsg('');
  };

  // Permission not yet determined
  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: '#f9fafb' }} />;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 32, marginBottom: 16 }}>📷</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          카메라 권한이 필요합니다
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
          QR 코드를 스캔하려면 카메라 접근을 허용해주세요.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{ backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>권한 허용</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
        paddingHorizontal: 16, paddingVertical: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f3f4f6' }}
        >
          <Text style={{ color: '#6b7280', fontSize: 13 }}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={{ fontWeight: 'bold', color: '#111827', fontSize: 16 }}>할인 QR 스캔</Text>
      </View>

      {/* Body */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>

        {state === STATE.SCANNING && (
          <View style={{ width: '100%', alignItems: 'center', gap: 16 }}>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
              매장의 QR 코드를 카메라에 비춰주세요
            </Text>
            <View style={{ width: 280, height: 280, borderRadius: 16, overflow: 'hidden', borderWidth: 4, borderColor: '#f97316' }}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleScan}
              />
            </View>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>QR 코드가 자동으로 인식됩니다</Text>
          </View>
        )}

        {state === STATE.LOADING && (
          <View style={{ alignItems: 'center', gap: 16 }}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={{ color: '#6b7280', fontSize: 14 }}>멤버십 확인 중...</Text>
          </View>
        )}

        {state === STATE.SUCCESS && (
          <View style={{ alignItems: 'center', gap: 16, maxWidth: 320, width: '100%' }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 36, color: '#16a34a' }}>✓</Text>
            </View>
            <Text style={{ fontWeight: 'bold', color: '#111827', fontSize: 20 }}>할인 적용 완료!</Text>
            <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              <Text style={{ fontWeight: '600' }}>{storeName}</Text>에서의 할인이 기록되었습니다.{'\n'}
              이 화면을 직원에게 보여주세요.
            </Text>
            <TouchableOpacity onPress={reset} style={{ width: '100%', backgroundColor: '#f97316', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>다시 스캔하기</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/member')} style={{ width: '100%', backgroundColor: '#f3f4f6', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#4b5563', fontWeight: '500', fontSize: 14 }}>홈으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === STATE.ERROR && (
          <View style={{ alignItems: 'center', gap: 16, maxWidth: 320, width: '100%' }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 36, color: '#dc2626' }}>✕</Text>
            </View>
            <Text style={{ fontWeight: 'bold', color: '#111827', fontSize: 20 }}>할인 적용 실패</Text>
            <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>{errorMsg}</Text>
            <TouchableOpacity onPress={reset} style={{ width: '100%', backgroundColor: '#f97316', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>다시 시도하기</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/member')} style={{ width: '100%', backgroundColor: '#f3f4f6', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#4b5563', fontWeight: '500', fontSize: 14 }}>홈으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}
