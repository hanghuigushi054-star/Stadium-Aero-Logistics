import React, { useState, useEffect } from 'react';
import { AlertTriangle, Gauge, RefreshCcw, Activity, Sun, Moon, Target, Wind, Thermometer, Droplets, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 太陽の位置（日差し）のシミュレーション
const getSunlightData = () => {
  const date = new Date();
  const hour = date.getHours();
  // 簡単なモデル: 6時〜18時を昼とする
  const isDay = hour >= 6 && hour < 18;
  // 6時=東(90度), 12時=南(180度), 18時=西(270度)
  const azimuth = isDay ? 90 + ((hour - 6) / 12) * 180 : 0;
  
  // UI用の方角ラベル
  let directionStr = 'N/A';
  if (isDay) {
    if (azimuth < 135) directionStr = '東(朝日)';
    else if (azimuth < 225) directionStr = '南(昼)';
    else directionStr = '西(西日)';
  }

  return { azimuth, isDay, hour, directionStr };
};

// 打球への影響アナライザー（風向きと風速から算出）
// ホームベースを下、センターを上(北:0度)と仮定
const getGameImpact = (windDir: number, windSpeed: number, isDome?: boolean) => {
  if (isDome) return { text: '空調管理下。風による打球への影響はありません。', level: 'none' };
  if (windSpeed < 3.0) return { text: '風は穏やかです。打球への影響は軽微です。', level: 'low' };

  let impact = '';
  // 0度は北（センター方向）、90度は東（ライト方向）、180度は南（バックネット方向）、270度は西（レフト方向）
  if (windDir > 315 || windDir <= 45) {
    impact = '【ホーム風】外野への打球が伸びやすく、ホームランが出やすい状況です。';
  } else if (windDir > 45 && windDir <= 135) {
    impact = '【ライトからレフトの風】ライト方向への打球が押し戻され、レフト方向が伸びます。';
  } else if (windDir > 135 && windDir <= 225) {
    impact = '【アゲインスト】外野フライが押し戻され失速しやすい状況です。外野手は前進守備が有効です。';
  } else if (windDir > 225 && windDir <= 315) {
    impact = '【レフトからライトの風】レフト方向への打球が押し戻され、ライト方向が伸びます。';
  }

  if (windSpeed >= 8.0) {
    impact = '強風のため、変化球の曲がり幅やフライの落下点に大きな狂いが生じます。' + impact;
    return { text: impact, level: 'high' };
  }

  return { text: impact, level: 'medium' };
};

const STADIUMS = [
  { id: 'marine', name: 'ZOZOマリンスタジアム', station: '海浜幕張駅', windFactor: 1.2, hasSeaBreeze: true, homeTeam: 'ロッテ', awayTeam: 'オリックス', mock: { temp: 18.5, windSpeed: 9.2, windDirection: 210, pressure: 1011 } },
  { id: 'koshien', name: '阪神甲子園球場', station: '甲子園駅', windFactor: 0.9, hasSeaBreeze: true, homeTeam: '阪神', awayTeam: '巨人', mock: { temp: 20.1, windSpeed: 5.5, windDirection: 180, pressure: 1013 } },
  { id: 'jingu', name: '明治神宮野球場', station: '外苑前/信濃町/国立競技場駅', windFactor: 0.7, hasSeaBreeze: false, homeTeam: 'ヤクルト', awayTeam: '中日', mock: { temp: 19.8, windSpeed: 3.2, windDirection: 135, pressure: 1010 } },
  { id: 'yokohama', name: '横浜スタジアム', station: '関内駅', windFactor: 0.8, hasSeaBreeze: true, homeTeam: 'DeNA', awayTeam: '広島', mock: { temp: 19.0, windSpeed: 4.8, windDirection: 160, pressure: 1014 } },
  { id: 'escon', name: 'エスコンフィールドHOKKAIDO', station: '北広島駅', windFactor: 0.1, hasSeaBreeze: false, isDome: true, homeTeam: '日本ハム', awayTeam: '西武', mock: { temp: 22.0, windSpeed: 0.5, windDirection: 0, pressure: 1016 } },
  { id: 'rakuten', name: '楽天モバイルパーク', station: '宮城野原駅', windFactor: 0.8, hasSeaBreeze: false, homeTeam: '楽天', awayTeam: 'ソフトバンク', mock: { temp: 16.5, windSpeed: 6.8, windDirection: 90, pressure: 1009 } }
];

const RadarScan = ({ isHighWind }: { isHighWind: boolean }) => {
  const colorBase = isHighWind ? '244, 63, 94' : '6, 182, 212';
  return (
    <motion.div 
      className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-10 mix-blend-screen"
    >
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: isHighWind ? 1.5 : 3.5, ease: "linear" }}
        className="w-full h-full"
        style={{
          background: `conic-gradient(from 0deg, transparent 75%, rgba(${colorBase}, 0.15) 95%, rgba(${colorBase}, 0.9) 100%)`,
          borderRadius: '50%'
        }}
      />
    </motion.div>
  );
};

const App = () => {
  const [selectedStadiumId, setSelectedStadiumId] = useState('marine');
  const stadium = STADIUMS.find(s => s.id === selectedStadiumId) || STADIUMS[0];

  const [weather, setWeather] = useState({
    temp: stadium.mock.temp,
    windSpeed: stadium.mock.windSpeed,
    windDirection: stadium.mock.windDirection,
    humidity: 65,
    pressure: stadium.mock.pressure,
    sunlight: getSunlightData(),
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // 随時更新用の手動＆自動リフレッシュ処理
  const handleRefresh = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    // APIフェッチをシミュレート (600ms~1200msの遅延をランダムで設ける)
    const delay = 600 + Math.random() * 600;
    await new Promise(resolve => setTimeout(resolve, delay));

    setWeather({
      temp: parseFloat((stadium.mock.temp + (Math.random() * 2 - 1)).toFixed(1)),
      windSpeed: Math.max(0, parseFloat((stadium.mock.windSpeed + (Math.random() * 3 - 1.5)).toFixed(1))),
      windDirection: (stadium.mock.windDirection + (Math.random() * 20 - 10) + 360) % 360,
      humidity: 60 + Math.floor(Math.random() * 15),
      pressure: parseFloat((stadium.mock.pressure + (Math.random() * 4 - 2)).toFixed(1)),
      sunlight: getSunlightData(),
    });
    
    setLastUpdated(new Date());
    setIsSyncing(false);
  };

  // 球場変更時に状態をリロード
  useEffect(() => {
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStadiumId]);

  // 定期的な風向・風速の揺らぎ（ドーム以外）＆ バックグラウンド更新（30秒毎）
  useEffect(() => {
    // 短い間隔での細かいビジュアル揺らぎ（データ同期とは別）
    const flutterInterval = setInterval(() => {
      setWeather(prev => {
        if (stadium.isDome || isSyncing) return prev;
        return {
          ...prev,
          windSpeed: Math.max(0, parseFloat((prev.windSpeed + (Math.random() - 0.5) * 1.5).toFixed(1))),
          windDirection: (prev.windDirection + (Math.random() - 0.5) * 4 + 360) % 360,
          pressure: parseFloat((prev.pressure + (Math.random() - 0.5) * 0.2).toFixed(1)),
        };
      });
    }, 4000);

    // 30秒に1回、自動的に"API"バックグラウンド同期を行う
    const syncInterval = setInterval(() => {
      handleRefresh();
    }, 30000);

    return () => {
      clearInterval(flutterInterval);
      clearInterval(syncInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stadium.id, stadium.isDome, isSyncing]);
  
  // 体感温度の簡易計算（風冷却）
  const feelsLikeTemp = parseFloat((weather.temp - Math.max(0, weather.windSpeed * 0.7)).toFixed(1));
  
  const getWindDirectionJP = (deg: number) => {
    if (deg > 337.5 || deg <= 22.5) return '北';
    if (deg > 22.5 && deg <= 67.5) return '北東';
    if (deg > 67.5 && deg <= 112.5) return '東';
    if (deg > 112.5 && deg <= 157.5) return '南東';
    if (deg > 157.5 && deg <= 202.5) return '南';
    if (deg > 202.5 && deg <= 247.5) return '南西';
    if (deg > 247.5 && deg <= 292.5) return '西';
    if (deg > 292.5 && deg <= 337.5) return '北西';
    return '北西';
  };

  // 警告ロジック
  const getAlert = () => {
    if (weather.windSpeed >= 10) {
      return { type: 'danger', message: '暴風警報発令中：飛来物に警戒し、避難ルートを確認してください。' };
    }
    if (weather.windSpeed >= 8) {
      return { type: 'warning', message: '強風注意：ビールの空きカップやチケットの飛散等に注意してください。' };
    }
    if (feelsLikeTemp < 10) {
      return { type: 'warning', message: '低温注意：風による体感温度の低下に警戒し、防寒対策を行ってください。' };
    }
    return null;
  };
  const alert = getAlert();
  
  const isHighWind = weather.windSpeed >= 8;
  const themeColor = isHighWind ? 'text-rose-500' : 'text-cyan-400';
  const themeBorder = isHighWind ? 'border-rose-500/30' : 'border-cyan-500/30';
  const themeGlow = isHighWind ? 'shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'shadow-[0_0_20px_rgba(34,211,238,0.3)]';

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const gameImpact = getGameImpact(weather.windDirection, weather.windSpeed, stadium.isDome);

  return (
    <div className="min-h-screen bg-[#060608] text-slate-200 font-sans p-4 md:p-6 lg:p-8 overflow-x-hidden selection:bg-cyan-500/30 flex flex-col">
      
      {/* Background Ambient Glow & Grid Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className={cn("absolute top-[-10%] -left-[10%] w-[50vw] h-[50vw] rounded-full blur-[150px] opacity-[0.12] transition-colors duration-1000", isHighWind ? "bg-rose-600" : "bg-cyan-600")} />
        <div className="absolute top-[40%] -right-[15%] w-[40vw] h-[40vw] rounded-full bg-blue-700 blur-[150px] opacity-10" />
      </div>

      <motion.div 
        className="max-w-[1400px] w-full mx-auto relative z-10 flex flex-col h-full flex-1"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Header / System Info */}
        <motion.header variants={itemVariants} className="flex-shrink-0 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Activity className={cn("w-6 h-6", themeColor)} />
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white uppercase">
                STADIUM WEATHER<span className="text-zinc-500 ml-2 font-medium">RADAR</span>
              </h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative group">
                <select 
                  value={selectedStadiumId}
                  onChange={(e) => setSelectedStadiumId(e.target.value)}
                  className={cn(
                    "appearance-none bg-[#0a0a0c]/80 backdrop-blur-md border text-sm font-semibold tracking-wider rounded-lg px-4 py-2.5 pr-10 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all cursor-pointer text-white",
                    themeBorder, themeGlow
                  )}
                  disabled={isSyncing}
                >
                  {STADIUMS.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.homeTeam})</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 min-h-full items-center pointer-events-none -translate-y-[10px] text-zinc-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right flex flex-col">
              <div className="flex items-center gap-2 mb-1 justify-end md:justify-start">
                <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mt-0.5">Last Updated</span>
                <AnimatePresence mode="wait">
                  {isSyncing ? (
                    <motion.span 
                      key="syncing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] text-cyan-400 font-mono flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" /> Syncing...
                    </motion.span>
                  ) : (
                    <motion.span 
                      key="ready"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] text-green-400 font-mono flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Live
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-sm font-mono text-zinc-300">
                {lastUpdated.toLocaleTimeString('ja-JP')}
              </p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isSyncing}
              className={cn(
                "p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
                isSyncing && "opacity-50 cursor-not-allowed"
              )}
              title="データを更新 (Reload Data)"
            >
              <RefreshCcw className={cn("w-4 h-4 text-zinc-300", isSyncing && "animate-spin text-cyan-400")} />
            </button>
          </div>
        </motion.header>

        {/* Survival Alert Banner */}
        <AnimatePresence>
          {alert && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className={cn(
                "border rounded-xl p-4 flex items-center space-x-4 backdrop-blur-md transition-colors duration-500 relative overflow-hidden",
                alert.type === 'danger'
                  ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                  : 'bg-amber-500/10 border-amber-500/30'
              )}>
                <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-50" />
                <div className={cn("p-2.5 rounded-lg shrink-0", alert.type === 'danger' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400')}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className={cn("text-sm font-bold tracking-wide", alert.type === 'danger' ? 'text-rose-400' : 'text-amber-400')}>
                    {alert.type === 'danger' ? 'SEVERE WARNING' : 'ADVISORY'}
                  </p>
                  <p className="text-sm mt-0.5 text-zinc-300">
                    {alert.message}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Dashboard (3-Column Layout: 3-6-3) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          
          {/* LEFT PANEL: Environment Data (3/12) */}
          <motion.section variants={itemVariants} className="col-span-1 lg:col-span-3 flex flex-col gap-6 order-2 lg:order-1 lg:max-w-sm">
            <div className="bg-[#0a0a0c]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex-1 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
              
              <h2 className="text-[11px] font-bold text-zinc-500 mb-6 lg:mb-8 tracking-[0.2em] flex items-center uppercase">
                <Thermometer className="mr-2 text-cyan-400 w-3.5 h-3.5" />
                Environment
              </h2>
              
              <div className="flex flex-col gap-6 lg:gap-8 flex-1 justify-between">
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] lg:text-xs text-zinc-500 font-medium uppercase tracking-wider">Air Temp</p>
                    <div className={cn("text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border", 
                      weather.temp < 10 ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' : 
                      weather.temp > 30 ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' : 
                      'text-green-400 border-green-400/30 bg-green-400/10')}>
                      {weather.temp < 10 ? 'COLD' : weather.temp > 30 ? 'HOT' : 'NOM.'}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <motion.div 
                      key={weather.temp}
                      initial={{ scale: 0.95, filter: "blur(4px)" }}
                      animate={{ scale: 1, filter: "blur(0px)" }}
                      className="text-4xl lg:text-5xl font-light font-mono text-white tracking-tight"
                    >
                      {weather.temp.toFixed(1)}
                    </motion.div>
                    <span className="text-xl text-zinc-500 font-light">°C</span>
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full" />

                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] lg:text-xs text-zinc-500 font-medium uppercase tracking-wider">Feels Like</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <motion.div 
                      key={feelsLikeTemp}
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 1 }}
                      className={cn("text-3xl lg:text-4xl font-light font-mono tracking-tight glow", 
                        feelsLikeTemp < 10 ? 'text-blue-400' : feelsLikeTemp > 30 ? 'text-amber-400' : 'text-white')}
                    >
                      {feelsLikeTemp.toFixed(1)}
                    </motion.div>
                    <span className="text-lg text-zinc-500 font-light">°C</span>
                  </div>
                </div>
                
                <div className="h-px bg-white/5 w-full" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider"><Droplets className="inline w-3 h-3 mr-1" /> RH</p>
                      <div className={cn("text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border", 
                        weather.humidity > 70 ? 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' : 
                        'text-zinc-400 border-zinc-400/30 bg-zinc-400/10')}>
                        {weather.humidity > 70 ? 'WET' : 'NOM.'}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <motion.div 
                        key={weather.humidity}
                        className="text-2xl font-light font-mono text-white tracking-tight"
                      >
                        {weather.humidity.toFixed(0)}
                      </motion.div>
                      <span className="text-xs text-zinc-500 font-light">%</span>
                    </div>
                  </div>

                  <div className="group border-l border-white/5 pl-4">
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider"><Gauge className="inline w-3 h-3 mr-1" /> hPa</p>
                      <div className={cn("text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border", 
                        weather.pressure < 1005 ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' : 
                        'text-zinc-400 border-zinc-400/30 bg-zinc-400/10')}>
                        {weather.pressure < 1005 ? 'LOW' : 'NOM.'}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <motion.div 
                        key={weather.pressure}
                        className="text-2xl font-light font-mono text-white tracking-tight"
                      >
                        {weather.pressure.toFixed(0)}
                      </motion.div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.section>

          {/* CENTER PANEL: Vector Radar (6/12) */}
          <motion.section variants={itemVariants} className="col-span-1 lg:col-span-6 bg-[#09111f]/90 backdrop-blur-xl border border-blue-900/40 rounded-2xl p-6 relative flex flex-col items-center justify-center min-h-[400px] lg:min-h-[500px] shadow-[0_0_50px_rgba(14,165,233,0.08)] overflow-hidden order-1 lg:order-2">
            
            {/* Background scanning effect */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,rgba(9,17,31,0.9)_100%)] z-10" />
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-cyan-400/20" />
              <div className="absolute top-0 left-1/2 w-[1px] h-full bg-cyan-400/20" />
            </div>

            <div className="absolute top-6 left-6 z-20">
              <h2 className="text-[11px] font-bold text-zinc-500 tracking-[0.2em] uppercase">
                Vector Radar
              </h2>
              <div className="mt-2 flex items-center gap-2 bg-slate-900/60 pl-2 pr-3 py-1 rounded-full backdrop-blur-sm border border-white/5 w-fit">
                <span className={cn("w-2 h-2 rounded-full", isHighWind ? "bg-rose-500 animate-pulse" : "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]")} />
                <span className="text-[10px] font-mono text-zinc-300">TRACKING: {stadium.id.toUpperCase()}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center w-full flex-1 z-10 mt-12 lg:mt-0">
              
              {/* Radar & Baseball Field SVG */}
              <div className="relative w-72 h-72 lg:w-[360px] lg:h-[360px] xl:w-[400px] xl:h-[400px] flex-shrink-0">
                {/* Radar Grid Pulses + Scan Ani */}
                <div className="absolute inset-0 rounded-full border border-cyan-400/30 bg-[#082f49]/20 shadow-[inset_0_0_60px_rgba(6,182,212,0.15)]" />
                <div className="absolute inset-6 lg:inset-8 rounded-full border border-cyan-400/20" />
                <div className="absolute inset-16 lg:inset-20 rounded-full border border-cyan-400/10" />
                <div className="absolute inset-24 lg:inset-32 rounded-full border border-cyan-400/5 drop-shadow-md" />
                
                <RadarScan isHighWind={isHighWind} />
                
                <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full drop-shadow-[0_0_10px_rgba(0,0,0,1)] z-20">
                  {/* Field base neon wireframe */}
                  <path d="M 100 170 L 20 90 A 113 113 0 0 1 180 90 Z" fill="none" stroke="#052e16" strokeWidth="2" opacity="0.9" />
                  <path d="M 100 170 L 20 90 A 113 113 0 0 1 180 90 Z" fill="#064e3b" opacity="0.15" />
                  <path d="M 100 170 L 20 90 A 113 113 0 0 1 180 90 Z" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  
                  {/* Infield Diamond wireframe */}
                  <path d="M 100 170 L 140 130 L 100 90 L 60 130 Z" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.9" />
                  
                  {/* Bases & Mound */}
                  <circle cx="100" cy="170" r="10" stroke="#0ea5e9" strokeWidth="1" fill="#0f172a" opacity="0.8" />
                  <circle cx="100" cy="130" r="6" stroke="#0ea5e9" strokeWidth="1" fill="#0ea5e9" opacity="0.4" />
                  <rect x="99" y="129" width="2" height="2" fill="#38bdf8" />
                  
                  {/* Bases (White glowing) */}
                  <polygon points="100,168 102,170 100,172 98,170" fill="#f8fafc" />
                  <polygon points="140,128 142,130 140,132 138,130" fill="#f8fafc" />
                  <polygon points="100,88 102,90 100,92 98,90" fill="#f8fafc" />
                  <polygon points="60,128 62,130 60,132 58,130" fill="#f8fafc" />
                  
                  {/* Foul lines */}
                  <line x1="100" y1="170" x2="20" y2="90" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.5" />
                  <line x1="100" y1="170" x2="180" y2="90" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.5" />

                  {/* Compass Labels */}
                  <text x="100" y="12" fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">N</text>
                  <text x="100" y="194" fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">S</text>
                  <text x="10" y="103" fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="start">W</text>
                  <text x="190" y="103" fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="end">E</text>
                </svg>

                {/* Animated Wind Vector Arrow */}
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-30" 
                  animate={{ rotate: weather.windDirection }}
                  transition={{ type: "spring", stiffness: 50, damping: 20 }}
                >
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-[3px] h-28 lg:h-36 rounded-full drop-shadow-xl",
                      isHighWind 
                        ? "bg-gradient-to-t from-rose-500 to-transparent shadow-[0_0_25px_rgba(244,63,94,0.9)]" 
                        : "bg-gradient-to-t from-cyan-400 to-transparent shadow-[0_0_25px_rgba(34,211,238,0.9)]"
                    )} />
                    <div className={cn(
                      "w-0 h-0 border-l-[8px] lg:border-l-[10px] border-l-transparent border-r-[8px] lg:border-r-[10px] border-r-transparent border-t-[16px] lg:border-t-[20px] -mt-1 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]",
                      isHighWind ? "border-t-rose-500" : "border-t-cyan-400"
                    )} />
                  </div>
                </motion.div>
                
                {/* Center Reticle */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                  <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_10px_white]", isHighWind ? "bg-rose-100" : "bg-white")} />
                </div>
              </div>

            </div>
          </motion.section>

          {/* RIGHT PANEL: Wind Dynamics & Impact (3/12) */}
          <motion.section variants={itemVariants} className="col-span-1 lg:col-span-3 flex flex-col gap-6 order-3 lg:order-3 lg:max-w-sm">
            <div className="bg-[#0a0a0c]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex-1 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
              <h2 className="text-[11px] font-bold text-zinc-500 mb-6 tracking-[0.2em] flex items-center uppercase">
                <Wind className="mr-2 text-cyan-400 w-3.5 h-3.5" />
                Dynamics
              </h2>

              <div className="flex flex-col gap-6 justify-between flex-1">
                
                {/* Wind Speed & Direction */}
                <div className="group relative">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] lg:text-xs text-zinc-500 font-medium uppercase tracking-wider">Wind Speed</p>
                    <div className={cn("text-[10px] font-mono uppercase px-2 py-0.5 rounded border transition-colors", 
                      isHighWind ? 'text-rose-400 border-rose-400/30 bg-rose-400/10' : 
                      'text-green-400 border-green-400/30 bg-green-400/10')}>
                      {isHighWind ? 'HIGH WIND' : 'STABLE'}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <motion.div 
                      key={weather.windSpeed}
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 1 }}
                      className={cn("text-4xl lg:text-5xl font-light font-mono tracking-tight glow transition-colors", 
                        isHighWind ? 'text-rose-400' : 'text-white'
                      )}
                    >
                      {weather.windSpeed.toFixed(1)}
                    </motion.div>
                    <span className="text-xl text-zinc-500 font-light">m/s</span>
                  </div>
                  
                  {/* Subtle speed meter bar */}
                  <div className="absolute -bottom-3 left-0 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className={cn("h-full", isHighWind ? "bg-rose-500" : "bg-cyan-500")}
                      animate={{ width: `${Math.min(100, (weather.windSpeed / 15) * 100)}%` }}
                      transition={{ type: "spring", stiffness: 100 }}
                    />
                  </div>
                </div>

                <div className="group mt-2">
                  <div className="flex justify-between items-end mb-1">
                    <p className="text-[10px] lg:text-xs text-zinc-500 font-medium uppercase tracking-wider">Vector / Angle</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Compass className={cn("w-6 h-6", themeColor)} />
                    <div className="flex flex-col">
                      <motion.p 
                        key={weather.windDirection}
                        className={cn("text-xl font-bold leading-tight", themeColor)}
                      >
                        {getWindDirectionJP(weather.windDirection)}
                      </motion.p>
                      <p className="text-xs font-mono text-zinc-500">{weather.windDirection.toFixed(0)}° DEG</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full my-2" />

                {/* Sunlight / Shadow */}
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] lg:text-xs text-zinc-500 font-medium uppercase tracking-wider">Sunlight</p>
                    <div className={cn("text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border transition-colors", 
                      stadium.isDome ? 'text-zinc-500 border-zinc-500/30 bg-zinc-500/10' :
                      weather.sunlight.isDay ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' : 
                      'text-indigo-400 border-indigo-400/30 bg-indigo-400/10')}>
                      {stadium.isDome ? 'INDOOR' : weather.sunlight.isDay ? 'DAYLIGHT' : 'NIGHT'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 h-[48px]">
                    {stadium.isDome ? (
                      <p className="text-lg font-light font-mono text-zinc-600 tracking-tight">NO EFFECT</p>
                    ) : weather.sunlight.isDay ? (
                      <>
                        <div className="flex items-center gap-3">
                          <Sun className="w-6 h-6 text-amber-400" />
                          <motion.div 
                            key={weather.sunlight.azimuth}
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            className="flex flex-col"
                          >
                            <span className="text-sm font-bold text-white leading-tight">{weather.sunlight.directionStr}</span>
                            <span className="text-[10px] font-mono text-zinc-500">AZ: {weather.sunlight.azimuth.toFixed(0)}°</span>
                          </motion.div>
                        </div>
                        <div className="text-[9px] text-amber-400/70 border-l border-amber-500/20 pl-3 leading-tight hidden lg:block">
                          直射日光あり<br/>目測に注意
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Moon className="w-6 h-6 text-indigo-400" />
                          <p className="text-lg font-bold text-white leading-tight glow">NIGHT</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Application Log & Analysis */}
            <div className="bg-[#0a0a0c]/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className={cn("absolute top-0 left-0 w-1 h-full", 
                gameImpact.level === 'high' ? 'bg-rose-500' : 
                gameImpact.level === 'medium' ? 'bg-amber-400' : 'bg-cyan-500')} 
              />
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <h3 className="text-[10px] text-zinc-400 mb-3 tracking-[0.2em] uppercase flex items-center gap-2">
                <Target className="w-3.5 h-3.5" />
                Game Impact
              </h3>
              
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-zinc-200 pl-2">
                  {gameImpact.text}
                </p>
                <p className="text-[10px] leading-relaxed text-zinc-500 pt-2 border-t border-white/5">
                  [ログ] {stadium.hasSeaBreeze ? '海岸沿い特有の海風が絶えず変化中。' : stadium.isDome ? 'ドーム環境のため無風状態として処理中。' : 'ビル風・市街地の気流の乱れが発生中。'}
                  {weather.pressure < 1005 && !stadium.isDome ? ' ※現在低気圧下のため、球が伸びやすい傾向にあります。' : ''}
                </p>
              </div>
            </div>
          </motion.section>

        </div>
      </motion.div>

      {/* Footer Status Bar */}
      <motion.footer 
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 flex-shrink-0 mt-8 pt-4 border-t border-white/5 flex flex-col md:flex-row items-center justify-between max-w-[1400px] w-full mx-auto"
      >
        <div className="text-[10px] text-zinc-600 font-mono flex items-center gap-3">
          <span className="flex items-center gap-1.5"><Gauge className="w-3 h-3 text-cyan-800"/> Node: Primary Array</span>
          <span className="hidden sm:block">|</span>
          <span className="hidden sm:block">Status: SECURE</span>
        </div>
        <div className="text-[10px] text-zinc-600 font-mono mt-2 md:mt-0">
          DATA SOURCED: DEMO ENVIRONMENT
        </div>
      </motion.footer>
    </div>
  );
};

export default App;
