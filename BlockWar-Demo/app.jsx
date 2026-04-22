const { Stage, Sprite, useSprite, Easing, interpolate } = window.Animations;

const colors = {
  bg: '#07080a',
  panel: '#101216',
  ink: '#f4f4f5',
  muted: '#a1a1aa',
  ember: '#f5c542',
  red: '#ef4444',
  green: '#68d391',
  blue: '#60a5fa',
  line: '#3f3f46',
};

function Logo({ scale = 1, opacity = 1 }) {
  return (
    <svg width={400 * scale} height={88 * scale} viewBox="0 0 1000 220" style={{ opacity }}>
      <rect x="2" y="2" width="996" height="216" rx="14" fill="#fbfaf6" stroke="#111318" strokeWidth="4"/>
      <rect x="22" y="22" width="12" height="176" fill="#f5c542"/>
      <g transform="translate(58 45) scale(2.03125)" shapeRendering="crispEdges">
        <rect x="8" y="8" width="24" height="24" fill="#f5c542"/>
        <rect x="32" y="8" width="24" height="24" fill="#fbfaf6"/>
        <rect x="8" y="32" width="24" height="24" fill="#fbfaf6"/>
        <rect x="32" y="32" width="24" height="24" fill="#111318"/>
        <rect x="8" y="8" width="48" height="48" fill="none" stroke="#111318" strokeWidth="2"/>
        <path d="M32 8v48M8 32h48" fill="none" stroke="#111318" strokeWidth="2"/>
      </g>
      <path d="M625 206Q625 148 602.0 108.5Q579 69 541.0 45.0Q503 21 454.5 10.5Q406 0 355 0H73V708H355Q396 708 439.0 699.5Q482 691 517.0 670.5Q552 650 574.0 615.0Q596 580 596 526Q596 467 564.0 428.5Q532 390 480 373V371Q510 366 536.5 352.5Q563 339 582.5 318.0Q602 297 613.5 269.0Q625 241 625 206ZM431 503Q431 539 403.5 555.5Q376 572 322 572H238V426H330Q378 426 404.5 445.5Q431 465 431 503ZM454 222Q454 266 421.0 283.0Q388 300 333 300H238V138H334Q354 138 375.5 141.5Q397 145 414.5 154.0Q432 163 443.0 179.5Q454 196 454 222Z" transform="translate(224.000 139.736) scale(0.084000 -0.084000)" fill="#111318"/>
      <path d="M73 0V708H245V149H519V0Z" transform="translate(280.860 139.736) scale(0.084000 -0.084000)" fill="#111318"/>
      <path d="M811 357Q811 273 782.0 203.5Q753 134 701.5 84.5Q650 35 579.0 8.0Q508 -19 425 -19Q342 -19 271.5 8.0Q201 35 149.5 84.5Q98 134 69.0 203.5Q40 273 40 357Q40 442 69.0 510.5Q98 579 149.5 627.0Q201 675 271.5 701.0Q342 727 425 727Q508 727 579.0 701.0Q650 675 701.5 627.0Q753 579 782.0 510.5Q811 442 811 357ZM628 357Q628 403 613.0 443.0Q598 483 571.5 511.5Q545 540 507.5 556.5Q470 573 425 573Q380 573 343.0 556.5Q306 540 279.0 511.5Q252 483 237.5 443.0Q223 403 223 357Q223 309 238.0 268.5Q253 228 279.5 199.0Q306 170 343.0 153.5Q380 137 425 137Q470 137 507.0 153.5Q544 170 571.0 199.0Q598 228 613.0 268.5Q628 309 628 357Z" transform="translate(323.524 139.736) scale(0.084000 -0.084000)" fill="#111318"/>
      <path d="M696 98Q649 44 580.0 12.5Q511 -19 421 -19Q339 -19 269.5 8.0Q200 35 149.0 84.5Q98 134 69.0 203.0Q40 272 40 355Q40 440 69.5 509.0Q99 578 151.0 626.5Q203 675 273.0 701.0Q343 727 424 727Q499 727 571.5 700.5Q644 674 689 623L573 507Q549 540 510.0 556.0Q471 572 430 572Q385 572 347.5 555.5Q310 539 283.0 510.0Q256 481 241.0 441.5Q226 402 226 355Q226 307 241.0 267.0Q256 227 282.5 198.5Q309 170 346.0 154.0Q383 138 427 138Q478 138 516.0 158.0Q554 178 577 210L696 98Z" transform="translate(396.008 139.736) scale(0.084000 -0.084000)" fill="#111318"/>
      <path d="M506 0 243 326H241V0H73V708H241V420H244L497 708H711L406 382L729 0Z" transform="translate(455.472 139.736) scale(0.084000 -0.084000)" fill="#111318"/>
      <path d="M823 0H654L514 479H511L371 0H201L0 708H184L296 237H299L425 708H603L730 237H733L847 708H1025Z" transform="translate(516.196 139.736) scale(0.084000 -0.084000)" fill="#111318"/>
      <path d="M553 0 498 139H224L172 0H-14L283 708H449L743 0ZM363 519 273 276H451Z" transform="translate(603.296 139.736) scale(0.084000 -0.084000)" fill="#111318"/>
      <path d="M452 0 299 281H241V0H73V708H343Q394 708 442.5 697.5Q491 687 529.5 662.0Q568 637 591.0 596.0Q614 555 614 494Q614 422 575.0 373.0Q536 324 467 303L652 0ZM445 491Q445 516 434.5 531.5Q424 547 407.5 555.5Q391 564 370.5 567.0Q350 570 331 570H240V405H321Q342 405 364.0 408.5Q386 412 404.0 421.0Q422 430 433.5 447.0Q445 464 445 491Z" transform="translate(665.532 139.736) scale(0.084000 -0.084000)" fill="#111318"/>
    </svg>
  );
}

function MapTile({ x, y, size, color, troops, icon, fog = false }) {
  return (
    <div style={{
      position: 'absolute',
      left: x * size,
      top: y * size,
      width: size,
      height: size,
      background: color,
      border: `2px solid ${colors.line}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.3,
      fontWeight: 700,
      color: colors.ink,
      opacity: fog ? 0.3 : 1,
      transition: 'all 0.3s ease',
    }}>
      {icon && <div style={{ fontSize: size * 0.4, marginBottom: 4 }}>{icon}</div>}
      {troops && <div>{troops}</div>}
      {fog && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />}
    </div>
  );
}

function OpeningScene() {
  const { t } = useSprite();
  const logoScale = interpolate(t, [0, 0.4], [1.5, 1], Easing.expoOut);
  const logoOpacity = interpolate(t, [0, 0.3], [0, 1], Easing.linear);
  const subtitleOpacity = interpolate(t, [0.4, 0.7], [0, 1], Easing.linear);
  const logoY = interpolate(t, [0.7, 1], [0, -200], Easing.expoOut);

  return (
    <div style={{ position: 'absolute', inset: 0, background: colors.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ transform: `translateY(${logoY}px) scale(${logoScale})` }}>
        <Logo opacity={logoOpacity} />
      </div>
      {t > 0.4 && (
        <div style={{ marginTop: 32, fontSize: 28, color: colors.muted, opacity: subtitleOpacity, letterSpacing: '0.05em', transform: `translateY(${logoY}px)` }}>
          实时多人策略游戏
        </div>
      )}
    </div>
  );
}

function MapScene() {
  const { t } = useSprite();
  const mapOpacity = interpolate(t, [0, 0.2], [0, 1], Easing.linear);
  const labelOpacity = interpolate(t, [0.3, 0.5], [0, 1], Easing.linear);
  const tileSize = 80;

  return (
    <div style={{ position: 'absolute', inset: 0, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: mapOpacity }}>
      <div style={{ position: 'relative', width: 12 * tileSize, height: 8 * tileSize }}>
        <MapTile x={1} y={1} size={tileSize} color={colors.red} troops={5} icon="👑" />
        <MapTile x={2} y={1} size={tileSize} color={colors.red} troops={3} />
        <MapTile x={1} y={2} size={tileSize} color={colors.red} troops={2} />
        <MapTile x={10} y={1} size={tileSize} color={colors.blue} troops={5} icon="👑" />
        <MapTile x={9} y={1} size={tileSize} color={colors.blue} troops={3} />
        <MapTile x={10} y={2} size={tileSize} color={colors.blue} troops={2} />
        <MapTile x={5} y={6} size={tileSize} color={colors.green} troops={5} icon="👑" />
        <MapTile x={6} y={6} size={tileSize} color={colors.green} troops={3} />
        <MapTile x={5} y={7} size={tileSize} color={colors.green} troops={2} />
        <MapTile x={5} y={3} size={tileSize} color={colors.muted} icon="🏛️" />
        <MapTile x={7} y={4} size={tileSize} color={colors.muted} icon="🏛️" />
        <MapTile x={4} y={4} size={tileSize} color={colors.line} icon="⛰️" />
        <MapTile x={8} y={3} size={tileSize} color={colors.line} icon="⛰️" />
        {t > 0.5 && (
          <>
            <MapTile x={0} y={0} size={tileSize} color={colors.panel} fog />
            <MapTile x={11} y={7} size={tileSize} color={colors.panel} fog />
            <MapTile x={3} y={5} size={tileSize} color={colors.panel} fog />
          </>
        )}
      </div>
      {t > 0.3 && (
        <div style={{ position: 'absolute', top: 100, right: 100, background: colors.panel, padding: 24, borderRadius: 8, opacity: labelOpacity, border: `2px solid ${colors.line}` }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: colors.ember }}>地形元素</div>
          <div style={{ fontSize: 16, color: colors.ink, lineHeight: 1.8 }}>
            <div>👑 将军/国王</div>
            <div>🏛️ 城市 (+5兵力/回合)</div>
            <div>⛰️ 山脉 (不可通过)</div>
            <div style={{ opacity: 0.5 }}>🌫️ 迷雾战争</div>
          </div>
        </div>
      )}
    </div>
  );
}

function GameplayScene() {
  const { t, elapsed } = useSprite();
  const tileSize = 80;
  const phase1 = t < 0.17;
  const phase2 = t >= 0.17 && t < 0.39;
  const phase3 = t >= 0.39 && t < 0.61;
  const phase4 = t >= 0.61 && t < 0.83;
  const phase5 = t >= 0.83;

  return (
    <div style={{ position: 'absolute', inset: 0, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 12 * tileSize, height: 8 * tileSize }}>
        {phase1 && (
          <>
            <MapTile x={1} y={1} size={tileSize} color={colors.red} troops={5} icon="👑" />
            <MapTile x={2} y={1} size={tileSize} color={colors.red} troops={Math.floor(interpolate(t, [0, 0.15], [3, 8], Easing.linear))} />
            <div style={{ position: 'absolute', left: 2.5 * tileSize, top: 1.5 * tileSize, fontSize: 40, opacity: interpolate(t, [0.05, 0.15], [1, 0], Easing.linear) }}>→</div>
            <div style={{ position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)', background: colors.panel, padding: '12px 24px', borderRadius: 8, fontSize: 18, color: colors.ember, border: `2px solid ${colors.line}` }}>
              玩家移动部队扩张领土
            </div>
          </>
        )}
        {phase2 && (
          <>
            <MapTile x={5} y={3} size={tileSize} color={t < 0.28 ? colors.muted : colors.blue} icon="🏛️" troops={t >= 0.28 ? 5 : null} />
            <div style={{ position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)', background: colors.panel, padding: '12px 24px', borderRadius: 8, fontSize: 18, color: colors.ember, border: `2px solid ${colors.line}` }}>
              占领城市增加兵力产出
            </div>
            {t >= 0.28 && <div style={{ position: 'absolute', left: 5.5 * tileSize, top: 2.5 * tileSize, fontSize: 24, color: colors.green, fontWeight: 700, animation: 'float 1s ease-out' }}>+5</div>}
          </>
        )}
        {phase3 && (
          <>
            <MapTile x={4} y={2} size={tileSize} color={colors.red} troops={Math.max(0, 8 - Math.floor(t * 20))} />
            <MapTile x={5} y={2} size={tileSize} color={colors.blue} troops={Math.max(0, 6 - Math.floor(t * 15))} />
            <div style={{ position: 'absolute', left: 4.5 * tileSize, top: 2 * tileSize, fontSize: 60, opacity: Math.sin(elapsed * 10) * 0.5 + 0.5 }}>⚔️</div>
            <div style={{ position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)', background: colors.panel, padding: '12px 24px', borderRadius: 8, fontSize: 18, color: colors.ember, border: `2px solid ${colors.line}` }}>
              边境冲突 - 兵力对决
            </div>
          </>
        )}
        {phase4 && (
          <>
            <MapTile x={2} y={2} size={tileSize} color={colors.red} troops={5} />
            <MapTile x={3} y={2} size={tileSize} color={colors.red} troops={3} />
            <MapTile x={6} y={2} size={tileSize} color={colors.panel} fog />
            <MapTile x={7} y={2} size={tileSize} color={colors.panel} fog />
            <MapTile x={8} y={2} size={tileSize} color={colors.panel} fog />
            <div style={{ position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)', background: colors.panel, padding: '12px 24px', borderRadius: 8, fontSize: 18, color: colors.ember, border: `2px solid ${colors.line}` }}>
              迷雾战争 - 敌方单位隐藏
            </div>
          </>
        )}
        {phase5 && (
          <>
            <MapTile x={5} y={4} size={tileSize} color={colors.green} troops={12} />
            <MapTile x={6} y={4} size={tileSize} color={t < 0.9 ? colors.red : colors.green} troops={t < 0.9 ? 3 : 0} icon={t < 0.9 ? "👑" : "💥"} />
            <div style={{ position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)', background: colors.panel, padding: '12px 24px', borderRadius: 8, fontSize: 18, color: colors.ember, border: `2px solid ${colors.line}` }}>
              击败敌方国王获得胜利
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EndingScene() {
  const { t } = useSprite();
  const leaderboardOpacity = interpolate(t, [0, 0.2], [0, 1], Easing.linear);
  const featuresOpacity = interpolate(t, [0.3, 0.5], [0, 1], Easing.linear);
  const ctaOpacity = interpolate(t, [0.7, 0.9], [0, 1], Easing.linear);

  return (
    <div style={{ position: 'absolute', inset: 0, background: colors.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {t < 0.3 && (
        <div style={{ opacity: leaderboardOpacity, background: colors.panel, padding: 40, borderRadius: 12, border: `3px solid ${colors.line}`, minWidth: 400 }}>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, color: colors.ember, textAlign: 'center' }}>🏆 游戏结束</div>
          <div style={{ fontSize: 20, color: colors.ink, lineHeight: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span>🥇 绿色玩家</span><span style={{ color: colors.green }}>胜利</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', opacity: 0.7 }}><span>🥈 蓝色玩家</span><span style={{ color: colors.blue }}>存活</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', opacity: 0.5 }}><span>🥉 红色玩家</span><span style={{ color: colors.red }}>淘汰</span></div>
          </div>
        </div>
      )}
      {t >= 0.3 && t < 0.7 && (
        <div style={{ opacity: featuresOpacity, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32, maxWidth: 800 }}>
          {[
            { icon: '🗺️', title: '自定义地图', desc: '创建和分享你的地图' },
            { icon: '📹', title: '回放系统', desc: '重温精彩对局' },
            { icon: '🎓', title: '教程模式', desc: '快速上手游戏' },
            { icon: '📱', title: '多平台支持', desc: '桌面和移动端' },
          ].map((f, i) => (
            <div key={i} style={{ background: colors.panel, padding: 32, borderRadius: 12, border: `2px solid ${colors.line}`, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: colors.ember, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: colors.muted }}>{f.desc}</div>
            </div>
          ))}
        </div>
      )}
      {t >= 0.7 && (
        <div style={{ opacity: ctaOpacity, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
          <Logo scale={0.8} />
          <button style={{ background: colors.ember, color: colors.bg, fontSize: 24, fontWeight: 700, padding: '16px 48px', border: 'none', borderRadius: 8, cursor: 'pointer', boxShadow: `8px 8px 0 ${colors.line}` }}>
            立即开始游戏
          </button>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 24, right: 32, fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
        Created by Huashu-Design
      </div>
    </div>
  );
}

function App() {
  return (
    <Stage duration={40} width={1920} height={1080} loop={true} bgColor={colors.bg}>
      <Sprite start={0} end={5}><OpeningScene /></Sprite>
      <Sprite start={5} end={12}><MapScene /></Sprite>
      <Sprite start={12} end={30}><GameplayScene /></Sprite>
      <Sprite start={30} end={40}><EndingScene /></Sprite>
    </Stage>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
