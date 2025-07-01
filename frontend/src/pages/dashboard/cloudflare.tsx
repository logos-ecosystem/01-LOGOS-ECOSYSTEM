import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import withAuth from '@/components/Auth/withAuth';
import cloudflareService, { DNSRecord, Zone, SecuritySettings } from '@/services/cloudflare';
import dynamic from 'next/dynamic';

// Dynamic imports for charts
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });

const CloudflarePage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'dns' | 'security' | 'analytics'>('overview');
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([]);
  const [showAddDNSModal, setShowAddDNSModal] = useState(false);
  const [showEditDNSModal, setShowEditDNSModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DNSRecord | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);

  // Load zones on mount
  useEffect(() => {
    loadZones();
  }, []);

  // Load zone data when selected
  useEffect(() => {
    if (selectedZone) {
      loadZoneData();
    }
  }, [selectedZone]);

  const loadZones = async () => {
    try {
      setLoading(true);
      const zoneList = await cloudflareService.listZones();
      setZones(zoneList);
      if (zoneList.length > 0) {
        setSelectedZone(zoneList[0]);
        await cloudflareService.setZone(zoneList[0].id);
      }
    } catch (error) {
      console.error('Error loading zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadZoneData = async () => {
    if (!selectedZone) return;
    
    try {
      const [records, security] = await Promise.all([
        cloudflareService.listDNSRecords(selectedZone.id),
        cloudflareService.getSecuritySettings(selectedZone.id)
      ]);
      
      setDnsRecords(records);
      setSecuritySettings(security);
    } catch (error) {
      console.error('Error loading zone data:', error);
    }
  };

  const handleAddDNSRecord = async (record: DNSRecord) => {
    if (!selectedZone) return;
    
    try {
      const newRecord = await cloudflareService.createDNSRecord(selectedZone.id, record);
      setDnsRecords([...dnsRecords, newRecord]);
      setShowAddDNSModal(false);
    } catch (error) {
      console.error('Error adding DNS record:', error);
    }
  };

  const handleUpdateDNSRecord = async (recordId: string, updates: Partial<DNSRecord>) => {
    if (!selectedZone) return;
    
    try {
      const updatedRecord = await cloudflareService.updateDNSRecord(selectedZone.id, recordId, updates);
      setDnsRecords(dnsRecords.map(r => r.id === recordId ? updatedRecord : r));
      setShowEditDNSModal(false);
    } catch (error) {
      console.error('Error updating DNS record:', error);
    }
  };

  const handleDeleteDNSRecord = async (recordId: string) => {
    if (!selectedZone || !confirm('Are you sure you want to delete this DNS record?')) return;
    
    try {
      await cloudflareService.deleteDNSRecord(selectedZone.id, recordId);
      setDnsRecords(dnsRecords.filter(r => r.id !== recordId));
    } catch (error) {
      console.error('Error deleting DNS record:', error);
    }
  };

  const handleSecuritySettingChange = async (setting: string, value: any) => {
    if (!selectedZone) return;
    
    try {
      await cloudflareService.updateSecuritySetting(selectedZone.id, setting, value);
      await loadZoneData(); // Reload to get updated settings
    } catch (error) {
      console.error('Error updating security setting:', error);
    }
  };

  const handlePurgeCache = async () => {
    if (!selectedZone || !confirm('Are you sure you want to purge all cache?')) return;
    
    try {
      await cloudflareService.purgeCache(selectedZone.id);
      alert('Cache purged successfully!');
    } catch (error) {
      console.error('Error purging cache:', error);
    }
  };

  // Mock analytics data
  const analyticsData = {
    requests: { all: 1234567, cached: 987654, uncached: 246913 },
    bandwidth: { all: 456.78, cached: 345.67, uncached: 111.11 },
    threats: { all: 12345, blocked: 11234 },
    pageviews: { all: 890123, search_engines: 234567 }
  };

  const requestsChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Total Requests',
      data: [165432, 178965, 192345, 168790, 185432, 142567, 198765],
      borderColor: 'rgb(251, 146, 60)',
      backgroundColor: 'rgba(251, 146, 60, 0.1)',
      tension: 0.4
    }]
  };

  const threatsChartData = {
    labels: ['Blocked', 'Allowed'],
    datasets: [{
      data: [analyticsData.threats.blocked, analyticsData.threats.all - analyticsData.threats.blocked],
      backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(34, 197, 94, 0.8)'],
      borderColor: ['rgb(239, 68, 68)', 'rgb(34, 197, 94)'],
      borderWidth: 1
    }]
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <i className="fab fa-cloudflare text-white text-xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-white">Cloudflare Management</h1>
          </div>
          <p className="text-gray-400">Manage DNS, security, and performance settings</p>
        </div>

        {/* Zone Selector */}
        {zones.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Select Zone</label>
            <select
              value={selectedZone?.id || ''}
              onChange={(e) => {
                const zone = zones.find(z => z.id === e.target.value);
                setSelectedZone(zone || null);
                if (zone) cloudflareService.setZone(zone.id);
              }}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
            >
              {zones.map(zone => (
                <option key={zone.id} value={zone.id}>{zone.name}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-4xl text-orange-500 mb-4"></i>
              <p className="text-gray-400">Loading Cloudflare data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
                <div className="flex items-center justify-between mb-4">
                  <i className="fas fa-globe text-2xl text-orange-400"></i>
                  <span className="text-xs text-gray-400">Requests</span>
                </div>
                <p className="text-2xl font-bold text-white">{(analyticsData.requests.all / 1000000).toFixed(2)}M</p>
                <p className="text-sm text-gray-400 mt-1">Total requests</p>
              </div>

              <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
                <div className="flex items-center justify-between mb-4">
                  <i className="fas fa-shield-alt text-2xl text-green-400"></i>
                  <span className="text-xs text-gray-400">Security</span>
                </div>
                <p className="text-2xl font-bold text-white">{(analyticsData.threats.blocked / 1000).toFixed(1)}K</p>
                <p className="text-sm text-gray-400 mt-1">Threats blocked</p>
              </div>

              <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
                <div className="flex items-center justify-between mb-4">
                  <i className="fas fa-tachometer-alt text-2xl text-blue-400"></i>
                  <span className="text-xs text-gray-400">Bandwidth</span>
                </div>
                <p className="text-2xl font-bold text-white">{analyticsData.bandwidth.all.toFixed(1)} GB</p>
                <p className="text-sm text-gray-400 mt-1">Total bandwidth</p>
              </div>

              <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
                <div className="flex items-center justify-between mb-4">
                  <i className="fas fa-bolt text-2xl text-yellow-400"></i>
                  <span className="text-xs text-gray-400">Cache</span>
                </div>
                <p className="text-2xl font-bold text-white">{((analyticsData.requests.cached / analyticsData.requests.all) * 100).toFixed(1)}%</p>
                <p className="text-sm text-gray-400 mt-1">Cache hit rate</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                    : 'glass-effect text-gray-300 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('dns')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'dns'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                    : 'glass-effect text-gray-300 hover:text-white'
                }`}
              >
                DNS Records
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'security'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                    : 'glass-effect text-gray-300 hover:text-white'
                }`}
              >
                Security
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                    : 'glass-effect text-gray-300 hover:text-white'
                }`}
              >
                Analytics
              </button>
            </div>

            {/* Content */}
            {activeTab === 'overview' && selectedZone && (
              <div className="space-y-6">
                {/* Zone Info */}
                <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
                  <h3 className="text-xl font-semibold text-white mb-4">Zone Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Domain</p>
                      <p className="text-white font-medium">{selectedZone.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Status</p>
                      <span className={`inline-flex items-center gap-2 ${
                        selectedZone.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        <i className={`fas fa-circle text-xs`}></i>
                        {selectedZone.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Plan</p>
                      <p className="text-white font-medium capitalize">{selectedZone.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Created</p>
                      <p className="text-white font-medium">
                        {new Date(selectedZone.created_on).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
                  <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button 
                      onClick={handlePurgeCache}
                      className="p-4 bg-orange-500/20 rounded-lg hover:bg-orange-500/30 transition-colors text-center"
                    >
                      <i className="fas fa-trash-alt text-2xl text-orange-400 mb-2"></i>
                      <p className="text-white">Purge Cache</p>
                    </button>
                    <button 
                      onClick={() => handleSecuritySettingChange('development_mode', 1)}
                      className="p-4 bg-blue-500/20 rounded-lg hover:bg-blue-500/30 transition-colors text-center"
                    >
                      <i className="fas fa-code text-2xl text-blue-400 mb-2"></i>
                      <p className="text-white">Dev Mode</p>
                    </button>
                    <button 
                      onClick={() => cloudflareService.enableUnderAttackMode(selectedZone.id)}
                      className="p-4 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors text-center"
                    >
                      <i className="fas fa-shield-alt text-2xl text-red-400 mb-2"></i>
                      <p className="text-white">Under Attack</p>
                    </button>
                    <button className="p-4 bg-green-500/20 rounded-lg hover:bg-green-500/30 transition-colors text-center">
                      <i className="fas fa-rocket text-2xl text-green-400 mb-2"></i>
                      <p className="text-white">Speed Test</p>
                    </button>
                  </div>
                </div>

                {/* Name Servers */}
                <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
                  <h3 className="text-xl font-semibold text-white mb-4">Name Servers</h3>
                  <div className="space-y-2">
                    {selectedZone.name_servers.map((ns, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                        <i className="fas fa-server text-orange-400"></i>
                        <code className="text-white font-mono">{ns}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dns' && (
              <div className="glass-effect rounded-xl border border-orange-500/20">
                {/* DNS Header */}
                <div className="p-4 border-b border-gray-800">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-white">DNS Records</h3>
                    <button
                      onClick={() => setShowAddDNSModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Record
                    </button>
                  </div>
                </div>

                {/* DNS Records Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Content</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">TTL</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Proxy</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dnsRecords.map((record) => (
                        <tr key={record.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              record.type === 'A' ? 'bg-blue-500/20 text-blue-300' :
                              record.type === 'CNAME' ? 'bg-purple-500/20 text-purple-300' :
                              record.type === 'MX' ? 'bg-green-500/20 text-green-300' :
                              record.type === 'TXT' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {record.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white font-mono text-sm">{record.name}</td>
                          <td className="py-3 px-4 text-gray-300 font-mono text-sm max-w-xs truncate">
                            {record.content}
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {record.ttl === 1 ? 'Auto' : `${record.ttl}s`}
                          </td>
                          <td className="py-3 px-4">
                            {record.proxied !== undefined && (
                              <span className={`inline-flex items-center gap-1 ${
                                record.proxied ? 'text-orange-400' : 'text-gray-400'
                              }`}>
                                <i className="fas fa-cloud"></i>
                                {record.proxied ? 'On' : 'Off'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setShowEditDNSModal(true);
                                }}
                                className="text-cyan-400 hover:text-cyan-300"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                onClick={() => handleDeleteDNSRecord(record.id!)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'security' && securitySettings && (
              <div className="space-y-6">
                {/* SSL/TLS */}
                <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
                  <h3 className="text-xl font-semibold text-white mb-6">SSL/TLS Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">SSL Mode</label>
                      <select
                        value={securitySettings.ssl_mode}
                        onChange={(e) => handleSecuritySettingChange('ssl', e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="off">Off</option>
                        <option value="flexible">Flexible</option>
                        <option value="full">Full</option>
                        <option value="strict">Full (Strict)</option>
                      </select>
                    </div>

                    <label className="flex items-center justify-between">
                      <div>
                        <p className="text-white">Always Use HTTPS</p>
                        <p className="text-sm text-gray-400">Redirect all HTTP requests to HTTPS</p>
                      </div>
                      <button 
                        onClick={() => handleSecuritySettingChange('always_use_https', !securitySettings.automatic_https_rewrites)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          securitySettings.automatic_https_rewrites ? 'bg-orange-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          securitySettings.automatic_https_rewrites ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </label>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Minimum TLS Version</label>
                      <select
                        value={securitySettings.min_tls_version}
                        onChange={(e) => handleSecuritySettingChange('min_tls_version', e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="1.0">TLS 1.0</option>
                        <option value="1.1">TLS 1.1</option>
                        <option value="1.2">TLS 1.2</option>
                        <option value="1.3">TLS 1.3</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Firewall */}
                <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
                  <h3 className="text-xl font-semibold text-white mb-6">Firewall Settings</h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between">
                      <div>
                        <p className="text-white">Web Application Firewall (WAF)</p>
                        <p className="text-sm text-gray-400">Protect against common web vulnerabilities</p>
                      </div>
                      <button 
                        onClick={() => handleSecuritySettingChange('waf', !securitySettings.waf)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          securitySettings.waf ? 'bg-orange-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          securitySettings.waf ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </label>

                    <label className="flex items-center justify-between">
                      <div>
                        <p className="text-white">Rate Limiting</p>
                        <p className="text-sm text-gray-400">Protect against abuse and DDoS</p>
                      </div>
                      <button 
                        onClick={() => handleSecuritySettingChange('rate_limiting', !securitySettings.rate_limiting)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          securitySettings.rate_limiting ? 'bg-orange-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          securitySettings.rate_limiting ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </label>

                    <label className="flex items-center justify-between">
                      <div>
                        <p className="text-white">Bot Management</p>
                        <p className="text-sm text-gray-400">Detect and mitigate bot traffic</p>
                      </div>
                      <button 
                        onClick={() => handleSecuritySettingChange('bot_management', !securitySettings.bot_management)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          securitySettings.bot_management ? 'bg-orange-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          securitySettings.bot_management ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </label>
                  </div>
                </div>

                {/* Security Level */}
                <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
                  <h3 className="text-xl font-semibold text-white mb-6">Security Level</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {['off', 'essentially_off', 'low', 'medium', 'high'].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleSecuritySettingChange('security_level', level)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          false ? 'border-orange-500 bg-orange-500/20' : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <p className="text-white font-medium capitalize">
                          {level.replace('_', ' ')}
                        </p>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => cloudflareService.enableUnderAttackMode(selectedZone!.id)}
                    className="mt-4 w-full px-4 py-3 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <i className="fas fa-shield-alt mr-2"></i>
                    Enable "I'm Under Attack" Mode
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 glass-effect rounded-xl p-6 border border-orange-500/20">
                    <h3 className="text-xl font-semibold text-white mb-4">Requests Over Time</h3>
                    <div className="h-64">
                      <Line data={requestsChartData} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: 'rgb(251, 146, 60)',
                            borderWidth: 1
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                          },
                          x: {
                            grid: { display: false },
                            ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                          }
                        }
                      }} />
                    </div>
                  </div>

                  <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
                    <h3 className="text-xl font-semibold text-white mb-4">Threat Protection</h3>
                    <div className="h-64 flex items-center justify-center">
                      <Doughnut data={threatsChartData} options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: { color: 'rgba(255, 255, 255, 0.7)' }
                          }
                        }
                      }} />
                    </div>
                  </div>
                </div>

                {/* Detailed Stats */}
                <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
                  <h3 className="text-xl font-semibold text-white mb-6">Detailed Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-lg font-medium text-white mb-4">Requests</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total</span>
                          <span className="text-white font-medium">{analyticsData.requests.all.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cached</span>
                          <span className="text-green-400 font-medium">{analyticsData.requests.cached.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Uncached</span>
                          <span className="text-yellow-400 font-medium">{analyticsData.requests.uncached.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-medium text-white mb-4">Bandwidth</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total</span>
                          <span className="text-white font-medium">{analyticsData.bandwidth.all.toFixed(2)} GB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cached</span>
                          <span className="text-green-400 font-medium">{analyticsData.bandwidth.cached.toFixed(2)} GB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Uncached</span>
                          <span className="text-yellow-400 font-medium">{analyticsData.bandwidth.uncached.toFixed(2)} GB</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-medium text-white mb-4">Page Views</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total</span>
                          <span className="text-white font-medium">{analyticsData.pageviews.all.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Search Engines</span>
                          <span className="text-blue-400 font-medium">{analyticsData.pageviews.search_engines.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Direct</span>
                          <span className="text-purple-400 font-medium">
                            {(analyticsData.pageviews.all - analyticsData.pageviews.search_engines).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add DNS Record Modal */}
      {showAddDNSModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-6">Add DNS Record</h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddDNSRecord({
                type: formData.get('type') as DNSRecord['type'],
                name: formData.get('name') as string,
                content: formData.get('content') as string,
                ttl: 1,
                proxied: formData.get('proxied') === 'true'
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Type</label>
                  <select name="type" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                    <option value="A">A</option>
                    <option value="AAAA">AAAA</option>
                    <option value="CNAME">CNAME</option>
                    <option value="TXT">TXT</option>
                    <option value="MX">MX</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="@ for root or subdomain"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Content</label>
                  <input
                    type="text"
                    name="content"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="IP address or target"
                    required
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="proxied" value="true" defaultChecked />
                    <span className="text-gray-300">Proxy through Cloudflare</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddDNSModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuth(CloudflarePage);