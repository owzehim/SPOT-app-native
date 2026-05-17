import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import InstallBanner from './src/components/InstallBanner'

export default function App() {
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    setAppReady(true)
  }, [])

  if (!appReady) {
    return null
  }

  return (
    <>
      <InstallBanner />
      <div style={{ width: '100%', height: '100vh', backgroundColor: '#fff' }}>
        <StatusBar style="auto" />
        {/* Your app content goes here */}
      </div>
    </>
  )
}
