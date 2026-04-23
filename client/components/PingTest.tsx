import { useTranslation } from 'next-i18next';

type ConnectionState = 'connecting' | 'connected' | 'reconnecting';

interface PingTestProps {
  ping: number | null;
  connectionState: ConnectionState;
}

function getIndicatorColor(connectionState: ConnectionState, ping: number | null) {
  if (connectionState === 'reconnecting') {
    return 'var(--bw-red)';
  }

  if (connectionState === 'connecting') {
    return 'var(--bw-muted-soft)';
  }

  if (ping === null) {
    return 'var(--bw-muted-soft)';
  }

  if (ping <= 120) {
    return 'var(--bw-green)';
  }

  if (ping <= 220) {
    return 'var(--bw-ember)';
  }

  return 'var(--bw-red)';
}

function getStatusLabel(
  connectionState: ConnectionState,
  ping: number | null,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (connectionState === 'reconnecting') {
    return t('network-reconnecting');
  }

  if (connectionState === 'connecting') {
    return t('network-connecting');
  }

  return ping === null
    ? `${t('latency')} ${t('latency-unknown')}`
    : `${t('latency')} ${ping}ms`;
}

const PingTest = ({ ping, connectionState }: PingTestProps) => {
  const { t } = useTranslation();

  return (
    <div
      className='menu-container flex items-center gap-2 rounded-none border-l-0 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em]'
      style={{ color: 'var(--bw-muted)' }}
    >
      <span
        className='inline-block size-2 shrink-0 rounded-full'
        style={{ backgroundColor: getIndicatorColor(connectionState, ping) }}
      />
      <span className='text-[10px] tracking-[0.24em]'>{t('network')}</span>
      <span>{getStatusLabel(connectionState, ping, t)}</span>
    </div>
  );
};

export default PingTest;
