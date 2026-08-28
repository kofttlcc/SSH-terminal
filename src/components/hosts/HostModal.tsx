import React, { useState, useEffect } from 'react';
import { 
  X, 
  Server, 
  Key, 
  Lock, 
  ShieldCheck, 
  Terminal, 
  Layers, 
  Globe, 
  FolderSync, 
  Tag, 
  FileText,
  Fingerprint,
  Usb,
  Cable,
  RotateCcw,
  Cpu,
  Sparkles
} from 'lucide-react';
import { HostItem, HostGroup, OsType, AuthType, HostProtocol, SerialPortInfo } from '../../types';
import { useVaultStore } from '../../stores/useVaultStore';
import { useAppStore } from '../../stores/useAppStore';

interface HostModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHost?: HostItem | null;
}

export const HostModal: React.FC<HostModalProps> = ({ isOpen, onClose, initialHost }) => {
  const { hosts, groups, keys, addHost, updateHost, addGroup } = useVaultStore();
  const { addToast } = useAppStore();

  const [protocol, setProtocol] = useState<HostProtocol>('ssh');
  const [label, setLabel] = useState('');
  const [hostname, setHostname] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('root');
  const [authType, setAuthType] = useState<AuthType>('password');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [fallbackKeyId, setFallbackKeyId] = useState('');
  const [touchIdKeyId, setTouchIdKeyId] = useState('');
  const [yubikeyKeyId, setYubikeyKeyId] = useState('');
  const [hybridPreferred, setHybridPreferred] = useState<'yubikey' | 'touchid'>('yubikey');
  const [yubiDevices, setYubiDevices] = useState<any[]>([]);
  const [group, setGroup] = useState('');
  const [tags, setTags] = useState('');
  const [osType, setOsType] = useState<OsType>('linux');
  const [jumpHostId, setJumpHostId] = useState('');
  const [startupCommand, setStartupCommand] = useState('');
  const [notes, setNotes] = useState('');
  const [requireTouchId, setRequireTouchId] = useState(false);
  const [touchIdForKey, setTouchIdForKey] = useState(false);
  const [agentForward, setAgentForward] = useState(true);

  // Serial Port specific states
  const [serialPort, setSerialPort] = useState('');
  const [baudRate, setBaudRate] = useState(9600);
  const [dataBits, setDataBits] = useState<5 | 6 | 7 | 8>(8);
  const [stopBits, setStopBits] = useState<1 | 2>(1);
  const [parity, setParity] = useState<'none' | 'even' | 'odd' | 'mark' | 'space'>('none');
  const [flowControl, setFlowControl] = useState<'none' | 'rtscts' | 'xonxoff'>('none');
  const [availablePorts, setAvailablePorts] = useState<SerialPortInfo[]>([]);
  const [scanningPorts, setScanningPorts] = useState(false);

  const [activeTab, setActiveTab] = useState<'general' | 'auth' | 'advanced'>('general');

  const fetchSerialPorts = async () => {
    setScanningPorts(true);
    try {
      if ((window as any).electronAPI?.serial?.listPorts) {
        const ports = await (window as any).electronAPI.serial.listPorts();
        setAvailablePorts(ports || []);
        if (ports && ports.length > 0 && !serialPort) {
          setSerialPort(ports[0].path);
        }
      }
    } catch (err) {
      console.error('Failed to list serial ports:', err);
    } finally {
      setScanningPorts(false);
    }
  };

  const fetchYubiDevices = async () => {
    try {
      if ((window as any).electronAPI?.yubikey?.listDevices) {
        const devs = await (window as any).electronAPI.yubikey.listDevices();
        setYubiDevices(devs || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchSerialPorts();
      fetchYubiDevices();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialHost) {
      setProtocol(initialHost.protocol || 'ssh');
      setLabel(initialHost.label);
      setHostname(initialHost.hostname || '');
      setPort(initialHost.port || 22);
      setUsername(initialHost.username || 'root');
      setAuthType(initialHost.authType || 'password');
      setPassword(initialHost.password || '');
      setPrivateKey(initialHost.privateKey || '');
      setPassphrase(initialHost.passphrase || '');
      setSelectedKeyId(initialHost.keyId || '');
      setFallbackKeyId(initialHost.fallbackKeyId || '');
      setTouchIdKeyId(initialHost.keyId || '');
      setYubikeyKeyId(initialHost.yubikeyKeyId || '');
      setHybridPreferred(initialHost.hybridPreferred || 'yubikey');
      setGroup(initialHost.group || '');
      setTags(initialHost.tags?.join(', ') || '');
      setOsType(initialHost.osType || 'linux');
      setJumpHostId(initialHost.jumpHostId || '');
      setStartupCommand(initialHost.startupCommand || '');
      setNotes(initialHost.notes || '');
      setRequireTouchId(initialHost.requireTouchId || false);
      setTouchIdForKey(initialHost.touchIdForKey || false);
      setAgentForward(initialHost.agentForward !== false);

      // Serial fields
      setSerialPort(initialHost.serialPort || (initialHost.protocol === 'serial' ? initialHost.hostname : ''));
      setBaudRate(initialHost.baudRate || 9600);
      setDataBits(initialHost.dataBits || 8);
      setStopBits(initialHost.stopBits || 1);
      setParity(initialHost.parity || 'none');
      setFlowControl(initialHost.flowControl || 'none');
    } else {
      setProtocol('ssh');
      setLabel('');
      setHostname('');
      setPort(22);
      setUsername('root');
      setAuthType('password');
      setPassword('');
      setPrivateKey('');
      setPassphrase('');
      setSelectedKeyId('');
      setFallbackKeyId('');
      const defaultTouchKey = keys.find(k => k.touchIdProtected || !k.storageType?.includes('yubikey'));
      const defaultYubiKey = keys.find(k => k.storageType?.includes('yubikey') || k.privateKey?.includes('YUBIKEY'));
      setTouchIdKeyId(defaultTouchKey?.id || '');
      setYubikeyKeyId(defaultYubiKey?.id || '');
      setHybridPreferred('yubikey');
      setGroup('');
      setTags('');
      setOsType('linux');
      setJumpHostId('');
      setStartupCommand('');
      setNotes('');
      setRequireTouchId(false);
      setTouchIdForKey(false);
      setAgentForward(true);

      // Serial defaults
      setSerialPort('');
      setBaudRate(9600);
      setDataBits(8);
      setStopBits(1);
      setParity('none');
      setFlowControl('none');
    }
  }, [initialHost, isOpen, keys]);

  if (!isOpen) return null;

  const handleKeySelect = (keyId: string) => {
    setSelectedKeyId(keyId);
    const found = keys.find((k) => k.id === keyId);
    if (found) {
      setPrivateKey(found.privateKey);
      if (found.passphrase) setPassphrase(found.passphrase);
      if (found.touchIdProtected) setTouchIdForKey(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (protocol === 'serial') {
      if (!label.trim() || !serialPort.trim()) {
        addToast('warning', '請輸入必填項目：設備名稱、串口設備路徑');
        return;
      }

      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const hostPayload: any = {
        label: label.trim(),
        protocol: 'serial' as const,
        hostname: serialPort.trim(),
        port: baudRate,
        username: 'serial',
        authType: 'password' as const,
        serialPort: serialPort.trim(),
        baudRate,
        dataBits,
        stopBits,
        parity,
        flowControl,
        group: group || undefined,
        tags: tagList,
        osType: 'server' as const,
        notes: notes.trim() || undefined
      };

      if (initialHost) {
        await updateHost(initialHost.id, hostPayload);
        addToast('success', `串口設備 ${label} 已更新`);
      } else {
        await addHost(hostPayload);
        addToast('success', `串口設備 ${label} 已新增`);
      }

      onClose();
      return;
    }

    // SSH Protocol Validation
    if (!label.trim() || !hostname.trim() || !username.trim()) {
      addToast('warning', '請輸入必填項目：主機名稱、域名/IP、使用者名稱');
      return;
    }

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const hostPayload = {
      label: label.trim(),
      protocol: 'ssh' as const,
      hostname: hostname.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      authType,
      password: authType === 'password' ? password : undefined,
      privateKey: authType === 'privateKey' ? privateKey : undefined,
      passphrase: (authType === 'privateKey' || authType === 'yubikey') && passphrase ? passphrase : undefined,
      keyId: authType === 'hybrid' ? touchIdKeyId : ((authType === 'privateKey' || authType === 'yubikey') ? selectedKeyId : undefined),
      fallbackKeyId: authType === 'hybrid' ? touchIdKeyId : ((authType === 'privateKey' || authType === 'yubikey') ? (fallbackKeyId || undefined) : undefined),
      yubikeyKeyId: authType === 'hybrid' ? yubikeyKeyId : (authType === 'yubikey' ? selectedKeyId : undefined),
      hybridPreferred: authType === 'hybrid' ? hybridPreferred : undefined,
      group: group || undefined,
      tags: tagList,
      osType,
      jumpHostId: jumpHostId || undefined,
      startupCommand: startupCommand.trim() || undefined,
      requireTouchId,
      touchIdForKey: authType === 'privateKey' ? touchIdForKey : undefined,
      agentForward,
      notes: notes.trim() || undefined
    };

    if (initialHost) {
      await updateHost(initialHost.id, hostPayload);
      addToast('success', `主機 ${label} 已更新`);
    } else {
      await addHost(hostPayload);
      addToast('success', `主機 ${label} 已新增`);
    }

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-modal overflow-hidden animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-background/50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              protocol === 'serial' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {protocol === 'serial' ? <Cable className="w-4 h-4" /> : <Server className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                {initialHost ? (protocol === 'serial' ? '編輯串口設備設定' : '編輯主機設定') : (protocol === 'serial' ? '新增 Serial 串口設備' : '新增 SSH 主機')}
              </h2>
              <p className="text-[11px] text-mutedDark">
                {protocol === 'serial' ? '配置交換機 / 路由器 Console 控制台串口通訊參數' : '配置伺服器連線地址與身份認證憑據'}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-sidebar transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Protocol Selector Bar */}
        <div className="px-6 pt-3 pb-1 bg-sidebar/30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setProtocol('ssh'); setActiveTab('general'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
              protocol === 'ssh'
                ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm'
                : 'bg-card/60 border-border/60 text-muted hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>SSH 遠端連線</span>
          </button>

          <button
            type="button"
            onClick={() => { setProtocol('serial'); setActiveTab('general'); fetchSerialPorts(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
              protocol === 'serial'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                : 'bg-card/60 border-border/60 text-muted hover:text-slate-200'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            <span>Serial 串口 (Console / 交換機 / 路由器)</span>
          </button>
        </div>

        {/* Tab Navigation (Only for SSH) */}
        {protocol === 'ssh' && (
          <div className="flex border-b border-border/60 px-6 bg-sidebar/50 text-xs">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-2.5 px-4 font-medium transition-colors border-b-2 ${
                activeTab === 'general' ? 'border-primary text-primary-light' : 'border-transparent text-muted hover:text-slate-200'
              }`}
            >
              基本設定
            </button>
            <button
              onClick={() => setActiveTab('auth')}
              className={`py-2.5 px-4 font-medium transition-colors border-b-2 ${
                activeTab === 'auth' ? 'border-primary text-primary-light' : 'border-transparent text-muted hover:text-slate-200'
              }`}
            >
              身份認證
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`py-2.5 px-4 font-medium transition-colors border-b-2 ${
                activeTab === 'advanced' ? 'border-primary text-primary-light' : 'border-transparent text-muted hover:text-slate-200'
              }`}
            >
              進階與跳板機 (Bastion)
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[65vh] overflow-y-auto no-scrollbar">
          {/* SERIAL PROTOCOL FORM */}
          {protocol === 'serial' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    設備名稱 (標籤) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="例如: Cisco 2960 交換機 Console"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-500 text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">所屬分組</label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-500 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="">(無分組)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Serial Port Device Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    串口設備路徑 (Serial Port) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={fetchSerialPorts}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium transition-colors"
                  >
                    <RotateCcw className={`w-3 h-3 ${scanningPorts ? 'animate-spin' : ''}`} />
                    <span>重新掃描串口</span>
                  </button>
                </div>

                {availablePorts.length > 0 ? (
                  <select
                    value={serialPort}
                    onChange={(e) => setSerialPort(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-500 text-xs text-slate-100 font-mono focus:outline-none"
                  >
                    {availablePorts.map((p) => (
                      <option key={p.path} value={p.path}>
                        🔌 {p.name} — {p.path}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3.5 rounded-xl bg-sidebar border border-border/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                      <Cpu className="w-4 h-4" />
                      <span>未檢測到插入的實體 USB 轉串口線</span>
                    </div>
                    <p className="text-[11px] text-mutedDark">
                      目前電腦尚未檢測到已連接的 USB 轉串口設備（如 FTDI、CH340、CP2102 Console 線）。請插入線材後點擊右上角「重新掃描串口」，或手動在下方填寫路徑。
                    </p>
                    <input
                      type="text"
                      value={serialPort}
                      onChange={(e) => setSerialPort(e.target.value)}
                      placeholder="手動輸入路徑 (例如: /dev/cu.usbserial-140 或 /dev/ttyUSB0)"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-amber-500 text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Baud Rate & 8N1 Preset Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    波特率 (Baud Rate) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-500 text-xs text-slate-100 font-mono focus:outline-none"
                  >
                    <option value={9600}>9600 (推薦 · Cisco/Huawei/H3C/Juniper Console 預設)</option>
                    <option value={115200}>115200 (現代設備 / 嵌入式 Linux / 單片機)</option>
                    <option value={57600}>57600</option>
                    <option value={38400}>38400</option>
                    <option value={19200}>19200</option>
                    <option value={4800}>4800</option>
                    <option value={2400}>2400</option>
                    <option value={1200}>1200</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">資料位 (Data Bits)</label>
                  <select
                    value={dataBits}
                    onChange={(e) => setDataBits(Number(e.target.value) as any)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-500 text-xs text-slate-100 font-mono focus:outline-none"
                  >
                    <option value={8}>8 (預設 8N1)</option>
                    <option value={7}>7</option>
                    <option value={6}>6</option>
                    <option value={5}>5</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">停止位 (Stop Bits)</label>
                  <select
                    value={stopBits}
                    onChange={(e) => setStopBits(Number(e.target.value) as any)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-500 text-xs text-slate-100 font-mono focus:outline-none"
                  >
                    <option value={1}>1 (預設)</option>
                    <option value={2}>2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">校驗位 (Parity)</label>
                  <select
                    value={parity}
                    onChange={(e) => setParity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-500 text-xs text-slate-100 font-mono focus:outline-none"
                  >
                    <option value="none">None (無校驗 - 預設)</option>
                    <option value="even">Even (偶校驗)</option>
                    <option value="odd">Odd (奇校驗)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">流控 (Flow Control)</label>
                  <select
                    value={flowControl}
                    onChange={(e) => setFlowControl(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-500 text-xs text-slate-100 font-mono focus:outline-none"
                  >
                    <option value="none">None (無 - 預設)</option>
                    <option value="rtscts">RTS / CTS (硬體流控)</option>
                    <option value="xonxoff">XON / XOFF (軟體流控)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">標籤 (以逗號分隔)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="例如: 交換機, Cisco, 機房A, 核心網絡"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-500 text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">設備備忘與備註 (Notes)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="記錄 Console 連線口位置、管理密碼或機櫃編號..."
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-500 text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* SSH PROTOCOL FORM */}
          {protocol === 'ssh' && activeTab === 'general' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    主機名稱 (標籤) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="例如: AWS 生產前端叢集"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">所屬分組</label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="">(無分組)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    主機域名或 IP 地址 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="例如: 192.168.1.100 或 ec2.aws.com"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">SSH 端口</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value) || 22)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    使用者名稱 (Username) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="例如: root, ubuntu, ec2-user"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">操作系統環境</label>
                  <select
                    value={osType}
                    onChange={(e) => setOsType(e.target.value as OsType)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="linux">通用 Linux</option>
                    <option value="ubuntu">Ubuntu</option>
                    <option value="debian">Debian</option>
                    <option value="centos">CentOS / RHEL</option>
                    <option value="macos">macOS</option>
                    <option value="docker">Docker 容器</option>
                    <option value="windows">Windows</option>
                    <option value="server">通用伺服器</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">標籤 (以逗號分隔)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="例如: 生產, 網頁伺服器, Nginx"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">備註說明 (Notes)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="填寫主機用途、維護資訊或備註..."
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
                />
              </div>
            </div>
          )}

          {protocol === 'ssh' && activeTab === 'auth' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">認證登入方式</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthType('password')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      authType === 'password'
                        ? 'border-primary bg-primary/10 text-primary-light'
                        : 'border-border bg-sidebar hover:bg-card text-muted hover:text-slate-200'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span className="text-[11px] font-medium">密碼認證</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthType('privateKey')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      authType === 'privateKey'
                        ? 'border-primary bg-primary/10 text-primary-light'
                        : 'border-border bg-sidebar hover:bg-card text-muted hover:text-slate-200'
                    }`}
                  >
                    <Key className="w-4 h-4" />
                    <span className="text-[11px] font-medium">SSH 私鑰</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthType('yubikey')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      authType === 'yubikey'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-border bg-sidebar hover:bg-card text-muted hover:text-slate-200'
                    }`}
                  >
                    <Usb className="w-4 h-4" />
                    <span className="text-[11px] font-medium">YubiKey</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthType('hybrid');
                      if (!touchIdKeyId) {
                        const firstTouch = keys.find(k => k.touchIdProtected || !k.storageType?.includes('yubikey'));
                        if (firstTouch) setTouchIdKeyId(firstTouch.id);
                      }
                      if (!yubikeyKeyId) {
                        const firstYubi = keys.find(k => k.storageType?.includes('yubikey') || k.privateKey?.includes('YUBIKEY'));
                        if (firstYubi) setYubikeyKeyId(firstYubi.id);
                      }
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all relative overflow-hidden ${
                      authType === 'hybrid'
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40 shadow-sm'
                        : 'border-border bg-sidebar hover:bg-card text-muted hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-mutedDark text-[10px]">+</span>
                      <Usb className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <span className="text-[11px] font-semibold tracking-tight">雙模自適應</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthType('agent')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      authType === 'agent'
                        ? 'border-primary bg-primary/10 text-primary-light'
                        : 'border-border bg-sidebar hover:bg-card text-muted hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[11px] font-medium">SSH Agent</span>
                  </button>
                </div>
              </div>

              {authType === 'hybrid' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Banner */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-900/20 via-sidebar to-amber-900/20 border border-purple-500/30 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                        <span>指紋 (Touch ID) ＋ YubiKey 雙模自適應認證</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/30 text-purple-200 border border-purple-500/40">OR 容災互備</span>
                      </div>
                      <p className="text-[11px] text-mutedDark mt-0.5 leading-relaxed">
                        伺服器已配置這兩組公鑰。在公司/插上 YubiKey 時觸碰硬體，出門沒帶 YubiKey 時自動平滑喚醒 Touch ID 指紋識別，兩者隨時可用，免去切換主機設定的困擾。
                      </p>
                    </div>
                  </div>

                  {/* Live hardware status badge */}
                  <div className="px-3 py-2 rounded-xl bg-sidebar/70 border border-border/60 flex items-center justify-between text-xs">
                    <span className="text-muted text-[11px]">目前本地硬體檢測：</span>
                    {yubiDevices.length > 0 ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        已檢測到 {yubiDevices[0].model || 'YubiKey 5 系列'} (可即時觸摸)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-purple-400 font-medium text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        未插入 YubiKey (連線將自動調用 Touch ID 指紋秒級登入)
                      </span>
                    )}
                  </div>

                  {/* Dual Key Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Key 1: Touch ID Key */}
                    <div className="p-3.5 rounded-xl bg-sidebar border border-purple-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                        <Fingerprint className="w-4 h-4 text-purple-400" />
                        <span>1. Touch ID 指紋認證私鑰</span>
                      </div>
                      <select
                        value={touchIdKeyId}
                        onChange={(e) => setTouchIdKeyId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-purple-500/40 text-xs text-slate-100 focus:outline-none"
                      >
                        <option value="">-- 請選擇指紋密鑰 --</option>
                        {keys.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.touchIdProtected ? '🔒 [Touch ID] ' : '🔑 '}{k.name} ({k.type.toUpperCase()})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-mutedDark">
                        當 YubiKey 未在身邊時，連線將使用此私鑰並調用 macOS / Windows 本地生物識別解鎖。
                      </p>
                    </div>

                    {/* Key 2: YubiKey Key */}
                    <div className="p-3.5 rounded-xl bg-sidebar border border-amber-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                        <Usb className="w-4 h-4 text-amber-400" />
                        <span>2. YubiKey 實體硬體金鑰</span>
                      </div>
                      <select
                        value={yubikeyKeyId}
                        onChange={(e) => setYubikeyKeyId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-amber-500/40 text-xs text-slate-100 focus:outline-none"
                      >
                        <option value="">-- 請選擇 YubiKey 金鑰 --</option>
                        {keys.filter(k => k.storageType === 'yubikey_piv' || k.storageType === 'yubikey_fido2' || k.privateKey?.includes('YUBIKEY') || !k.touchIdProtected).map((k) => (
                          <option key={k.id} value={k.id}>
                            🛡️ {k.name} ({k.type.toUpperCase()})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-mutedDark">
                        當插上 YubiKey 時，連線將優先調用此硬體金鑰並等待物理電極觸控。
                      </p>
                    </div>
                  </div>

                  {/* Priority Option */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">預設優先級策略</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        onClick={() => setHybridPreferred('yubikey')}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                          hybridPreferred === 'yubikey'
                            ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                            : 'border-border bg-sidebar hover:bg-card text-muted'
                        }`}
                      >
                        <input
                          type="radio"
                          name="hybridPref"
                          checked={hybridPreferred === 'yubikey'}
                          onChange={() => setHybridPreferred('yubikey')}
                          className="accent-amber-500"
                        />
                        <div className="text-[11px]">
                          <div className="font-semibold">優先使用 YubiKey (預設)</div>
                          <div className="text-[10px] text-mutedDark">插上時觸碰硬體，未插時自動切換指紋</div>
                        </div>
                      </label>

                      <label
                        onClick={() => setHybridPreferred('touchid')}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                          hybridPreferred === 'touchid'
                            ? 'border-purple-500/60 bg-purple-500/10 text-purple-300'
                            : 'border-border bg-sidebar hover:bg-card text-muted'
                        }`}
                      >
                        <input
                          type="radio"
                          name="hybridPref"
                          checked={hybridPreferred === 'touchid'}
                          onChange={() => setHybridPreferred('touchid')}
                          className="accent-purple-500"
                        />
                        <div className="text-[11px]">
                          <div className="font-semibold">優先使用 Touch ID 指紋</div>
                          <div className="text-[10px] text-mutedDark">直接彈指紋窗，隨時可插入 YubiKey 備用</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {authType === 'password' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">登入密碼</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="請輸入 SSH 登入密碼"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none"
                  />
                </div>
              )}

              {authType === 'yubikey' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                        <Usb className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">YubiKey 硬體金鑰認證 (PIV / FIDO2)</div>
                        <div className="text-[10px] text-mutedDark">連線時將即時調用實體 YubiKey 晶片進行硬體身份簽名</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      選擇 YubiKey 硬體金鑰
                    </label>
                    <select
                      value={selectedKeyId}
                      onChange={(e) => handleKeySelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-500 text-xs text-slate-100 focus:outline-none"
                    >
                      <option value="">-- 請選擇 YubiKey 金鑰 --</option>
                      {keys.filter(k => k.storageType === 'yubikey_piv' || k.storageType === 'yubikey_fido2' || k.privateKey?.includes('YUBIKEY')).map((k) => (
                        <option key={k.id} value={k.id}>
                          🛡️ {k.name} ({k.type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      🛡️ 備用容災密鑰 (當 YubiKey 未插入電腦時自動切換使用)
                    </label>
                    <select
                      value={fallbackKeyId}
                      onChange={(e) => setFallbackKeyId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-amber-500 text-xs text-slate-100 focus:outline-none"
                    >
                      <option value="">(無備用密鑰 - 僅限 YubiKey)</option>
                      {keys.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.touchIdProtected ? '🔒 [Touch ID 指紋] ' : '🔑 '}{k.name} ({k.type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-mutedDark mt-1">
                      💡 提示：若未攜帶或未插入 YubiKey，連線時將自動切換至所選備用指紋密鑰完成認證。
                    </p>
                  </div>
                </div>
              )}

              {authType === 'privateKey' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      從密鑰庫快速選擇已儲存私鑰
                    </label>
                    <select
                      value={selectedKeyId}
                      onChange={(e) => handleKeySelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none"
                    >
                      <option value="">-- 手動貼上或選擇現有金鑰 --</option>
                      {keys.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.touchIdProtected ? '🔒 [Touch ID] ' : ''}{k.name} ({k.type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      🛡️ 備用容災密鑰 (當主密鑰不可用時自動切換)
                    </label>
                    <select
                      value={fallbackKeyId}
                      onChange={(e) => setFallbackKeyId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none"
                    >
                      <option value="">(無備用密鑰)</option>
                      {keys.filter(k => k.id !== selectedKeyId).map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.touchIdProtected ? '🔒 [Touch ID 指紋] ' : '🔑 '}{k.name} ({k.type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      私鑰內容 (PEM / OpenSSH 格式)
                    </label>
                    <textarea
                      rows={4}
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY----- 或 -----BEGIN RSA PRIVATE KEY-----"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-[11px] text-slate-200 placeholder-mutedDark focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      私鑰密碼短語 (Passphrase，選填)
                    </label>
                    <input
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="若私鑰已加密，請輸入解密短語"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Touch ID for Private Key Auth */}
                  <div className="p-3.5 rounded-xl bg-sidebar border border-border/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0">
                        <Fingerprint className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">調用 Touch ID 指紋認證私鑰</div>
                        <div className="text-[10px] text-mutedDark">每次連線此主機時，必須通過 Touch ID 指紋識別方可授權私鑰簽名登入</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={touchIdForKey}
                      onChange={(e) => setTouchIdForKey(e.target.checked)}
                      className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {protocol === 'ssh' && activeTab === 'advanced' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  跳板機 / 堡壘機 (ProxyJump Bastion)
                </label>
                <select
                  value={jumpHostId}
                  onChange={(e) => setJumpHostId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 focus:outline-none"
                >
                  <option value="">(直連模式 - 不使用跳板機)</option>
                  {hosts
                    .filter((h) => h.id !== initialHost?.id)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.label} ({h.username}@{h.hostname}:{h.port})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-mutedDark mt-1">
                  設定後，客戶端將先連線至跳板機，並自動隧道轉發至該目標主機。
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">連線後自動執行腳本 (Startup Command)</label>
                <input
                  type="text"
                  value={startupCommand}
                  onChange={(e) => setStartupCommand(e.target.value)}
                  placeholder="例如: cd /var/www && tmux attach || tmux new"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary text-xs text-slate-100 placeholder-mutedDark focus:outline-none font-mono"
                />
              </div>

              {/* Touch ID Security Toggle */}
              <div className="p-3.5 rounded-2xl bg-sidebar border border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary-light flex items-center justify-center flex-shrink-0">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Touch ID 指紋識別認證</div>
                    <div className="text-[10px] text-mutedDark">發起 SSH 連線或開啟 SFTP 前，必須通過 Mac 指紋解鎖授權</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requireTouchId}
                  onChange={(e) => setRequireTouchId(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>

              {/* SSH Agent Forwarding with Touch ID */}
              <div className="p-3.5 rounded-2xl bg-sidebar border border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">SSH Agent 轉發 (本地 Touch ID 指紋授權)</div>
                    <div className="text-[10px] text-mutedDark">在此主機終端執行 ssh 連線其他伺服器時，自動調用本地 Mac 指紋授權，跳板機上 0 私鑰殘留</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={agentForward}
                  onChange={(e) => setAgentForward(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-sidebar hover:bg-card text-muted hover:text-white text-xs font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-all active:scale-95 ${
                protocol === 'serial' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-primary hover:bg-primary-hover'
              }`}
            >
              {initialHost ? '儲存變更' : (protocol === 'serial' ? '建立串口設備' : '建立主機')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
