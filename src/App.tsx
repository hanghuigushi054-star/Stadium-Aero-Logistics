import React, { useState, useEffect } from 'react';
import { Wind, Thermometer, Droplets, AlertTriangle, Train, Clock, MapPin, Gauge } from 'lucide-react';

const STADIUMS = [
  { id: 'marine', name: 'ZOZOマリンスタジアム', station: '海浜幕張駅', windFactor: 1.2, hasSeaBreeze: true, homeTeam: 'ロッテ', awayTeam: 'オリックス', mock: { temp: 18.5, windSpeed: 9.2, windDirection: 210 } },
  { id: 'koshien', name: '阪神甲子園球場', station: '甲子園駅', windFactor: 0.9, hasSeaBreeze: true, homeTeam: '阪神', awayTeam: '巨人', mock: { temp: 20.1, windSpeed: 5.5, windDirection: 180 } },
  { id: 'jingu', name: '明治神宮野球場', station: '外苑前/信濃町/国立競技場駅', windFactor: 0.7, hasSeaBreeze: false, homeTeam: 'ヤクルト', awayTeam: '中日', mock: { temp: 19.8, windSpeed: 3.2, windDirection: 135 } },
  { id: 'yokohama', name: '横浜スタジアム', station: '関内駅', windFactor: 0.8, hasSeaBreeze: true, homeTeam: 'DeNA', awayTeam: '広島', mock: { temp: 19.0, windSpeed: 4.8, windDirection: 160 } },
  { id: 'escon', name: 'エスコンフィールドHOKKAIDO', station: '北広島駅', windFactor: 0.1, hasSeaBreeze: false, isDome: true, homeTeam: '日本ハム', awayTeam: '西武', mock: { temp: 22.0, windSpeed: 0.5, windDirection: 0 } },
  { id: 'rakuten', name: '楽天モバイルパーク', station: '宮城野原駅', windFactor: 0.8, hasSeaBreeze: false, homeTeam: '楽天', awayTeam: 'ソフトバンク', mock: { temp: 16.5, windSpeed: 6.8, windDirection: 90 } }
];

const App = () => {
  const [selectedStadiumId, setSelectedStadiumId] = useState('marine');
  const stadium = STADIUMS.find(s => s.id === selectedStadiumId) || STADIUMS[0];

  const [weather, setWeather] = useState({
    temp: stadium.mock.temp,
    windSpeed: stadium.mock.windSpeed,
    windDirection: stadium.mock.windDirection,
    humidity: 65,
  });

  // 球場変更時に状態をリセット
  useEffect(() => {
    setWeather({
      temp: stadium.mock.temp,
      windSpeed: stadium.mock.windSpeed,
      windDirection: stadium.mock.windDirection,
      humidity: 60 + Math.floor(Math.random() * 10), // 60-70%
    });
  }, [stadium.id]);

  // 定期的な風向・風速の揺らぎ（ビジュアルエフェクト）
  useEffect(() => {
    const interval = setInterval(() => {
      setWeather(prev => {
        // ドーム球場の場合は風の揺らぎを与えない
        if (stadium.isDome) return prev;
        return {
          ...prev,
          windSpeed: +(Math.max(0, prev.windSpeed + (Math.random() - 0.5) * 2)).toFixed(1),
          windDirection: (prev.windDirection + (Math.random() - 0.5) * 10) % 360,
        };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [stadium.id, stadium.isDome]);
  
  // 体感温度の簡易計算（風冷却）
  const feelsLikeTemp = parseFloat((weather.temp - Math.max(0, weather.windSpeed * 0.7)).toFixed(1));

  // 警告ロジック
  const getAlert = () => {
    if (weather.windSpeed >= 10) {
      return { type: 'danger', message: '⚠️ 暴風警報：飛来物に警戒し、避難ルートを確認してください。' };
    }
    if (weather.windSpeed >= 8) {
      return { type: 'warning', message: '⚠️ 強風注意：ビールの空きカップやチケットの飛散等に注意してください。' };
    }
    if (feelsLikeTemp < 10) {
      return { type: 'warning', message: '❄️ 低温注意：風による体感温度の低下に注意し、防寒対策をしてください。' };
    }
    return null;
  };
  const alert = getAlert();
  
  const getWindDirectionJP = (deg: number) => {
    if (deg > 337.5 || deg <= 22.5) return '北';
    if (deg > 22.5 && deg <= 67.5) return '北東';
    if (deg > 67.5 && deg <= 112.5) return '東';
    if (deg > 112.5 && deg <= 157.5) return '南東';
    if (deg > 157.5 && deg <= 202.5) return '南';
    if (deg > 202.5 && deg <= 247.5) return '南西';
    if (deg > 247.5 && deg <= 292.5) return '西';
    return '北西';
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 font-sans flex flex-col p-4 md:p-6 overflow-x-hidden">
      {/* Header / System Alerts */}
      <header className="flex-shrink-0 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-cyan-400">
                観戦ロジスティクス <span className="text-slate-500 font-normal">| コマンドセンター</span>
              </h1>
              <select 
                value={selectedStadiumId}
                onChange={(e) => setSelectedStadiumId(e.target.value)}
                className="bg-slate-900 border border-cyan-500/50 text-cyan-400 text-sm font-bold tracking-wider rounded-md px-3 py-1.5 outline-none focus:border-cyan-400 shadow-md shadow-cyan-500/10"
              >
                {STADIUMS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400 mt-2">対象会場: {stadium.name}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold tracking-widest">システム状態</p>
              <p className="text-xs font-mono text-green-400">● オンライン</p>
            </div>
            <div className="h-10 w-px bg-slate-800 hidden md:block"></div>
            <div className="text-right text-xs hidden md:block">
              <p className="text-slate-500">{new Date().toLocaleTimeString('ja-JP', { hour12: false })} JST</p>
            </div>
          </div>
        </div>

        {/* Survival Alert Banner */}
        {alert && (
          <div className={`border rounded-lg p-4 flex items-center space-x-4 transition-colors duration-500 ${
            alert.type === 'danger'
              ? 'bg-red-500/10 border-red-500/50 animate-pulse'
              : 'bg-yellow-500/10 border-yellow-500/50'
          }`}>
            <div className={`p-2 rounded ${alert.type === 'danger' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-slate-900'}`}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold tracking-wide ${alert.type === 'danger' ? 'text-red-400' : 'text-yellow-400'}`}>
                {alert.type === 'danger' ? '⚠️ 暴風警報発令中' : '⚠️ 注意報'}
              </p>
              <p className={`text-xs mt-0.5 ${alert.type === 'danger' ? 'text-red-200/70' : 'text-yellow-200/70'}`}>
                {alert.message}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        
        {/* Section 1: Weather Stats */}
        <section className="col-span-1 lg:col-span-1 flex flex-col space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex-1 shadow-lg">
            <h2 className="text-xs font-bold text-slate-500 mb-6 tracking-widest flex items-center">
              <Gauge className="mr-2 text-cyan-400 w-3.5 h-3.5" />
              観測データ
            </h2>
            
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                <div>
                  <p className="text-xs text-slate-400 mb-1">気温</p>
                  <p className="text-4xl font-light font-mono">{weather.temp.toFixed(1)}<span className="text-lg text-slate-500">°C</span></p>
                </div>
                <div className={`text-right text-xs font-mono uppercase ${weather.temp < 10 ? 'text-blue-400' : weather.temp > 30 ? 'text-orange-400' : 'text-green-400'}`}>
                  {weather.temp < 10 ? '低温' : weather.temp > 30 ? '高温' : '適温'}
                </div>
              </div>
              
              <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                <div>
                  <p className="text-xs text-slate-400 mb-1">湿度</p>
                  <p className="text-4xl font-light font-mono">{weather.humidity}<span className="text-lg text-slate-500">%</span></p>
                </div>
                <div className={`text-right text-xs font-mono uppercase ${weather.humidity > 70 ? 'text-cyan-500' : 'text-slate-500'}`}>
                  {weather.humidity > 70 ? '多湿' : '適正'}
                </div>
              </div>

              <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                <div>
                  <p className="text-xs text-slate-400 mb-1">風速</p>
                  <p className={`text-4xl font-light font-mono ${weather.windSpeed >= 8 ? 'text-orange-400' : 'text-slate-100'}`}>
                    {weather.windSpeed.toFixed(1)}<span className="text-lg text-slate-500">m/s</span>
                  </p>
                </div>
                <div className={`text-right text-xs font-mono uppercase ${weather.windSpeed >= 8 ? 'text-orange-400' : 'text-green-400'}`}>
                  {weather.windSpeed >= 8 ? '強風' : '通常'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 shadow-lg">
            <p className="text-[10px] text-slate-500 mb-2 tracking-widest">局地気象概況</p>
            <p className="text-xs leading-relaxed text-slate-400">
              {stadium.hasSeaBreeze ? '海沿い特有の風が絶えず変化しています。' : '上空とグラウンドで風向きが異なる場合があります。'}
              現在の状況下では、体感温度は表示環境より過酷になる恐れがあります。
            </p>
          </div>
        </section>

        {/* Section 2: Field & Wind Vector */}
        <section className="col-span-1 lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative flex flex-col items-center justify-start min-h-[400px] shadow-lg">
          <h2 className="absolute top-6 left-6 text-xs font-bold text-slate-500 tracking-widest z-10 bg-slate-900/80 px-2 py-1 rounded">
            グラウンド風向ベクトル
          </h2>
          
          <div className="flex flex-col items-center justify-center gap-6 mt-8 w-full">
            
            {/* 野球場ベクター図形 */}
            <div className="relative w-64 h-64 md:w-72 md:h-72 flex-shrink-0 bg-slate-950/30 rounded-full border border-slate-800/80 p-4 shadow-inner">
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
                <defs>
                  <linearGradient id="wind-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={weather.windSpeed >= 8 ? '#f97316' : '#06b6d4'} stopOpacity="0" />
                    <stop offset="50%" stopColor={weather.windSpeed >= 8 ? '#f97316' : '#06b6d4'} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={weather.windSpeed >= 8 ? '#f97316' : '#06b6d4'} stopOpacity="1" />
                  </linearGradient>
                </defs>

                {/* 草原 (Outfield) */}
                <path d="M 100 170 L 20 90 A 113 113 0 0 1 180 90 Z" fill="#064e3b" stroke="#10b981" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
                
                {/* 内野 (Infield Dirt) */}
                <path d="M 100 170 L 140 130 L 100 90 L 60 130 Z" fill="#78350f" stroke="#d97706" strokeWidth="1.5" opacity="0.6" />
                
                {/* ホームプレート周辺 */}
                <circle cx="100" cy="170" r="10" fill="#78350f" opacity="0.6" />
                <circle cx="100" cy="170" r="10" stroke="#d97706" strokeWidth="1" fill="none" opacity="0.8" />
                
                {/* マウンド */}
                <circle cx="100" cy="130" r="6" fill="#78350f" opacity="0.6" />
                <rect x="99" y="129" width="2" height="2" fill="white" />
                
                {/* ベース */}
                <polygon points="100,168 102,170 100,172 98,170" fill="white" />
                <polygon points="140,128 142,130 140,132 138,130" fill="white" />
                <polygon points="100,88 102,90 100,92 98,90" fill="white" />
                <polygon points="60,128 62,130 60,132 58,130" fill="white" />
                
                {/* ファウルライン */}
                <line x1="100" y1="170" x2="20" y2="90" stroke="white" strokeWidth="1" opacity="0.5" />
                <line x1="100" y1="170" x2="180" y2="90" stroke="white" strokeWidth="1" opacity="0.5" />

                {/* 方位マーカー（グラウンド外周） */}
                <text x="100" y="12" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">北 (N)</text>
                <text x="100" y="196" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">南 (S)</text>
                <text x="12" y="103" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">西</text>
                <text x="188" y="103" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">東</text>
              </svg>

              {/* 風向ベクトル（CSSオーバーレイ） */}
              <div className="absolute inset-0 flex items-center justify-center transition-transform duration-700 ease-out pointer-events-none" style={{ transform: `rotate(${weather.windDirection}deg)` }}>
                <div className="flex flex-col items-center">
                  <div className={`w-1.5 h-24 md:h-32 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.8)] ${weather.windSpeed >= 8 ? 'bg-gradient-to-t from-orange-500 to-transparent' : 'bg-gradient-to-t from-cyan-500 to-transparent'}`}></div>
                  <div className={`w-0 h-0 border-l-[8px] md:border-l-[10px] border-l-transparent border-r-[8px] border-r-[10px] border-r-transparent border-t-[16px] md:border-t-[20px] ${weather.windSpeed >= 8 ? 'border-t-orange-500' : 'border-t-cyan-400'} -mt-1 drop-shadow-md`}></div>
                </div>
              </div>
            </div>

            {/* 体感温度＆風向情報表示（グラウンドの下） */}
            <div className="flex flex-row w-full gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 backdrop-blur-sm shadow-md mt-auto">
              <div className="flex-1 border-r border-slate-800 pr-4">
                <p className="text-[10px] text-slate-400 tracking-wider mb-1">グラウンド体感温度</p>
                <div className="flex items-baseline gap-1">
                  <p className={`text-4xl font-light font-mono ${feelsLikeTemp < 10 ? 'text-blue-400' : feelsLikeTemp > 30 ? 'text-orange-400' : 'text-slate-100'}`}>
                    {feelsLikeTemp.toFixed(1)}
                  </p>
                  <span className="text-sm text-slate-500 font-mono">°C</span>
                </div>
              </div>

              <div className="flex-1 pl-2">
                <p className="text-[10px] text-slate-400 tracking-wider mb-1">風向き / 方位角</p>
                <div className="flex flex-col">
                  <p className="text-2xl font-bold text-cyan-400 leading-tight">{getWindDirectionJP(weather.windDirection)}</p>
                  <p className="text-sm font-mono text-cyan-500/70">{weather.windDirection.toFixed(0)}°</p>
                </div>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer Status Bar */}
      <footer className="flex-shrink-0 mt-6 pt-3 h-6 border-t border-slate-800 flex items-center justify-between px-2">
        <div className="text-[9px] text-slate-600 font-mono hidden md:block">
          環境センサー: メインポール観測所 | 状態: アクティブ | エラーなし
        </div>
        <div className="text-[9px] text-slate-600 font-mono md:hidden">
          センサー: アクティブ
        </div>
        <div className="text-[9px] text-slate-500 flex space-x-2 md:space-x-4">
          <span className="hidden sm:inline">雲量: 20%</span>
          <span className="hidden sm:inline">降水量: 0mm</span>
          <span className="text-cyan-600">保護された通信</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
