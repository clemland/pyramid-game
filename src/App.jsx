import { DiscordSDK } from '@discord/embedded-app-sdk';
import { useState, useEffect, useCallback } from 'react';

// ─── Animations CSS ────────────────────────────────────────────────────────────
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 12px #ffd60a50; } 50% { box-shadow: 0 0 28px #ffd60a80; } }
  @keyframes rankReveal { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
  .phone-app-icon { transition: transform 0.12s ease, filter 0.12s ease; cursor: pointer; user-select: none; -webkit-user-select:none; }
  .phone-app-icon:active { transform: scale(0.88) !important; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #030810; overflow: hidden; }
`;
document.head.appendChild(styleEl);

// ─── DB proxy ─────────────────────────────────────────────────────────────────
const db = {
  async select(table, { select = '*', filters = {} } = {}) {
    const res = await fetch('/api/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'select', table, select, filters }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'select error');
    return json.data;
  },
};

// ─── Pyramid config ───────────────────────────────────────────────────────────
const RANK_COLORS  = { A: '#ffd60a', B: '#e85d04', C: '#4cc9f0', D: '#7a8fa6' };
const RANK_BG      = { A: '#ffd60a15', B: '#e85d0415', C: '#4cc9f015', D: '#7a8fa615' };
const RANK_ICONS   = { A: '🥇', B: '🥈', C: '🥉', D: '⬇️' };
const RANK_LABELS  = { A: 'Élite', B: 'Excellent', C: 'Moyen', D: 'En difficulté' };
const RANK_PTS_BASE = { A: 3000, B: 2000, C: 1000, D: 0 };

// ─── PHONE SHELL ──────────────────────────────────────────────────────────────
function PhoneShell({ children }) {
  const [time, setTime] = useState(() => {
    const n = new Date();
    return n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  });
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setTime(n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      width: 390, height: '100vh', maxHeight: 844,
      background: 'linear-gradient(160deg, #0d1a2a 0%, #060f18 100%)',
      display: 'flex', flexDirection: 'column',
      borderRadius: window.innerWidth > 430 ? 40 : 0,
      overflow: 'hidden',
      boxShadow: window.innerWidth > 430 ? '0 0 80px rgba(0,0,0,0.8), inset 0 0 0 1px #ffffff08' : 'none',
      position: 'relative',
    }}>
      {/* Notch area / status bar */}
      <div style={{
        height: 50, paddingTop: 12, paddingLeft: 20, paddingRight: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexShrink: 0, position: 'relative', zIndex: 10,
      }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 600, color: '#e8f4ff', letterSpacing: 1 }}>
          {time}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 2 }}>
          <svg width={15} height={11} viewBox="0 0 15 11" fill="none">
            <path d="M7.5 9a.8.8 0 1 1 0 1.6A.8.8 0 0 1 7.5 9z" fill="#e8f4ff" />
            <path d="M4.8 6.8a4 4 0 0 1 5.4 0" stroke="#e8f4ff" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M2 4a8 8 0 0 1 11 0" stroke="#e8f4ff" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <svg width={22} height={12} viewBox="0 0 22 12" fill="none">
            <rect x="0.5" y="0.5" width="17" height="11" rx="2.5" stroke="#e8f4ff" strokeWidth="1" />
            <rect x="18" y="3.5" width="3" height="5" rx="1.2" fill="#e8f4ff" />
            <rect x="2" y="2" width="12" height="8" rx="1.5" fill="#e8f4ff" />
          </svg>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>

      {/* Home bar */}
      <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 120, height: 5, borderRadius: 3, background: '#ffffff18' }} />
      </div>
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function HomeScreen({ apps, onOpenApp }) {
  const n = new Date();
  const bigTime = n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = n.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{
      flex: 1, padding: '8px 24px 0',
      background: 'radial-gradient(ellipse at 50% -10%, #1a2d4030 0%, transparent 60%)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Clock */}
      <div style={{ textAlign: 'center', marginBottom: 36, marginTop: 10 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 68, fontWeight: 700, color: '#e8f4ff', lineHeight: 1 }}>
          {bigTime}
        </div>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: '#4a7090', marginTop: 4, textTransform: 'capitalize' }}>
          {dateStr}
        </div>
      </div>

      {/* App grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 18, padding: '18px 12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 24, border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {apps.map(app => (
          <div key={app.id} className="phone-app-icon"
            onClick={() => onOpenApp(app.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 58, height: 58, borderRadius: 14,
              background: app.gradient || '#1a2d40',
              border: `1px solid ${app.color || '#ffffff10'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 6px 20px ${app.color || '#000'}25`,
              overflow: 'hidden',
            }}>
              {app.logo
                ? <img src={app.logo} alt={app.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                : <span style={{ fontSize: 26 }}>{app.icon}</span>
              }
            </div>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: '#8aa0b8', textAlign: 'center', lineHeight: 1.2 }}>
              {app.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── APP NAV HEADER ───────────────────────────────────────────────────────────
function AppHeader({ title, color, onBack, logo }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      background: 'rgba(0,0,0,0.35)', borderBottom: `1px solid ${color}25`,
      flexShrink: 0,
    }}>
      <button onClick={onBack} style={{
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <polyline points="10,3 5,8 10,13" stroke="#8aa0b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {logo && (
        <div style={{ width: 26, height: 26, borderRadius: 7, overflow: 'hidden', flexShrink: 0, border: `1px solid ${color}40` }}>
          <img src={logo} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => e.target.style.display = 'none'} />
        </div>
      )}
      {!logo && (
        <div style={{ width: 26, height: 26, borderRadius: 7, background: color + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
          🏛️
        </div>
      )}
      <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 15, letterSpacing: 3, color, fontWeight: 600 }}>
        {title}
      </span>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      padding: '12px 8px', background: '#0a1520', border: '1px solid #1a2d40',
      borderRadius: 12, textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 9, color: '#3a5060', letterSpacing: 2, marginBottom: 3 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

// ─── PYRAMID APP ──────────────────────────────────────────────────────────────
function PyramidApp({ discordId, onBack, appLogo }) {
  const [profile, setProfile]     = useState(null);
  const [classmates, setClassmates] = useState([]);
  const [gages, setGages]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('rang');
  const [voteActive, setVoteActive] = useState(false);

  useEffect(() => {
    async function load() {
      if (!discordId) return;
      try {
        const rows = await db.select('players', {
          select: 'discord_id, username, class_name, pyramid_rank, pyramid_points, pyramid_votes_received',
          filters: { discord_id: `eq.${discordId}` },
        });
        const p = rows?.[0] || null;
        setProfile(p);

        if (p?.class_name) {
          const [mates, sessions, todayGages] = await Promise.all([
            db.select('players', {
              select: 'discord_id, username, pyramid_rank, pyramid_points, pyramid_votes_received',
              filters: { class_name: `eq.${p.class_name}` },
            }),
            db.select('pyramid_sessions', {
              select: 'id',
              filters: { class_name: `eq.${p.class_name}`, active: 'eq.true' },
            }),
            db.select('pyramid_gages', {
              select: 'gage_text, rank, date',
              filters: {
                discord_id: `eq.${discordId}`,
                date: `eq.${new Date().toISOString().slice(0, 10)}`,
              },
            }).catch(() => []),
          ]);

          setClassmates((mates || []).sort((a, b) => (b.pyramid_points || 0) - (a.pyramid_points || 0)));
          setVoteActive((sessions || []).length > 0);
          setGages(todayGages || []);
        }
      } catch (err) {
        console.error('[Pyramid]', err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [discordId]);

  const rank = profile?.pyramid_rank;
  const rankColor = rank ? RANK_COLORS[rank] : '#4a7090';

  const TABS = [
    { id: 'rang',   label: 'MON RANG',  emoji: '⭐' },
    { id: 'classe', label: 'CLASSE',    emoji: '👥' },
    { id: 'gage',   label: 'GAGE',      emoji: '🎲' },
  ];

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <svg width={44} height={44} viewBox="0 0 44 44" style={{ animation: 'spin 2s linear infinite' }}>
        <polygon points="22,3 41,13 41,31 22,41 3,31 3,13" fill="none" stroke="#ffd60a" strokeWidth="1.5" />
      </svg>
      <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 11, color: '#4a7090', letterSpacing: 3 }}>CHARGEMENT</span>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <AppHeader title="PYRAMID" color="#ffd60a" onBack={onBack} logo={appLogo} />

      {/* Tabs */}
      <div style={{
        display: 'flex', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid #1a2d40', flexShrink: 0,
      }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '9px 4px', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Oswald, sans-serif', fontSize: 9, letterSpacing: 1.5,
            color: activeTab === tab.id ? '#ffd60a' : '#3a5060',
            borderBottom: activeTab === tab.id ? '2px solid #ffd60a' : '2px solid transparent',
            transition: 'all 0.18s',
          }}>
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 20px' }}>

        {/* ─── MON RANG ─── */}
        {activeTab === 'rang' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {!rank ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🏛️</div>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, color: '#4a7090', letterSpacing: 2, marginBottom: 10 }}>
                  AUCUN RANG ATTRIBUÉ
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: '#2a3a4a', lineHeight: 1.6 }}>
                  Participe aux votes hebdomadaires<br />pour obtenir ton rang Pyramid.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Big rank card */}
                <div style={{
                  textAlign: 'center', padding: '28px 16px',
                  background: RANK_BG[rank],
                  border: `2px solid ${rankColor}35`,
                  borderRadius: 18,
                  animation: 'pulseGlow 3s ease-in-out infinite',
                }}>
                  <div style={{ fontSize: 42, marginBottom: 6 }}>{RANK_ICONS[rank]}</div>
                  <div style={{
                    fontFamily: 'Oswald, sans-serif', fontSize: 76, fontWeight: 700,
                    color: rankColor, lineHeight: 1,
                    textShadow: `0 0 40px ${rankColor}55`,
                    letterSpacing: -2,
                  }}>
                    {rank}
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: rankColor, marginTop: 6, letterSpacing: 3 }}>
                    {RANK_LABELS[rank]?.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 11, color: `${rankColor}80`, marginTop: 4 }}>
                    Base : {RANK_PTS_BASE[rank].toLocaleString()} pts
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <StatCard icon="🗳️" label="Votes reçus" value={profile.pyramid_votes_received || 0} color={rankColor} />
                  <StatCard icon="⚡" label="Points totaux" value={(profile.pyramid_points || 0).toLocaleString()} color={rankColor} />
                </div>

                {/* Classe info */}
                {profile.class_name && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', background: '#0a1520',
                    border: '1px solid #1a2d40', borderRadius: 12,
                  }}>
                    <span style={{ fontSize: 20 }}>📚</span>
                    <div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 9, color: '#3a5060', letterSpacing: 2, marginBottom: 2 }}>
                        CLASSE
                      </div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: '#e8f4ff', fontWeight: 600 }}>
                        {profile.class_name}
                      </div>
                    </div>
                  </div>
                )}

                {/* Vote active banner */}
                {voteActive && (
                  <div style={{
                    padding: '10px 14px', background: '#2dc65312',
                    border: '1px solid #2dc65340', borderRadius: 10,
                    fontFamily: 'Oswald, sans-serif', fontSize: 10, color: '#2dc653',
                    letterSpacing: 1.5, textAlign: 'center',
                  }}>
                    ✅ VOTE EN COURS — /pyramid voter
                  </div>
                )}

                {/* Répartition */}
                <div style={{ background: '#0a1520', border: '1px solid #1a2d40', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 10, color: '#3a5060', letterSpacing: 2, marginBottom: 10 }}>
                    RÉPARTITION DES RANGS
                  </div>
                  {[
                    { r: 'A', pct: '14%', pts: '3 000+' },
                    { r: 'B', pct: '20%', pts: '2 000+' },
                    { r: 'C', pct: '30%', pts: '1 000+' },
                    { r: 'D', pct: '36%', pts: '0+' },
                  ].map(({ r, pct, pts }) => (
                    <div key={r} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 0', borderBottom: '1px solid #0d1824',
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 7,
                        background: RANK_BG[r], border: `1px solid ${RANK_COLORS[r]}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Oswald, sans-serif', fontSize: 13, fontWeight: 700, color: RANK_COLORS[r],
                        flexShrink: 0,
                      }}>
                        {r}
                      </div>
                      <div style={{ flex: 1, fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: '#8aa0b8' }}>
                        {pct} des élèves
                      </div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 12, color: RANK_COLORS[r] }}>
                        {pts} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── CLASSE ─── */}
        {activeTab === 'classe' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {!profile?.class_name ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#2a3a4a', fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 2 }}>
                PAS DE CLASSE ASSIGNÉE
              </div>
            ) : (
              <>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 10, color: '#4a7090', letterSpacing: 3, marginBottom: 12 }}>
                  CLASSE {profile.class_name} · {classmates.length} ÉLÈVES
                </div>
                {classmates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#2a3a4a', fontFamily: 'Rajdhani, sans-serif', fontSize: 13 }}>
                    Aucun camarade avec un rang.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {classmates.map((mate, i) => {
                      const mr = mate.pyramid_rank;
                      const mc = mr ? RANK_COLORS[mr] : '#4a7090';
                      const isMe = mate.discord_id === discordId;
                      return (
                        <div key={mate.discord_id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px',
                          background: isMe ? `${mc}10` : '#0a1520',
                          border: `1px solid ${isMe ? mc + '40' : '#1a2d40'}`,
                          borderRadius: 12,
                          animation: `fadeIn ${0.05 * i + 0.1}s ease`,
                        }}>
                          <div style={{ width: 22, textAlign: 'center', fontFamily: 'Oswald, sans-serif', fontSize: 10, color: '#2a3a4a' }}>
                            #{i + 1}
                          </div>
                          {mr ? (
                            <div style={{
                              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                              background: RANK_BG[mr], border: `1px solid ${mc}40`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 700, color: mc,
                            }}>
                              {mr}
                            </div>
                          ) : (
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0d1824', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>?</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: isMe ? mc : '#e8f4ff', fontWeight: 600,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {mate.username}{isMe ? ' ★' : ''}
                            </div>
                            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 9, color: '#3a5060', letterSpacing: 1 }}>
                              {(mate.pyramid_points || 0).toLocaleString()} pts · {mate.pyramid_votes_received || 0} votes
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── GAGE ─── */}
        {activeTab === 'gage' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {!rank ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎲</div>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 12, color: '#4a7090', letterSpacing: 2 }}>
                  AUCUN RANG — PAS DE GAGE
                </div>
              </div>
            ) : gages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 12, color: '#4a7090', letterSpacing: 2, marginBottom: 10 }}>
                  PAS DE GAGE AUJOURD'HUI
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: '#2a3a4a', lineHeight: 1.6 }}>
                  Les gages sont générés par l'IA<br />et envoyés chaque jour à minuit.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 10, color: '#4a7090', letterSpacing: 3, marginBottom: 4 }}>
                  GAGE DU JOUR — {new Date().toLocaleDateString('fr-FR')}
                </div>
                {gages.map((g, i) => (
                  <div key={i} style={{
                    padding: '16px 14px',
                    background: RANK_BG[g.rank] || '#0a1520',
                    border: `1px solid ${RANK_COLORS[g.rank] || '#1a2d40'}35`,
                    borderLeft: `3px solid ${RANK_COLORS[g.rank] || '#4a7090'}`,
                    borderRadius: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 14 }}>{RANK_ICONS[g.rank] || '🎲'}</span>
                      <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 9,
                        color: RANK_COLORS[g.rank] || '#4a7090', letterSpacing: 2 }}>
                        RANG {g.rank}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: '#e8f4ff', lineHeight: 1.65 }}>
                      {g.gage_text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LOGO MODAL ───────────────────────────────────────────────────────────────
function LogoModal({ onSave, onClose }) {
  const [url, setUrl] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: '#0d1824', border: '1px solid #1a2d40', borderRadius: 16,
        padding: 20, width: '100%', maxWidth: 280,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 12, color: '#8aa0b8', letterSpacing: 2, marginBottom: 14 }}>
          LOGO DE L'APP PYRAMID
        </div>
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://..."
          style={{
            width: '100%', background: '#060f18', border: '1px solid #1a2d40',
            borderRadius: 8, padding: '9px 12px', color: '#e8f4ff',
            fontFamily: 'Rajdhani, sans-serif', fontSize: 13, outline: 'none',
          }} />
        {url.startsWith('http') && (
          <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', border: '1px solid #1a2d40', flexShrink: 0 }}>
              <img src={url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => e.target.style.display = 'none'} />
            </div>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: '#4a7090' }}>Aperçu du logo</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{
            flex: 1, background: 'none', border: '1px solid #1a2d40', borderRadius: 8,
            padding: 9, cursor: 'pointer', color: '#3a5060',
            fontFamily: 'Oswald, sans-serif', fontSize: 10, letterSpacing: 1,
          }}>ANNULER</button>
          <button onClick={() => { onSave(url); onClose(); }} style={{
            flex: 1, background: '#ffd60a15', border: '1px solid #ffd60a60', borderRadius: 8,
            padding: 9, cursor: 'pointer', color: '#ffd60a',
            fontFamily: 'Oswald, sans-serif', fontSize: 10, letterSpacing: 1,
          }}>CONFIRMER</button>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [discordId, setDiscordId] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [currentApp, setCurrentApp] = useState(null);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [pyramidLogo, setPyramidLogo] = useState(() => {
    try { return sessionStorage.getItem('pyramid_logo') || null; } catch { return null; }
  });

  useEffect(() => {
    async function setup() {
      try {
        const isInDiscord = window.location.search.includes('frame_id');
        if (!isInDiscord) {
          setDiscordId('dev_user');
          setLoading(false);
          return;
        }
        const sdk = new DiscordSDK(import.meta.env.VITE_CLIENT_ID);
        await sdk.ready();
        const { code } = await sdk.commands.authorize({
          client_id: import.meta.env.VITE_CLIENT_ID,
          response_type: 'code', prompt: 'none', scope: ['identify'],
        });
        const tokenRes = await fetch('/api/token', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        if (!tokenRes.ok) throw new Error('Échec du token.');
        const { access_token } = await tokenRes.json();
        await sdk.commands.authenticate({ access_token });
        const userRes = await fetch('https://discord.com/api/v10/users/@me', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (!userRes.ok) throw new Error("Impossible de récupérer l'utilisateur Discord.");
        const user = await userRes.json();
        setDiscordId(user.id);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    setup();
  }, []);

  const handleSaveLogo = useCallback((url) => {
    setPyramidLogo(url);
    try { sessionStorage.setItem('pyramid_logo', url); } catch {}
  }, []);

  const apps = [
    {
      id: 'pyramid',
      name: 'Pyramid',
      icon: '🏛️',
      logo: pyramidLogo,
      color: '#ffd60a',
      gradient: 'linear-gradient(140deg, #1a1000, #261800)',
    },
  ];

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030810', flexDirection: 'column', gap: 14 }}>
      <svg width={52} height={52} viewBox="0 0 52 52" style={{ animation: 'spin 2s linear infinite' }}>
        <polygon points="26,3 49,15 49,37 26,49 3,37 3,15" fill="none" stroke="#ffd60a" strokeWidth="1.5" />
      </svg>
      <p style={{ color: '#4a7090', fontFamily: 'Oswald, sans-serif', letterSpacing: 4, fontSize: 11, margin: 0 }}>CHARGEMENT...</p>
    </div>
  );

  if (error) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030810', padding: 20 }}>
      <p style={{ color: '#f72585', fontFamily: 'Oswald, sans-serif', letterSpacing: 2, textAlign: 'center' }}>
        ERREUR — {error}
      </p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#030810' }}>
      <PhoneShell>
        {/* Logo button — only on home */}
        {!currentApp && (
          <div style={{ position: 'absolute', top: 52, right: 14, zIndex: 20 }}>
            <button onClick={() => setShowLogoModal(true)} style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
              color: '#4a7090', fontFamily: 'Oswald, sans-serif', fontSize: 9, letterSpacing: 1,
            }}>
              ✏️ LOGO
            </button>
          </div>
        )}

        {!currentApp && <HomeScreen apps={apps} onOpenApp={setCurrentApp} />}

        {currentApp === 'pyramid' && (
          <PyramidApp discordId={discordId} onBack={() => setCurrentApp(null)} appLogo={pyramidLogo} />
        )}
      </PhoneShell>

      {showLogoModal && (
        <LogoModal onSave={handleSaveLogo} onClose={() => setShowLogoModal(false)} />
      )}
    </div>
  );
}
