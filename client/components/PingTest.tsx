import React, { useState, useEffect } from 'react';

const PingTest = () => {
  const [ping, setPing] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const startTime = Date.now();
      fetch(`${process.env.NEXT_PUBLIC_SERVER_API}/ping`)
        .then(() => {
          const endTime = Date.now();
          setPing(endTime - startTime);
        })
        .catch(() => {
          setPing(null);
        });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className='menu-container z-[110] mr-2 mt-2 flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-300'>
      <span className={`size-2 ${ping !== null ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
      {ping !== null ? `Ping ${ping}ms` : 'Ping null'}
    </div>
  );
};

export default PingTest;
