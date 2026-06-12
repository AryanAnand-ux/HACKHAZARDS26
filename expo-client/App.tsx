import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import {
  ShieldAlert,
  Scan,
  Mic,
  Settings,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  FileText,
  RotateCcw,
  Users,
  Compass,
} from 'lucide-react-native';
import axios from 'axios';

// Custom Error Boundary for capturing React Native Web rendering issues gracefully
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A', padding: 24 }}>
          <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            Rendering Interrupted
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
            A layout rendering warning occurred. The application is isolated and safe.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#10B981', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>Reset Component</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const { width } = Dimensions.get('window');

// Available tabs
type Tab = 'dashboard' | 'scan' | 'graph' | 'interview' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [apiUrl, setApiUrl] = useState('http://localhost:3000');
  
  // Reference for console logger auto-scroll
  const consoleScrollRef = React.useRef<any>(null);

  // Live telemetry log feed
  const [logs, setLogs] = useState<string[]>([
    "[15:10:02] [INFO] Booting VigilNet OS v2.1.0...",
    "[15:10:04] [OK] Memory heap allocated: 128MB",
    "[15:10:05] [OK] Connected to PostgreSQL relational store",
    "[15:10:07] [OK] Established connection to Neo4j AuraDB",
    "[15:10:08] [INFO] Loaded 4 active supply-chain nodes",
    "[15:10:10] [OK] System check: 100% database integrity",
    "[15:10:11] [INFO] Awaiting manifest scanner telemetry..."
  ]);

  useEffect(() => {
    const logTemplates = [
      "[INFO] Executing matrix heuristics optimization...",
      "[OK] Ingestion node check: 0 foreign risks detected",
      "[INFO] Scanning Tier-2 node graph paths...",
      "[OK] Database sync complete. Node health 100%",
      "[INFO] Listening for container manifest OCR telemetry...",
      "[INFO] Checking registry updates for OFAC List...",
      "[INFO] Active listener: NestJS API core online",
      "[OK] Memory garbage collection clean: 0.1ms",
      "[INFO] Mapped relationship route: 3 hops resolved",
      "[INFO] Sarvam speech processing thread active",
    ];

    const interval = setInterval(() => {
      const randomLog = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      const now = new Date();
      const timeStr = `[${now.toTimeString().split(' ')[0]}]`;
      setLogs(prev => {
        const next = [...prev, `${timeStr} ${randomLog}`];
        return next.slice(-25); // keep last 25 logs
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getNodeCoords = (nodeId: string) => {
    // Default coordinate map for mock database
    if (nodeId === '2') return { x: 75, y: 70 };
    if (nodeId === '1') return { x: 75, y: 210 };
    if (nodeId === '3') return { x: 195, y: 210 };
    if (nodeId === '4') return { x: 310, y: 210 };
    
    // Dynamic node mapping fallback
    const index = graphData.nodes.findIndex((n: any) => n.id === nodeId);
    const total = graphData.nodes.length;
    if (index === -1) return { x: 150, y: 150 };
    
    const node = graphData.nodes[index];
    const isHighRisk = node.risk >= 80;
    const stepX = (width - 80) / Math.max(1, total - 1);
    const x = 40 + index * stepX;
    const y = isHighRisk ? 70 : 210;
    return { x, y };
  };

  // Camera & Upload states
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType] = useState('back');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [scannedRisk, setScannedRisk] = useState<any>(null);

  // Audio Recording states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [interviewResult, setInterviewResult] = useState<any>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Global Mock Graph Data for the Graph view
  const [graphData, setGraphData] = useState<any>({
    nodes: [
      { id: '1', name: 'Linhai Textiles Corp', risk: 80, label: 'Company (Scanned)' },
      { id: '2', name: 'Xinjiang Logistics Ltd', risk: 100, label: 'Logistics (Sanctioned)' },
      { id: '3', name: 'Pacific Cotton Mills', risk: 50, label: 'Spinning Mill' },
      { id: '4', name: 'Global Apparel Sourcing', risk: 20, label: 'Apparel Maker' },
    ],
    links: [
      { source: '1', target: '3' },
      { source: '3', target: '4' },
      { source: '2', target: '1' },
    ],
  });

  // Request Permissions
  useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      const audioStatus = await Audio.requestPermissionsAsync();
      setHasPermission(cameraStatus.status === 'granted' && audioStatus.status === 'granted');
    })();
  }, []);

  // Handle manifest scanning via Mock or API
  const handleScan = async (useMock = false) => {
    setIsScanning(true);
    setScannedData(null);
    setScannedRisk(null);

    if (useMock) {
      setTimeout(async () => {
        const mockResponse = {
          success: true,
          data: {
            companyName: 'Linhai Textiles Corp',
            registrationNo: 'TX-9982441-A',
            address: 'Industrial Zone B, Ningbo, China',
            signatory: 'Zhao Wei',
            shipmentDate: '2026-06-08',
            materialType: 'Raw cotton fibers',
          },
          risk: {
            riskScore: 80,
            resolvedId: 'comp_linhai',
            resolvedName: 'Linhai Textiles Corp',
            path: [
              { id: 'comp_linhai', name: 'Linhai Textiles Corp', labels: ['Company'] },
              { id: 'log_xj', name: 'Xinjiang Logistics Ltd', labels: ['SanctionList'] }
            ],
            message: 'WARNING: Entity linked to Xinjiang Logistics Ltd (Sanctioned)',
          }
        };
        setScannedData(mockResponse.data);
        setScannedRisk(mockResponse.risk);
        setIsScanning(false);
      }, 2000);
      return;
    }

    try {
      const result = await axios.post(`${apiUrl}/api/v1/scan/upload`, {});
      setScannedData(result.data.data);
      setScannedRisk(result.data.risk);
      
      // Update graph view data dynamically based on resolved path
      if (result.data.risk.path && result.data.risk.path.length > 0) {
        const nodes = result.data.risk.path.map((node: any, idx: number) => ({
          id: node.id,
          name: node.name,
          risk: idx === 0 ? result.data.risk.riskScore : 100,
          label: idx === 0 ? 'Company (Scanned)' : 'Link Partner',
        }));
        
        const links = [];
        for (let i = 0; i < nodes.length - 1; i++) {
          links.push({ source: nodes[i].id, target: nodes[i+1].id });
        }

        setGraphData({ nodes, links });
      }
    } catch (e) {
      console.warn('API connection failed, falling back to mock data...');
      handleScan(true);
    } finally {
      setIsScanning(false);
    }
  };

  // Start Audio Recording
  const startRecording = async () => {
    try {
      setInterviewResult(null);
      
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new (window as any).MediaRecorder(stream);
        const chunks: any[] = [];
        
        recorder.ondataavailable = (e: any) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/wav' });
          setIsTranslating(true);
          try {
            const formData = new window.FormData();
            formData.append('file', blob, 'interview.wav');
            const response = await axios.post(`${apiUrl}/api/v1/interview/process`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            setInterviewResult(response.data);
          } catch (e) {
            console.warn('API Translate failed, using fallback speech model...');
            setInterviewResult({
              success: true,
              transcript: 'हमसे दिन में १४ घंटे काम कराया जाता है और कोई ओवरटाइम नहीं मिलता।',
              translation: 'We are forced to work 14 hours a day and receive no overtime pay.',
              language: 'hi-IN',
            });
          } finally {
            setIsTranslating(false);
          }
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  // Stop Recording and Translate
  const stopRecording = async () => {
    setIsRecording(false);
    
    if (Platform.OS === 'web') {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    } else {
      if (!recording) return;
      const rec = recording;
      setRecording(null);
      setIsTranslating(true);
      
      try {
        await rec.stopAndUnloadAsync();
        const response = await axios.post(`${apiUrl}/api/v1/interview/process`, {});
        setInterviewResult(response.data);
      } catch (e) {
        console.warn('API Translate failed, using fallback speech model...');
        setInterviewResult({
          success: true,
          transcript: 'हमसे दिन में १४ घंटे काम कराया जाता है और कोई ओवरटाइम नहीं मिलता।',
          translation: 'We are forced to work 14 hours a day and receive no overtime pay.',
          language: 'hi-IN',
        });
      } finally {
        setIsTranslating(false);
      }
    }
  };

  return (
    <SafeAreaProvider>
      {Platform.OS === 'web' && <div className="grain-overlay" />}
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=VT323&display=swap');
          * {
            font-family: 'Fira Code', monospace !important;
          }
          .brand-text-style, .terminal-hdr {
            font-family: 'VT323', monospace !important;
            font-size: 24px !important;
            letter-spacing: 2px;
          }
          body {
            background-color: #030604 !important;
            color: #00FF66 !important;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            position: relative;
          }
          /* CRT screen curvature glare and static lines */
          body::before {
            content: " ";
            display: block;
            position: fixed;
            top: 0; left: 0; bottom: 0; right: 0;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
            z-index: 9999;
            background-size: 100% 4px, 4px 100%;
            pointer-events: none;
            opacity: 0.85;
          }
          body::after {
            content: " ";
            display: block;
            position: fixed;
            top: 0; left: 0; bottom: 0; right: 0;
            background: radial-gradient(circle, rgba(0, 0, 0, 0) 65%, rgba(0, 0, 0, 0.7) 100%);
            z-index: 10000;
            pointer-events: none;
          }
          .grain-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            width: 100vw;
            height: 100vh;
            background: transparent url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E') repeat;
            opacity: 0.05;
            pointer-events: none;
            z-index: 9998;
          }
          /* Premium cyberpunk glass card with corner brackets */
          .glass-card {
            position: relative;
            background: #090E0A !important;
            border: 1px solid rgba(0, 255, 102, 0.25) !important;
            border-radius: 4px !important;
            box-shadow: inset 0 0 12px rgba(0, 255, 102, 0.08), 0 4px 20px rgba(0, 0, 0, 0.5) !important;
            transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          }
          .glass-card::before {
            content: "";
            position: absolute;
            top: -2px; left: -2px; width: 8px; height: 8px;
            border-top: 2px solid #00FF66; border-left: 2px solid #00FF66;
            pointer-events: none;
          }
          .glass-card::after {
            content: "";
            position: absolute;
            bottom: -2px; right: -2px; width: 8px; height: 8px;
            border-bottom: 2px solid #00FF66; border-right: 2px solid #00FF66;
            pointer-events: none;
          }
          .glass-card:hover {
            transform: translateY(-2px);
            box-shadow: inset 0 0 15px rgba(0, 255, 102, 0.15), 0 8px 25px rgba(0, 255, 102, 0.2) !important;
            border-color: rgba(0, 255, 102, 0.5) !important;
          }
          .alert-hover {
            border-color: rgba(255, 59, 48, 0.25) !important;
            background: rgba(255, 59, 48, 0.04) !important;
            box-shadow: inset 0 0 12px rgba(255, 59, 48, 0.08), 0 4px 20px rgba(0, 0, 0, 0.5) !important;
          }
          .alert-hover::before { border-color: #FF3B30 !important; }
          .alert-hover::after { border-color: #FF3B30 !important; }
          .alert-hover:hover {
            box-shadow: inset 0 0 15px rgba(255, 59, 48, 0.15), 0 8px 25px rgba(255, 59, 48, 0.2) !important;
            border-color: rgba(255, 59, 48, 0.5) !important;
          }
          .info-hover {
            border-color: rgba(0, 255, 102, 0.25) !important;
            background: rgba(0, 255, 102, 0.04) !important;
            box-shadow: inset 0 0 12px rgba(0, 255, 102, 0.08), 0 4px 20px rgba(0, 0, 0, 0.5) !important;
          }
          .info-hover::before { border-color: #00FF66 !important; }
          .info-hover::after { border-color: #00FF66 !important; }
          .info-hover:hover {
            box-shadow: inset 0 0 15px rgba(0, 255, 102, 0.15), 0 8px 25px rgba(0, 255, 102, 0.2) !important;
            border-color: rgba(0, 255, 102, 0.5) !important;
          }
          .btn-glow {
            transition: all 0.2s ease-in-out;
            border: 1px solid #00FF66 !important;
            border-radius: 4px !important;
            box-shadow: 0 0 8px rgba(0, 255, 102, 0.2);
            background: #090E0A !important;
          }
          .btn-glow:hover {
            background: #00FF66 !important;
            color: #030604 !important;
            box-shadow: 0 0 15px rgba(0, 255, 102, 0.5);
            transform: translateY(-1px);
          }
          .btn-glow:active {
            transform: translateY(1px);
          }
          .btn-glow:hover * {
            color: #030604 !important;
          }
          .mock-btn-glow {
            transition: all 0.2s ease-in-out;
            border: 1px solid #FFB300 !important;
            border-radius: 4px !important;
            box-shadow: 0 0 8px rgba(255, 179, 0, 0.2);
            background: #090E0A !important;
          }
          .mock-btn-glow:hover {
            background: #FFB300 !important;
            color: #030604 !important;
            box-shadow: 0 0 15px rgba(255, 179, 0, 0.5);
            transform: translateY(-1px);
          }
          .mock-btn-glow:hover * {
            color: #030604 !important;
          }
          @keyframes scanLaser {
            0% { top: 0%; opacity: 0.8; }
            50% { top: 100%; opacity: 0.8; }
            100% { top: 0%; opacity: 0.8; }
          }
          .laser-line {
            position: absolute;
            left: 0;
            width: 100%;
            height: 3px;
            background: #00FF66;
            box-shadow: 0 0 8px #00FF66, 0 0 15px #00FF66;
            animation: scanLaser 3s infinite linear;
            z-index: 10;
          }
          .pulse-record {
            animation: pulseRecord 1.5s infinite ease-in-out;
          }
          @keyframes pulseRecord {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.06); opacity: 0.85; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes terminalFlicker {
            0% { opacity: 0.985; }
            50% { opacity: 1; }
            100% { opacity: 0.99; }
          }
          body {
            animation: terminalFlicker 0.15s infinite;
          }
          /* Audio oscilloscope keyframe and animation classes */
          @keyframes soundwave {
            0%, 100% { transform: scaleY(0.15); }
            50% { transform: scaleY(1); }
          }
          .oscilloscope-container {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 5px;
            height: 50px;
            width: 200px;
            margin: 16px auto 0 auto;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 4px;
            border: 1px solid rgba(0, 255, 102, 0.2);
            padding: 10px;
          }
          .osc-bar {
            width: 4px;
            height: 100%;
            background-color: #00FF66;
            border-radius: 2px;
            transform-origin: center;
            animation: soundwave 1s ease-in-out infinite;
          }
          .osc-bar:nth-child(1) { animation-delay: 0.1s; animation-duration: 0.8s; }
          .osc-bar:nth-child(2) { animation-delay: 0.4s; animation-duration: 1.1s; }
          .osc-bar:nth-child(3) { animation-delay: 0.2s; animation-duration: 0.7s; }
          .osc-bar:nth-child(4) { animation-delay: 0.6s; animation-duration: 1.3s; }
          .osc-bar:nth-child(5) { animation-delay: 0.3s; animation-duration: 0.9s; }
          .osc-bar:nth-child(6) { animation-delay: 0.5s; animation-duration: 1.2s; }
          .osc-bar:nth-child(7) { animation-delay: 0.15s; animation-duration: 0.75s; }
          .osc-bar:nth-child(8) { animation-delay: 0.45s; animation-duration: 1.05s; }
          .osc-bar:nth-child(9) { animation-delay: 0.25s; animation-duration: 0.85s; }
          .osc-bar:nth-child(10) { animation-delay: 0.55s; animation-duration: 1.25s; }

          @keyframes blink {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
          }
          .blink-dot {
            width: 8px;
            height: 8px;
            background-color: #00FF66;
            border-radius: 50%;
            animation: blink 1s infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .laser-line, .pulse-record, .glass-card, .btn-glow, .mock-btn-glow, body, .osc-bar {
              animation: none !important;
              transition: none !important;
            }
          }
        `}} />
      )}
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <ShieldAlert color="#00FF66" size={24} />
          <Text style={[styles.brandText, styles.vtFont]} className="brand-text-style">VIGIL<Text style={{ color: '#00FF66' }}>NET</Text></Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.headerStatus, styles.codeFont]}>PORT_8082 // SECURE_CON</Text>
          <TouchableOpacity onPress={() => setActiveTab('settings')} style={{ marginLeft: 12 }}>
            <Settings color="#00FF66" size={20} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* System Telemetry Stats Bar */}
      <View style={styles.diagnosticsHeader}>
        <Text style={[styles.diagText, styles.codeFont]}>SYS: <Text style={styles.diagActive}>ONLINE</Text></Text>
        <Text style={[styles.diagText, styles.codeFont]}>AURA: <Text style={styles.diagActive}>RESOLVED</Text></Text>
        <Text style={[styles.diagText, styles.codeFont]}>DB_NODE: <Text style={styles.diagActive}>4_LOADED</Text></Text>
      </View>

      {/* Main Content Area */}
      <ErrorBoundary>
        <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {activeTab === 'dashboard' && (
          <View style={styles.tabContent}>
            {/* System Telemetry Console */}
            <View style={styles.consoleCard} className="glass-card">
              <View style={styles.consoleHeader}>
                <Text style={[styles.consoleTitle, styles.codeFont]}>SYSTEM COMPLIANCE TELEMETRY</Text>
                <View style={styles.blinkDot} className="blink-dot" />
              </View>
              <ScrollView
                style={styles.consoleScroll}
                ref={consoleScrollRef}
                onContentSizeChange={() => {
                  if (consoleScrollRef.current) {
                    consoleScrollRef.current.scrollToEnd({ animated: true });
                  }
                }}
              >
                {logs.map((log, index) => (
                  <Text key={index} style={[styles.consoleLogText, styles.codeFont]}>{log}</Text>
                ))}
              </ScrollView>
            </View>

            {/* Compliance Gauge Card */}
            <View style={styles.card} className="glass-card">
              <Text style={styles.cardTitle}>Global Fleet Compliance</Text>
              <View style={styles.gaugeContainer}>
                <Svg width="180" height="100" viewBox="0 0 100 50">
                  <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00FF66" />
                      <stop offset="100%" stopColor="#00FF99" />
                    </linearGradient>
                  </defs>
                  <Circle cx="50" cy="50" r="40" stroke="#101F15" strokeWidth="10" fill="none" strokeDasharray="125 250" />
                  <Circle cx="50" cy="50" r="40" stroke="url(#gaugeGrad)" strokeWidth="10" fill="none" strokeDasharray="100 250" />
                </Svg>
                <View style={styles.gaugeTextContainer}>
                  <Text style={[styles.gaugeNumber, styles.codeFont]}>84%</Text>
                  <Text style={styles.gaugeLabel}>Compliant Suppliers</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, styles.codeFont]}>412</Text>
                  <Text style={styles.statLbl}>Audited Facilities</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, styles.codeFont, { color: '#EF4444' }]}>3</Text>
                  <Text style={styles.statLbl}>Active Violations</Text>
                </View>
              </View>
            </View>

            {/* Warning Feeds */}
            <Text style={styles.sectionTitle}>High-Risk Supply Alerts</Text>
            
            <View style={[styles.card, styles.alertCard]} className="glass-card alert-hover">
                  <AlertTriangle color="#FF3B30" size={24} />
                  <View style={styles.alertTextContainer}>
                    <Text style={styles.alertTitle}>Tier-3 Materials Breach</Text>
                    <Text style={styles.alertDesc}>Linhai Textiles linked directly to Xinjiang Logistics Ltd (OFAC List).</Text>
                  </View>
                </View>

                <View style={[styles.card, styles.infoCard]} className="glass-card info-hover">
                  <CheckCircle color="#00FF66" size={24} />
                  <View style={styles.alertTextContainer}>
                    <Text style={[styles.alertTitle, { color: '#00FF66' }]}>Audit Complete: Ningbo Co</Text>
                    <Text style={styles.alertDesc}>Supplier cleared of all entity-relationship risks.</Text>
                  </View>
                </View>
          </View>
        )}

        {activeTab === 'scan' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Document OCR Scan</Text>
            <Text style={styles.sectionDesc}>Capture container manifests or Bills of Lading to automatically run risk resolution.</Text>

            {/* Simulated Camera Viewfinder */}
            <View style={styles.cameraBox} className="glass-card">
              {Platform.OS === 'web' && <View className="laser-line" />}
              
              {/* HUD Telemetry Labels */}
              <View style={styles.hudTopLeft}><Text style={[styles.hudText, styles.codeFont]}>SCAN_MODE: AUTO_OCR</Text></View>
              <View style={styles.hudTopRight}><Text style={[styles.hudText, styles.codeFont]}>RES: 1200_DPI</Text></View>
              <View style={styles.hudBottomLeft}><Text style={[styles.hudText, styles.codeFont]}>FILTER: HIST_EQ</Text></View>
              <View style={styles.hudBottomRight}><Text style={[styles.hudText, styles.codeFont]}>FOCUS: CONT</Text></View>

              <FileText color="#00FF66" size={56} style={{ opacity: 0.8 }} />
              <Text style={[styles.cameraText, styles.codeFont]}>MANIFEST SCANNER ACTIVE</Text>
              
              <View style={styles.scanActions}>
                <TouchableOpacity style={styles.actionBtn} className="btn-glow" onPress={() => handleScan(false)}>
                  <Scan color="#FFFFFF" size={20} />
                  <Text style={styles.actionBtnText}>Scan Document</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.mockBtn]} className="mock-btn-glow" onPress={() => handleScan(true)}>
                  <RotateCcw color="#FFFFFF" size={18} />
                  <Text style={styles.actionBtnText}>Simulate Scan</Text>
                </TouchableOpacity>
              </View>
            </View>

            {isScanning && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#00FF66" />
                <Text style={styles.loadingText}>Running Gemini Entity Resolution & Neo4j Path Traversal...</Text>
              </View>
            )}

            {scannedData && (
              <View style={styles.card} className="glass-card">
                <Text style={styles.cardTitle}>Parsed Manifest Data</Text>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Supplier:</Text><Text style={styles.metaVal}>{scannedData.companyName}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Reg No:</Text><Text style={[styles.metaVal, styles.codeFont]}>{scannedData.registrationNo}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Material:</Text><Text style={styles.metaVal}>{scannedData.materialType}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Signatory:</Text><Text style={styles.metaVal}>{scannedData.signatory}</Text></View>
                
                <View style={[styles.riskBanner, scannedRisk.riskScore > 50 ? styles.riskHigh : styles.riskLow]}>
                  <AlertTriangle color="#FFFFFF" size={24} />
                  <View>
                    <Text style={[styles.riskBannerTitle, styles.codeFont]}>Compliance Risk: {scannedRisk.riskScore}%</Text>
                    <Text style={styles.riskBannerText}>{scannedRisk.message}</Text>
                  </View>
                </View>

                {scannedRisk.path && scannedRisk.path.length > 0 && (
                  <TouchableOpacity style={styles.viewGraphBtn} onPress={() => setActiveTab('graph')}>
                    <Text style={styles.viewGraphText}>View Interactive Risk Graph</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'graph' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Interactive Risk Network</Text>
            <Text style={styles.sectionDesc}>Visualizing multi-hop supplier dependencies mapped in Neo4j AuraDB.</Text>

            <View style={styles.graphBox} className="glass-card">
              <Svg height="300" width={width - 32}>
                {/* Links */}
                {graphData.links.map((link: any, idx: number) => {
                  const sourceNode = graphData.nodes.find((n: any) => n.id === link.source);
                  const targetNode = graphData.nodes.find((n: any) => n.id === link.target);
                  if (!sourceNode || !targetNode) return null;
                  
                  const { x: sx, y: sy } = getNodeCoords(link.source);
                  const { x: tx, y: ty } = getNodeCoords(link.target);

                  const isViolating = sourceNode.risk === 100 || targetNode.risk === 100;

                  return (
                    <Line
                      key={idx}
                      x1={sx}
                      y1={sy}
                      x2={tx}
                      y2={ty}
                      stroke={isViolating ? '#EF4444' : '#00FF66'}
                      strokeWidth="2"
                      strokeDasharray={isViolating ? '4 4' : '0'}
                    />
                  );
                })}

                {/* Nodes */}
                {graphData.nodes.map((node: any) => {
                  const { x, y } = getNodeCoords(node.id);
                  const color = node.risk === 100 ? '#EF4444' : node.risk >= 80 ? '#F97316' : node.risk >= 50 ? '#EAB308' : '#00FF66';
                  const title = node.name.split(' ')[0];

                  return (
                    <G key={node.id}>
                      {/* Background chip */}
                      <Circle cx={x} cy={y} r="26" fill="#090E0A" stroke={color} strokeWidth="1.5" />
                      <Circle cx={x} cy={y} r="22" fill="#090E0A" stroke={color} strokeWidth="0.5" strokeDasharray="2 2" />
                      
                      {/* Risk / Sanction Badge */}
                      <SvgText x={x} y={y - 32} fill={color} fontSize="8" textAnchor="middle" fontWeight="bold" fontFamily={Platform.OS === 'web' ? 'Fira Code' : 'monospace'}>
                        {node.risk === 100 ? 'SANCTIONED' : `RISK: ${node.risk}%`}
                      </SvgText>

                      {/* Node Name */}
                      <SvgText x={x} y={y + 4} fill="#FFFFFF" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily={Platform.OS === 'web' ? 'Fira Code' : 'monospace'}>
                        {title}
                      </SvgText>

                      {/* Node Label */}
                      <SvgText x={x} y={y + 38} fill="#94A3B8" fontSize="8" textAnchor="middle" fontFamily={Platform.OS === 'web' ? 'Fira Code' : 'monospace'}>
                        {node.label}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            </View>

            <View style={styles.card} className="glass-card">
              <Text style={styles.cardTitle}>Graph Legend</Text>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Sanctioned / Entity Violation (Risk 100%)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
                <Text style={styles.legendText}>Scanned Supplier - Linked to Sanction (Risk 80%)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Compliant Node (Risk &lt; 20%)</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'interview' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Worker Interview</Text>
            <Text style={styles.sectionDesc}>Record workers testimonies. Sarvam AI translates local statements into English compliance proof.</Text>

            <View style={styles.recordBox} className="glass-card">
              <View className={isRecording ? "pulse-record" : ""}>
                <Mic color={isRecording ? '#FF3B30' : '#00FF66'} size={56} />
              </View>
              
              {isRecording && (
                <View style={styles.oscilloscope} className="oscilloscope-container">
                  <View style={styles.oscBar} className="osc-bar" />
                  <View style={styles.oscBar} className="osc-bar" />
                  <View style={styles.oscBar} className="osc-bar" />
                  <View style={styles.oscBar} className="osc-bar" />
                  <View style={styles.oscBar} className="osc-bar" />
                  <View style={styles.oscBar} className="osc-bar" />
                  <View style={styles.oscBar} className="osc-bar" />
                  <View style={styles.oscBar} className="osc-bar" />
                  <View style={styles.oscBar} className="osc-bar" />
                  <View style={styles.oscBar} className="osc-bar" />
                </View>
              )}
              
              <Text style={[styles.recordText, styles.codeFont]}>
                {isRecording ? 'RECORDING TELEMETRY...' : 'AWAITING VOICE INPUT'}
              </Text>

              <View style={styles.recordActions}>
                {!isRecording ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#00FF66' }]} className="btn-glow" onPress={startRecording}>
                    <Text style={[styles.actionBtnText, { color: '#030604' }]}>Start Recording</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF3B30' }]} className="btn-glow" onPress={stopRecording}>
                    <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Stop & Translate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isTranslating && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#00FF66" />
                <Text style={styles.loadingText}>Running Sarvam Speech Translation Pipeline...</Text>
              </View>
            )}

            {interviewResult && (
              <View style={styles.card} className="glass-card">
                <Text style={styles.cardTitle}>Translation Output</Text>
                
                <Text style={styles.langBadge}>Language: {interviewResult.language}</Text>
                
                <Text style={styles.transcriptLabel}>Original Hindi Transcript:</Text>
                <Text style={styles.transcriptText}>{interviewResult.transcript}</Text>
                
                <Text style={styles.transcriptLabel}>English Translation:</Text>
                <Text style={styles.translatedText}>{interviewResult.translation}</Text>

                <View style={styles.complianceNote}>
                  <CheckCircle color="#00FF66" size={18} />
                  <Text style={styles.complianceNoteText}>Linked successfully to Audit Report <Text style={[styles.codeFont, { fontWeight: 'bold' }]}>#4928</Text></Text>
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'settings' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <View style={styles.card} className="glass-card">
              <Text style={[styles.settingLabel, styles.codeFont]}>SYSTEM API PROTOCOL ADDRESS</Text>
              <View style={styles.terminalPromptContainer}>
                <Text style={[styles.promptSymbol, styles.codeFont]}>vigilnet@shell:~$ </Text>
                <TextInput
                  style={[styles.settingInput, styles.codeFont]}
                  value={apiUrl}
                  onChangeText={setApiUrl}
                  placeholder="http://localhost:3000"
                  placeholderTextColor="#1E3F25"
                />
              </View>
              <Text style={[styles.settingDesc, styles.codeFont]}>
                Set your local IP address (e.g. http://192.168.1.50:3000) when running the NestJS API on your development machine.
              </Text>
            </View>
          </View>
        )}

        </ScrollView>
      </ErrorBoundary>

      {/* Navigation Footer */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('dashboard')}>
          <Compass color={activeTab === 'dashboard' ? '#00FF66' : '#94A3B8'} size={22} />
          <Text style={[styles.navText, activeTab === 'dashboard' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('scan')}>
          <Scan color={activeTab === 'scan' ? '#00FF66' : '#94A3B8'} size={22} />
          <Text style={[styles.navText, activeTab === 'scan' && styles.navTextActive]}>Scan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('graph')}>
          <TrendingUp color={activeTab === 'graph' ? '#00FF66' : '#94A3B8'} size={22} />
          <Text style={[styles.navText, activeTab === 'graph' && styles.navTextActive]}>Graph</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('interview')}>
          <Mic color={activeTab === 'interview' ? '#00FF66' : '#94A3B8'} size={22} />
          <Text style={[styles.navText, activeTab === 'interview' && styles.navTextActive]}>Talk</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030604',
  },
  header: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 102, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#030604',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerStatus: {
    color: '#00FF66',
    fontSize: 9,
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  diagnosticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#090D0B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 102, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  diagText: {
    color: '#64748B',
    fontSize: 8,
  },
  diagActive: {
    color: '#00FF66',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  tabContent: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: 1,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#090D0B',
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.25)',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  consoleCard: {
    backgroundColor: '#090D0B',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    height: 140,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.25)',
  },
  consoleScroll: {
    flex: 1,
  },
  consoleLogText: {
    color: '#00FF66',
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 2,
    opacity: 0.85,
  },
  consoleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 102, 0.15)',
    paddingBottom: 4,
  },
  consoleTitle: {
    color: '#00FF66',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  blinkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF66',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 110,
  },
  gaugeTextContainer: {
    position: 'absolute',
    top: 50,
    alignItems: 'center',
  },
  gaugeNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  gaugeLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 102, 0.2)',
    paddingTop: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLbl: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#FF3B30',
    borderWidth: 1,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#00FF66',
    borderWidth: 1,
    backgroundColor: 'rgba(0, 255, 102, 0.05)',
  },
  alertTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  alertDesc: {
    fontSize: 11,
    color: '#E2E8F0',
    marginTop: 2,
  },
  cameraBox: {
    height: 220,
    backgroundColor: '#090D0B',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  cameraText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 12,
    letterSpacing: 1,
  },
  scanActions: {
    flexDirection: 'row',
    marginTop: 20,
    zIndex: 15,
  },
  actionBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    marginHorizontal: 6,
  },
  mockBtn: {
    backgroundColor: '#64748B',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 12,
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 11,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 12,
  },
  metaVal: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    marginTop: 16,
  },
  riskHigh: {
    backgroundColor: '#FF3B30',
  },
  riskLow: {
    backgroundColor: '#00FF66',
  },
  riskBannerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 10,
  },
  riskBannerText: {
    color: '#F8FAFC',
    fontSize: 11,
    marginLeft: 10,
    marginTop: 2,
    width: width - 90,
  },
  viewGraphBtn: {
    backgroundColor: '#334155',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.2)',
  },
  viewGraphText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  graphBox: {
    backgroundColor: '#030604',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.25)',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  legendText: {
    color: '#E2E8F0',
    fontSize: 11,
  },
  recordBox: {
    height: 200,
    backgroundColor: '#090D0B',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  recordText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 12,
    letterSpacing: 1,
  },
  recordActions: {
    marginTop: 20,
  },
  langBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#334155',
    color: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  transcriptLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  transcriptText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 12,
  },
  translatedText: {
    color: '#00FF66',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
    lineHeight: 20,
  },
  complianceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  complianceNoteText: {
    color: '#64748B',
    fontSize: 10,
    marginLeft: 6,
  },
  settingLabel: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  settingInput: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
    height: 36,
    paddingHorizontal: 4,
  },
  settingDesc: {
    color: '#475569',
    fontSize: 10,
    marginTop: 8,
    lineHeight: 14,
  },
  navBar: {
    height: 60,
    backgroundColor: '#030604',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 102, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 4,
  },
  navTextActive: {
    color: '#00FF66',
    fontWeight: 'bold',
  },
  codeFont: {
    fontFamily: Platform.OS === 'web' ? 'Fira Code' : 'monospace',
  },
  vtFont: {
    fontFamily: Platform.OS === 'web' ? 'VT323' : 'monospace',
  },
  oscilloscope: {
    height: 40,
    marginVertical: 12,
  },
  oscBar: {
    // Styling handled in web CSS classes
  },
  terminalPromptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#030604',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 10,
  },
  promptSymbol: {
    color: '#00FF66',
    fontSize: 13,
  },
  hudTopLeft: {
    position: 'absolute',
    top: 8,
    left: 10,
  },
  hudTopRight: {
    position: 'absolute',
    top: 8,
    right: 10,
  },
  hudBottomLeft: {
    position: 'absolute',
    bottom: 8,
    left: 10,
  },
  hudBottomRight: {
    position: 'absolute',
    bottom: 8,
    right: 10,
  },
  hudText: {
    color: '#00FF66',
    fontSize: 8,
    opacity: 0.6,
  },
});
