import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, 
  deleteDoc, onSnapshot
} from 'firebase/firestore';
import { 
  Plus, Trash2, Wallet, Target, Calendar, 
  Truck, Settings, Edit2, Check, Hash, 
  X, Save, ChevronRight, Cloud, BarChart3, CreditCard,
  ChevronLeft, Activity, Download, Zap, MapPin, Info, Wand2, TrendingUp, Sparkles, Sun, Moon, AlertCircle, Wrench
} from 'lucide-react';

// Konfigurasi Firebase
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyAfmhXFTbr0xs8Mujkrsw_5JHTZozmRohU",
      authDomain: "lalamove-elite.firebaseapp.com",
      projectId: "lalamove-elite",
      storageBucket: "lalamove-elite.firebasestorage.app",
      messagingSenderId: "365572224560",
      appId: "1:365572224560:web:849c2760beed4008281ff5"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'lalamove-elite-v6';
const appId = rawAppId.replace(/\//g, '_'); 

const App = () => {
  const [user, setUser] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [activeTab, setActiveTab] = useState('dompet'); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  const [target, setTarget] = useState(1000); 
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(1000);
  
  const [jobTarget, setJobTarget] = useState(100);
  const [isEditingJobTarget, setIsEditingJobTarget] = useState(false);
  const [tempJobTarget, setTempJobTarget] = useState(100);

  // State untuk Peringatan Servis
  const [lastServiceMileage, setLastServiceMileage] = useState(Number(localStorage.getItem('last_service_km')) || 0);

  const [amount, setAmount] = useState('');
  const [jobsInput, setJobsInput] = useState('');
  const [spendingInput, setSpendingInput] = useState('');
  const [mileageInput, setMileageInput] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [viewDate, setViewDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const WORKING_DAYS = 22; 
  const dailyBase = target / WORKING_DAYS;
  const dailyGoalWithMaint = dailyBase + 10;
  const todayStr = new Date().toLocaleDateString('en-CA');

  const calculateEstimatedKm = (netTotal) => {
    const net = parseFloat(netTotal);
    const jobs = parseInt(jobsInput) || 1;
    if (isNaN(net) || net <= 0) return 0;
    const grossTotal = net / 0.784; 
    const grossPerJob = grossTotal / jobs;
    let kmPerJob = grossPerJob <= 5 ? 5 : 5 + (grossPerJob - 5) / 0.50;
    return (kmPerJob * jobs).toFixed(1);
  };

  const estimatedKmValue = useMemo(() => calculateEstimatedKm(amount), [amount, jobsInput]);

  useEffect(() => {
    let timeoutId = setTimeout(() => {
      if (loading) setAuthError("Sambungan perlahan. Sila segar semula (Refresh).");
    }, 10000);

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { 
        console.error("Auth error:", error); 
        setAuthError("Gagal menyambung ke pelayan.");
        setLoading(false);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      clearTimeout(timeoutId);
      setUser(u);
      if (!u) {
        setLoading(false);
        setAuthError("Sesi pengesahan tamat.");
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'earnings');
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEarnings(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setLoading(false);
        setAuthError(null);
      }, (error) => { 
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const stats = useMemo(() => {
    const selectedMonth = viewDate.getMonth();
    const selectedYear = viewDate.getFullYear();

    const fullDailyMap = earnings.reduce((acc, curr) => {
      if (!acc[curr.date]) acc[curr.date] = { net: 0, jobs: 0, spending: 0, mileage: 0 };
      acc[curr.date].net += (Number(curr.net) || 0);
      acc[curr.date].jobs += (Number(curr.jobs) || 0);
      acc[curr.date].spending += (Number(curr.spending) || 0);
      acc[curr.date].mileage += (Number(curr.mileage) || 0);
      return acc;
    }, {});

    const monthlyEntries = earnings.filter(item => {
      const d = new Date(item.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    let profit = 0, maintenance = 0, jobsTotal = 0, spendingTotal = 0, mileageTotal = 0;
    const monthlyDailyMap = {};

    monthlyEntries.forEach(curr => {
        if (!monthlyDailyMap[curr.date]) monthlyDailyMap[curr.date] = { net: 0, spending: 0, jobs: 0, mileage: 0 };
        monthlyDailyMap[curr.date].net += (Number(curr.net) || 0);
        monthlyDailyMap[curr.date].spending += (Number(curr.spending) || 0);
        monthlyDailyMap[curr.date].jobs += (Number(curr.jobs) || 0);
        monthlyDailyMap[curr.date].mileage += (Number(curr.mileage) || 0);
        
        jobsTotal += (Number(curr.jobs) || 0);
        spendingTotal += (Number(curr.spending) || 0);
        mileageTotal += (Number(curr.mileage) || 0);
    });

    Object.values(monthlyDailyMap).forEach(day => {
        const dayMaint = day.net > 0 ? 10 : 0;
        profit += (day.net - dayMaint - day.spending);
        maintenance += dayMaint;
    });

    const chartData = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const ds = d.toLocaleDateString('en-CA');
      return {
        label: d.toLocaleDateString('ms-MY', { weekday: 'short' }),
        value: fullDailyMap[ds]?.net || 0,
      };
    });

    // Kira Total Jarak Keseluruhan (Lifetime) untuk servis
    const lifetimeMileage = earnings.reduce((sum, entry) => sum + (Number(entry.mileage) || 0), 0);
    const mileageSinceLastService = lifetimeMileage - lastServiceMileage;

    return { 
      filtered: monthlyEntries, profit, maintenance, jobs: jobsTotal, spending: spendingTotal, mileage: mileageTotal,
      chart: chartData,
      todayNet: fullDailyMap[todayStr]?.net || 0,
      todayMaint: (fullDailyMap[todayStr]?.net || 0) > 0 ? 10 : 0,
      costPerKm: mileageTotal > 0 ? (spendingTotal / mileageTotal) : 0,
      todayMileage: fullDailyMap[todayStr]?.mileage || 0,
      lifetimeMileage,
      mileageSinceLastService
    };
  }, [earnings, viewDate, todayStr, dailyGoalWithMaint, lastServiceMileage]);

  const progressPercent = Math.min((stats.profit / target) * 100, 100);

  const resetService = () => {
    if (confirm("Adakah anda sudah menukar minyak hitam? Meter servis akan diset semula.")) {
      const currentKm = stats.lifetimeMileage;
      localStorage.setItem('last_service_km', currentKm.toString());
      setLastServiceMileage(currentKm);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !user) return;
    const payload = {
      net: parseFloat(amount),
      jobs: parseInt(jobsInput) || 0,
      spending: parseFloat(spendingInput) || 0,
      mileage: parseFloat(mileageInput) || 0,
      date: date,
      timestamp: Date.now()
    };
    try {
      const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'earnings');
      if (editingId) {
        await updateDoc(doc(colRef, editingId), payload);
        setEditingId(null);
      } else {
        await addDoc(colRef, payload);
      }
      resetForm();
    } catch (err) { console.error("Save error:", err); }
  };

  const resetForm = () => {
    setAmount(''); setJobsInput(''); setSpendingInput(''); setMileageInput('');
    setDate(new Date().toLocaleDateString('en-CA'));
    setShowForm(false); setEditingId(null);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(val || 0);

  if (loading || authError) return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gray-50 text-slate-900'} flex flex-col items-center justify-center p-8 text-center font-['Poppins']`}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
      {authError ? (
        <div className="animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6 border border-red-500/20">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-black mb-2 uppercase">Portal Tersekat</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">{authError}</p>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-900/20 active:scale-95 transition-all text-xs uppercase tracking-widest">Cuba Semula</button>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 border-4 border-orange-500/10 border-t-orange-500 rounded-full animate-spin mb-4"></div>
          <p className="text-orange-500 font-bold uppercase tracking-[0.3em] animate-pulse text-[10px]">Lala Tracker Connecting...</p>
        </>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 font-['Poppins'] pb-32 ${isDarkMode ? 'bg-[#020617] text-slate-200' : 'bg-gray-50 text-slate-900'}`}>
      
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet" />

      {/* Header Sleek */}
      <header className={`pt-6 pb-14 px-6 rounded-b-[3.5rem] shadow-2xl relative overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-gradient-to-br from-orange-600 via-orange-700 to-red-800 text-white' : 'bg-gradient-to-br from-orange-500 to-orange-400 text-white'}`}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-32 -mt-32 blur-[80px]"></div>
        <div className="max-w-md mx-auto relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/20">
                <Truck className="w-5 h-5" />
              </div>
              <div className="text-left leading-none">
                <h1 className="text-sm font-black tracking-tight italic uppercase">Lala Tracker</h1>
                <span className="text-[7px] font-bold opacity-70 uppercase tracking-widest leading-none">Wan SK Edition</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-black/20 rounded-xl border border-white/10 backdrop-blur-md transition-all active:scale-90">
                 {isDarkMode ? <Sun className="w-4 h-4 text-orange-200" /> : <Moon className="w-4 h-4 text-white" />}
               </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-8 bg-black/20 rounded-2xl p-1.5 border border-white/10 backdrop-blur-xl">
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-2 hover:bg-white/10 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
            <p className="text-[10px] font-bold uppercase tracking-widest">{viewDate.toLocaleString('ms-MY', { month: 'long', year: 'numeric' })}</p>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-2 hover:bg-white/10 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
          </div>

          <div className="text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2 opacity-60">GAJI BERSIH</p>
            <h2 className="text-6xl font-black mb-4 drop-shadow-2xl tracking-tighter text-center flex items-center justify-center">
              <span className="text-xl font-light opacity-40 mr-3 mt-1">RM</span>
              <span>{stats.profit.toFixed(0)}</span>
            </h2>
            <div className="flex justify-center gap-2">
                <div className="bg-black/20 px-3 py-1.5 rounded-xl text-[9px] font-bold border border-white/5 backdrop-blur-md flex items-center gap-1.5 uppercase tracking-wider">
                    <Activity className="w-3 h-3 text-orange-400" /> {stats.jobs} Job
                </div>
                <div className="bg-black/20 px-3 py-1.5 rounded-xl text-[9px] font-bold border border-white/5 backdrop-blur-md flex items-center gap-1.5 uppercase tracking-wider">
                    <MapPin className="w-3 h-3 text-orange-400" /> {stats.mileage.toFixed(0)} KM
                </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-8 relative z-20">
        
        {/* VIEW: TAB DOMPET */}
        {activeTab === 'dompet' && (
          <div className="animate-in fade-in duration-300">
            {!showForm ? (
              <button onClick={() => setShowForm(true)} className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-2xl font-black shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 mb-6 border-t border-white/10">
                <div className="bg-white/20 p-1.5 rounded-xl"><Plus className="w-4 h-4" /></div>
                <span className="uppercase tracking-[0.2em] text-xs">Log Gaji Harian</span>
              </button>
            ) : (
              <div className={`p-5 rounded-[2.5rem] shadow-2xl mb-6 border transition-colors ${isDarkMode ? 'bg-slate-900 border-orange-500/30' : 'bg-white border-orange-100'}`}>
                <div className="flex justify-between items-center mb-5">
                  <h3 className={`font-black flex items-center gap-2 uppercase text-[10px] tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Borang Log</h3>
                  <button onClick={resetForm} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-slate-500'}`}><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="text-center">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Net Wallet (Apps)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-500 text-lg italic">RM</span>
                      <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-full pl-14 p-4 rounded-2xl text-2xl font-black text-center focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-inner ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-gray-50 border-gray-200'}`} autoFocus />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Minyak & Belanja (RM)</label>
                      <input type="number" step="0.01" value={spendingInput} onChange={(e) => setSpendingInput(e.target.value)} className="w-full bg-transparent font-black text-xl text-orange-500 outline-none text-center" />
                    </div>
                    <div className={`p-3 rounded-2xl border relative text-center ${isDarkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Jarak (KM)</label>
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.1" value={mileageInput} onChange={(e) => setMileageInput(e.target.value)} className="w-full bg-transparent font-black text-xl text-blue-500 outline-none text-center" />
                        {parseFloat(estimatedKmValue) > 0 && <button type="button" onClick={() => setMileageInput(estimatedKmValue)} className="p-1.5 bg-blue-600 rounded-lg text-white shadow-lg"><Zap className="w-3 h-3" /></button>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Jumlah Trip</label>
                      <input type="number" value={jobsInput} onChange={(e) => setJobsInput(e.target.value)} className={`w-full bg-transparent font-black text-xl outline-none text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
                    </div>
                    <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Tarikh</label>
                      <input type="date" value={date} onChange={(v) => setDate(v.target.value)} className={`w-full bg-transparent font-bold text-xs outline-none text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Sahkan Rekod</button>
                </form>
              </div>
            )}

            <section className="space-y-2.5 pb-10">
              <h3 className={`font-black text-[9px] uppercase tracking-widest flex items-center gap-2 px-4 mb-4 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                <Calendar className="w-4 h-4 text-white" /> Jurnal Harian
              </h3>
              {stats.filtered.length === 0 ? (
                <div className={`p-12 rounded-[2.5rem] border-2 border-dashed text-center opacity-30 mx-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">Tiada rekod disimpan.</p>
                </div>
              ) : (
                stats.filtered.map((item) => (
                  <div key={item.id} className={`p-4 rounded-3xl border flex justify-between items-center mb-3 mx-1 shadow-lg transition-all group ${isDarkMode ? 'bg-slate-900/60 border-slate-800 hover:border-orange-500/30' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all ${item.date === todayStr ? 'bg-orange-600' : 'bg-slate-800'}`}><Activity className="w-5 h-5" /></div>
                      <div className="text-left leading-tight">
                        <p className={`font-black text-xl tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>RM{Number(item.net).toFixed(2)}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{new Date(item.date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })} • {item.jobs} Job</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(item.id); setAmount(String(item.net)); setJobsInput(String(item.jobs)); setSpendingInput(String(item.spending)); setMileageInput(item.mileage || ''); setDate(item.date); setShowForm(true); }} className="p-2 text-slate-400 hover:text-orange-500"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={async () => { if(confirm('Padam?')) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'earnings', item.id)) }} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        )}

        {/* TAB 2: STATS */}
        {activeTab === 'stats' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            {/* Candlestick Style Chart */}
            <section className={`p-6 rounded-[3rem] mb-6 shadow-2xl relative overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900/90 border border-slate-800' : 'bg-white border border-gray-100'}`}>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <BarChart3 className="w-4 h-4 text-orange-500" /> Prestasi 7 Hari
                        </h3>
                    </div>
                    <div className="text-right">
                        <p className="text-[7px] text-orange-500 font-bold uppercase tracking-widest">Goal</p>
                        <p className={`text-[9px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(dailyGoalWithMaint)}</p>
                    </div>
                </div>
                
                <div className="relative h-48 flex items-end justify-between gap-3 px-1 pt-12">
                    <div className="absolute left-0 right-0 border-t border-dashed border-orange-500/20 z-0" 
                         style={{ bottom: `${(dailyGoalWithMaint / Math.max(...stats.chart.map(d => d.value), dailyGoalWithMaint * 1.3)) * 100}%` }}>
                    </div>

                    {stats.chart.map((day, idx) => {
                        const maxH = Math.max(...stats.chart.map(d => d.value), dailyGoalWithMaint * 1.3);
                        const height = (day.value / maxH) * 100;
                        const isHit = day.value >= dailyGoalWithMaint;

                        return (
                            <div key={idx} className="flex-1 flex flex-col items-center group relative z-10">
                                <div className="relative w-full flex items-end justify-center h-full">
                                    {day.value > 0 && <div className={`absolute bottom-0 w-[1px] h-full ${isHit ? 'bg-orange-500/30' : 'bg-slate-500/20'}`}></div>}
                                    <div 
                                        style={{ height: `${Math.max(height, 5)}%` }} 
                                        className={`w-full max-w-[14px] rounded-lg transition-all duration-1000 ${
                                          day.value > 0 
                                            ? isHit 
                                              ? 'bg-gradient-to-t from-orange-600 via-orange-400 to-yellow-300 shadow-[0_0_15px_rgba(249,115,22,0.6)]' 
                                              : isDarkMode ? 'bg-slate-700' : 'bg-gray-300'
                                            : isDarkMode ? 'bg-slate-800 opacity-20' : 'bg-gray-200'
                                        }`}
                                    ></div>
                                    {day.value > 0 && (
                                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-white text-slate-900 text-[8px] font-black px-1.5 py-1 rounded shadow-2xl transition-all whitespace-nowrap z-50">
                                          {formatCurrency(day.value)}
                                      </div>
                                    )}
                                </div>
                                <span className={`text-[7px] font-black mt-4 uppercase ${isHit ? 'text-orange-500' : 'text-slate-500'}`}>{day.label}</span>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Intelek Operasi & Peringatan Servis */}
            <section className={`p-7 rounded-[3rem] border shadow-xl transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-slate-900'}`}>
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 justify-center"><Activity className="w-4 h-4 text-emerald-500" /> Intelek Operasi</h3>
              
              {/* Peringatan Servis (Sasaran 2500KM) */}
              <div className={`p-4 rounded-3xl mb-6 border-2 border-dashed flex flex-col items-center justify-center transition-all ${stats.mileageSinceLastService >= 2500 ? 'bg-red-500/10 border-red-500 animate-pulse' : 'bg-black/5 border-white/5'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className={`w-4 h-4 ${stats.mileageSinceLastService >= 2500 ? 'text-red-500' : 'text-orange-500'}`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${stats.mileageSinceLastService >= 2500 ? 'text-red-500' : 'text-slate-400'}`}>Peringatan Servis</span>
                </div>
                <div className="text-center mb-3">
                  <p className="text-2xl font-black">{stats.mileageSinceLastService.toFixed(0)} <span className="text-[10px] opacity-40">KM</span></p>
                  <p className={`text-[7px] font-bold uppercase mt-1 ${stats.mileageSinceLastService >= 2500 ? 'text-red-400' : 'text-slate-500'}`}>
                    {stats.mileageSinceLastService >= 2500 ? "Standby Modal! Dah Cecah Buffer." : `Lagi ${(2500 - stats.mileageSinceLastService).toFixed(0)} KM Tinggal Sebelum Servis Seterusnya`}
                  </p>
                </div>
                <button onClick={resetService} className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${stats.mileageSinceLastService >= 2500 ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  Reset Servis
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                <div className={`p-4 rounded-3xl border flex flex-col items-center justify-center ${isDarkMode ? 'bg-orange-500/5 border-orange-500/10' : 'bg-orange-50 border-orange-100'}`}>
                  <p className="text-[8px] font-black text-orange-500 uppercase mb-1">Simpanan</p>
                  <p className="text-xl font-black tracking-tight flex items-center gap-1"><span className="text-[10px] opacity-40 mt-1">RM</span>{(stats.todayNet - stats.todayMaint).toFixed(0)}</p>
                  <p className="text-[7px] text-slate-500 font-bold uppercase mt-1">Sedia Masuk Bank</p>
                </div>
                <div className={`p-4 rounded-3xl border flex flex-col items-center justify-center ${isDarkMode ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'}`}>
                  <p className="text-[8px] font-black text-blue-500 uppercase mb-1">Kos Per KM</p>
                  <p className="text-xl font-black tracking-tight flex items-center gap-1"><span className="text-[10px] opacity-40 mt-1">RM</span>{stats.costPerKm.toFixed(2)}</p>
                  <p className="text-[7px] text-slate-500 font-bold uppercase mt-1">Gaji Bersih / KM</p>
                </div>
              </div>
              
              <div className={`p-5 rounded-3xl border text-center mb-6 ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className="text-[8px] font-black text-emerald-500 uppercase mb-1">Tabung Maintenance Hari Ini</p>
                <p className="text-3xl font-black tracking-tighter flex items-center justify-center gap-1"><span className="text-sm opacity-40 mt-1">RM</span>{stats.todayMaint.toFixed(2)}</p>
                <p className="text-[7px] text-slate-500 font-bold uppercase mt-2">Deduction: Fixed RM10.00</p>
              </div>

              <div className={`pt-6 border-t grid grid-cols-2 gap-4 text-center ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                  <div>
                      <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Total Jarak (Bulan)</span>
                      <span className="text-sm font-black">{stats.mileage.toFixed(1)} KM</span>
                  </div>
                  <div>
                      <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Total Tabung</span>
                      <span className="text-sm font-black text-emerald-500">{formatCurrency(stats.maintenance)}</span>
                  </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: MISI */}
        {activeTab === 'misi' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
             <section className={`p-7 rounded-[3rem] mb-6 shadow-xl relative overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-gray-100'}`}>
                <div className="flex justify-between items-end mb-6 relative z-10 text-left">
                    <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Sasaran Gaji Bulanan</p>
                        {isEditingTarget ? (
                            <div className="flex items-center gap-2 p-1 rounded-xl border border-orange-500/50">
                                <input type="number" value={tempTarget} onChange={(e) => setTempTarget(e.target.value)} className={`bg-transparent text-xl font-black w-24 outline-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`} autoFocus />
                                <button onClick={() => { setTarget(parseFloat(tempTarget)); setIsEditingTarget(false); }} className="p-1.5 bg-orange-600 rounded-lg text-white"><Check className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <h3 onClick={() => setIsEditingTarget(true)} className={`text-3xl font-black flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(target)}<Edit2 className="w-4 h-4 text-orange-500/50" /></h3>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-orange-500 font-black text-4xl italic leading-none">{progressPercent.toFixed(0)}%</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase">Selesai</p>
                    </div>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner mb-6">
                    <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000 shadow-[0_0_15px_rgba(249,115,22,0.4)]" style={{ width: `${progressPercent}%` }} />
                </div>
                
                <div className={`p-5 rounded-[2rem] border text-center ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 text-center">Misi Harian (Gaji + Maintenance)</p>
                    <p className={`text-2xl font-black text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(dailyGoalWithMaint)} <span className="text-[10px] opacity-40 uppercase">/ Hari</span></p>
                </div>
            </section>

            <section className={`p-7 rounded-[3rem] shadow-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100 text-slate-900'}`}>
                <div className="flex justify-between items-center mb-6">
                    <div className="text-left">
                        <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" /> Milestone Job</h4>
                        <p className="text-[7px] text-slate-600 font-bold uppercase mt-1 tracking-widest">Lengkapkan misi penghantaran</p>
                    </div>
                    {isEditingJobTarget ? (
                      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/20">
                        <input type="number" value={tempJobTarget} onChange={(e) => setTempJobTarget(e.target.value)} className="bg-transparent text-white text-xs font-black w-10 text-center outline-none" />
                        <button onClick={() => { setJobTarget(parseInt(tempJobTarget)); setIsEditingJobTarget(false); }} className="p-1 bg-green-500 rounded-md text-white"><Check className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setIsEditingJobTarget(true)} className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20 flex items-center gap-1.5 transition-all">
                        {stats.jobs} / {jobTarget} <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-slate-500 transition-all duration-1000" style={{ width: `${Math.min((stats.jobs/jobTarget)*100, 100)}%` }}></div>
                </div>
            </section>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <footer className={`fixed bottom-0 left-0 right-0 p-5 pb-9 border-t backdrop-blur-2xl flex justify-around items-center z-50 transition-all ${isDarkMode ? 'bg-slate-950/90 border-slate-800/50' : 'bg-white/95 border-gray-200'}`}>
            <button onClick={() => setActiveTab('dompet')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'dompet' ? 'text-orange-600 scale-110' : 'text-slate-500'}`}>
                <Wallet className={`w-6 h-6 ${activeTab === 'dompet' ? 'drop-shadow-lg' : 'opacity-50'}`} /><span className="text-[8px] font-black uppercase tracking-widest">Dompet</span>
            </button>
            <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'stats' ? 'text-orange-600 scale-110' : 'text-slate-500'}`}>
                <Activity className={`w-6 h-6 ${activeTab === 'stats' ? 'drop-shadow-lg' : 'opacity-50'}`} /><span className="text-[8px] font-black uppercase tracking-widest">Stats</span>
            </button>
            <button onClick={() => setActiveTab('misi')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'misi' ? 'text-orange-600 scale-110' : 'text-slate-500'}`}>
                <Target className={`w-6 h-6 ${activeTab === 'misi' ? 'drop-shadow-lg' : 'opacity-50'}`} /><span className="text-[8px] font-black uppercase tracking-widest">Misi</span>
            </button>
      </footer>
    </div>
  );
};

export default App;
