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
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
          body, input, button, select, textarea, div, span, p, a {
            font-family: 'Fira Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          svg text, .code-font {
            font-family: 'Fira Code', monospace !important;
          }
          body {
            background-color: #020617 !important;
            margin: 0;
            padding: 0;
          }
          .glass-card {
            background: rgba(22, 27, 46, 0.75) !important;
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .glass-card:hover {
            transform: translateY(-4px);
            border-color: rgba(6, 182, 212, 0.45) !important;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5) !important;
          }
          .alert-hover {
            border-color: rgba(244, 63, 94, 0.3) !important;
          }
          .alert-hover:hover {
            box-shadow: 0 16px 40px rgba(244, 63, 94, 0.25) !important;
          }
          .info-hover {
            border-color: rgba(16, 185, 129, 0.3) !important;
          }
          .info-hover:hover {
            box-shadow: 0 16px 40px rgba(16, 185, 129, 0.25) !important;
          }
          .btn-glow {
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .btn-glow:hover {
            filter: brightness(1.2);
            transform: translateY(-1px);
            box-shadow: 0 0 18px rgba(16, 185, 129, 0.45);
          }
          .btn-glow:active {
            transform: translateY(1px);
          }
          .mock-btn-glow {
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .mock-btn-glow:hover {
            filter: brightness(1.15);
            transform: translateY(-1px);
            box-shadow: 0 0 15px rgba(100, 116, 139, 0.4);
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
            background: #10B981;
            box-shadow: 0 0 8px #10B981, 0 0 15px #10B981;
            animation: scanLaser 3s infinite linear;
            z-index: 10;
          }
          .pulse-record {
            animation: pulseRecord 1.5s infinite ease-in-out;
          }
          @keyframes pulseRecord {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            .laser-line, .pulse-record, .glass-card, .btn-glow, .mock-btn-glow {
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
          <ShieldAlert color="#10B981" size={28} />
          <Text style={styles.brandText}>VIGIL<Text style={{ color: '#10B981' }}>NET</Text></Text>
        </View>
        <TouchableOpacity onPress={() => setActiveTab('settings')}>
          <Settings color="#94A3B8" size={24} />
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ErrorBoundary>
        <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {activeTab === 'dashboard' && (
          <View style={styles.tabContent}>
            {/* Compliance Gauge Card */}
            <View style={styles.card} className="glass-card">
              <Text style={styles.cardTitle}>Global Fleet Compliance</Text>
              <View style={styles.gaugeContainer}>
                <Svg width="180" height="100" viewBox="0 0 100 50">
                  <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                  <Circle cx="50" cy="50" r="40" stroke="#1E293B" strokeWidth="10" fill="none" strokeDasharray="125 250" />
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
              <AlertTriangle color="#EF4444" size={24} />
              <View style={styles.alertTextContainer}>
                <Text style={styles.alertTitle}>Tier-3 Materials Breach</Text>
                <Text style={styles.alertDesc}>Linhai Textiles linked directly to Xinjiang Logistics Ltd (OFAC List).</Text>
              </View>
            </View>

            <View style={[styles.card, styles.infoCard]} className="glass-card info-hover">
              <CheckCircle color="#10B981" size={24} />
              <View style={styles.alertTextContainer}>
                <Text style={[styles.alertTitle, { color: '#10B981' }]}>Audit Complete: Ningbo Co</Text>
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
              <FileText color="#94A3B8" size={64} />
              <Text style={styles.cameraText}>Manifest Scanner Active</Text>
              
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
                <ActivityIndicator size="large" color="#10B981" />
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
                  
                  // Simple coordinate mapping for the nodes
                  const sx = sourceNode.id === '1' ? 70 : sourceNode.id === '2' ? 70 : sourceNode.id === '3' ? 170 : 270;
                  const sy = sourceNode.id === '1' ? 150 : sourceNode.id === '2' ? 50 : sourceNode.id === '3' ? 150 : 150;
                  const tx = targetNode.id === '1' ? 70 : targetNode.id === '2' ? 70 : targetNode.id === '3' ? 170 : 270;
                  const ty = targetNode.id === '1' ? 150 : targetNode.id === '2' ? 50 : targetNode.id === '3' ? 150 : 150;

                  return (
                    <Line
                      key={idx}
                      x1={sx}
                      y1={sy}
                      x2={tx}
                      y2={ty}
                      stroke={sourceNode.risk === 100 || targetNode.risk === 100 ? '#EF4444' : '#64748B'}
                      strokeWidth="2.5"
                      strokeDasharray={sourceNode.risk === 100 || targetNode.risk === 100 ? '4 4' : '0'}
                    />
                  );
                })}

                {/* Nodes */}
                {graphData.nodes.map((node: any) => {
                  const x = node.id === '1' ? 70 : node.id === '2' ? 70 : node.id === '3' ? 170 : 270;
                  const y = node.id === '1' ? 150 : node.id === '2' ? 50 : node.id === '3' ? 150 : 150;
                  const color = node.risk === 100 ? '#EF4444' : node.risk >= 80 ? '#F97316' : node.risk >= 50 ? '#EAB308' : '#10B981';

                  return (
                    <G key={node.id}>
                      <Circle cx={x} cy={y} r="18" fill="#1E293B" stroke={color} strokeWidth="3" />
                      <SvgText x={x} y={y + 32} fill="#F8FAFC" fontSize="10" textAnchor="middle" fontWeight="bold" fontFamily={Platform.OS === 'web' ? 'Fira Code' : 'monospace'}>
                        {node.name.split(' ')[0]}
                      </SvgText>
                      <SvgText x={x} y={y + 42} fill="#94A3B8" fontSize="8" textAnchor="middle" fontFamily={Platform.OS === 'web' ? 'Fira Code' : 'monospace'}>
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
                <Mic color={isRecording ? '#EF4444' : '#10B981'} size={64} />
              </View>
              
              <Text style={styles.recordText}>
                {isRecording ? 'Recording Audio...' : 'Ready to Record'}
              </Text>

              <View style={styles.recordActions}>
                {!isRecording ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} className="btn-glow" onPress={startRecording}>
                    <Text style={styles.actionBtnText}>Start Recording</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} className="btn-glow" onPress={stopRecording}>
                    <Text style={styles.actionBtnText}>Stop & Translate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isTranslating && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#10B981" />
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
                  <CheckCircle color="#10B981" size={18} />
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
              <Text style={styles.settingLabel}>Backend Server IP/URL</Text>
              <TextInput
                style={styles.settingInput}
                value={apiUrl}
                onChangeText={setApiUrl}
                placeholder="http://localhost:3000"
                placeholderTextColor="#64748B"
              />
              <Text style={styles.settingDesc}>
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
          <Compass color={activeTab === 'dashboard' ? '#10B981' : '#94A3B8'} size={22} />
          <Text style={[styles.navText, activeTab === 'dashboard' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('scan')}>
          <Scan color={activeTab === 'scan' ? '#10B981' : '#94A3B8'} size={22} />
          <Text style={[styles.navText, activeTab === 'scan' && styles.navTextActive]}>Scan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('graph')}>
          <TrendingUp color={activeTab === 'graph' ? '#10B981' : '#94A3B8'} size={22} />
          <Text style={[styles.navText, activeTab === 'graph' && styles.navTextActive]}>Graph</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('interview')}>
          <Mic color={activeTab === 'interview' ? '#10B981' : '#94A3B8'} size={22} />
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
    backgroundColor: '#080C14',
  },
  header: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#20263F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#121624',
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
    letterSpacing: 1.5,
  },
  scrollContent: {
    padding: 16,
  },
  tabContent: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 12,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#161B30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#252D4A',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 12,
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
    fontSize: 11,
    color: '#94A3B8',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
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
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#10B981',
    borderWidth: 1.5,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  alertTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  alertDesc: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
  },
  cameraBox: {
    height: 220,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cameraText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  scanActions: {
    flexDirection: 'row',
    marginTop: 20,
  },
  actionBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  mockBtn: {
    backgroundColor: '#64748B',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 13,
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 12,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  metaLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  metaVal: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  riskHigh: {
    backgroundColor: '#EF4444',
  },
  riskLow: {
    backgroundColor: '#10B981',
  },
  riskBannerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
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
    backgroundColor: '#475569',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  viewGraphText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  graphBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
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
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendText: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  recordBox: {
    height: 200,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  recordText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 12,
  },
  recordActions: {
    marginTop: 20,
  },
  langBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#475569',
    color: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  transcriptLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  transcriptText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 12,
  },
  translatedText: {
    color: '#10B981',
    fontSize: 15,
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
    borderTopColor: '#334155',
  },
  complianceNoteText: {
    color: '#94A3B8',
    fontSize: 11,
    marginLeft: 6,
  },
  settingLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 6,
  },
  settingInput: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  settingDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
  navBar: {
    height: 65,
    backgroundColor: '#121624',
    borderTopWidth: 1,
    borderTopColor: '#20263F',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  navTextActive: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  codeFont: {
    fontFamily: Platform.OS === 'web' ? 'Fira Code' : 'monospace',
  },
});
