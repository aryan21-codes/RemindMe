import React, { useState, useEffect } from 'react';
import { Save, Send, AlertCircle, CheckCircle, HelpCircle, Loader2 } from 'lucide-react';
import { API_BASE } from '../config';


export default function Settings() {
  const [settings, setSettings] = useState({
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_whatsapp_from: 'whatsapp:+14155238886',
    user_whatsapp_number: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setTestNumber(data.user_whatsapp_number || '');
      } else {
        showFeedback('error', 'Failed to fetch settings from server.');
      }
    } catch (error) {
      showFeedback('error', 'Connection error while fetching settings.');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage(null);
    }, 6000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        showFeedback('success', 'Settings saved successfully!');
      } else {
        showFeedback('error', 'Failed to save settings.');
      }
    } catch (error) {
      showFeedback('error', 'Connection error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testNumber) {
      showFeedback('error', 'Please provide a destination WhatsApp number.');
      return;
    }
    setTestingWhatsapp(true);
    try {
      const res = await fetch(`${API_BASE}/test-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone_number: testNumber })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', 'Test WhatsApp message sent successfully!');
      } else {
        showFeedback('error', data.error || 'Failed to send test WhatsApp message. Check details.');
      }
    } catch (error) {
      showFeedback('error', 'Error connecting to the test endpoint.');
    } finally {
      setTestingWhatsapp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Profile & Integration Settings</h2>
        <p className="text-sm text-slate-400 mt-1">Configure your WhatsApp details and Twilio API keys below.</p>
      </div>

      {/* Alert Feedbacks */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-200 border-b border-darkBorder pb-3 flex items-center gap-2">
            Twilio API Configurations
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="twilio_account_sid" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Twilio Account SID
              </label>
              <input
                id="twilio_account_sid"
                type="text"
                name="twilio_account_sid"
                value={settings.twilio_account_sid}
                onChange={handleInputChange}
                placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="twilio_auth_token" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Twilio Auth Token
              </label>
              <input
                id="twilio_auth_token"
                type="password"
                name="twilio_auth_token"
                value={settings.twilio_auth_token}
                onChange={handleInputChange}
                placeholder="••••••••••••••••••••••••••••••••"
                className="w-full bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="twilio_whatsapp_from" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Twilio WhatsApp Sender Number
              </label>
              <input
                id="twilio_whatsapp_from"
                type="text"
                name="twilio_whatsapp_from"
                value={settings.twilio_whatsapp_from}
                onChange={handleInputChange}
                placeholder="whatsapp:+14155238886"
                className="w-full bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-500">Must include the 'whatsapp:' prefix.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="user_whatsapp_number" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Your WhatsApp Number
              </label>
              <input
                id="user_whatsapp_number"
                type="text"
                name="user_whatsapp_number"
                value={settings.user_whatsapp_number}
                onChange={handleInputChange}
                placeholder="+1234567890"
                className="w-full bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-500">Include country code (e.g., +1 for US, +91 for India).</p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl px-6 py-3 transition-glow disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Configuration
            </button>
          </div>
        </form>

        {/* Twilio Sandbox Setup Guideline */}
        <div className="bg-[#1b1536] border border-violet-500/20 rounded-xl p-4 flex gap-3">
          <HelpCircle className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5 text-slate-300">
            <p className="font-semibold text-slate-200">Twilio WhatsApp Sandbox Opt-In Required</p>
            <p>To receive WhatsApp notifications during development, you must opt-in to the Twilio Sandbox channel:</p>
            <ol className="list-decimal pl-4 space-y-1 text-slate-400">
              <li>Open WhatsApp and send the join code (e.g. <code className="text-violet-300 bg-violet-950/40 px-1 py-0.5 rounded">join [sandbox-code]</code>) to the Twilio number <code className="text-violet-300 bg-violet-950/40 px-1 py-0.5 rounded">+1 415 523 8886</code>.</li>
              <li>You will receive a confirmation message. Once complete, you are ready to get automatic alerts!</li>
            </ol>
          </div>
        </div>

        {/* Test Section */}
        <div className="border-t border-darkBorder pt-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Test Integration
          </h3>
          <p className="text-xs text-slate-400">
            Send an instant test message to check if settings and sandbox connections are working.
          </p>

          <div className="flex gap-4 max-w-md">
            <input
              type="text"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="whatsapp:+1234567890"
              className="flex-grow bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition-all"
            />
            <button
              onClick={handleSendTestMessage}
              disabled={testingWhatsapp}
              className="flex items-center gap-2 bg-[#29234d] hover:bg-[#342c61] border border-[#3e3475] text-slate-200 font-medium text-sm rounded-xl px-5 py-2.5 transition-all disabled:opacity-50"
            >
              {testingWhatsapp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
