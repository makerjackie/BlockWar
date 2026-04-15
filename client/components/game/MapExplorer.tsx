import { useEffect, useCallback, useState, memo } from 'react';
import { useRouter } from 'next/router';
import { CustomMapInfo } from '@/lib/types';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { AspectRatioRounded, SearchRounded } from '@mui/icons-material';
import { useTranslation } from 'next-i18next';

interface ListItemProps {
  endpoint: string;
  map: CustomMapInfo;
  handleStarClick: any;
  onSelect: any;
  starred: boolean;
}

const ListItem = memo<ListItemProps>(function MemoItems(props) {
  const { endpoint, map, handleStarClick, onSelect, starred } = props;
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <article
      key={endpoint + map.id}
      className='border border-zinc-800 bg-zinc-950/65 p-4'
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h3 className='truncate text-lg font-black text-zinc-50'>{map.name}</h3>
          <p className='text-xs uppercase tracking-[0.16em] text-zinc-500'>
            {t('created-by')} {map.creator} ·{' '}
            {new Date(map.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button
          type='button'
          className={`bw-button min-h-10 px-3 text-xs ${starred ? 'bw-button-primary' : 'bw-button-secondary'}`}
          onClick={() => handleStarClick(map.id)}
        >
          {starred ? <StarRoundedIcon fontSize='small' /> : <StarBorderRoundedIcon fontSize='small' />}
          {map.starCount}
        </button>
      </div>

      <div className='mt-4 flex items-center justify-between gap-4 text-sm text-zinc-400'>
        <div className='flex items-center gap-2'>
          <VisibilityIcon fontSize='small' />
          <span>{map.views}</span>
        </div>
        <div className='flex items-center gap-2'>
          <AspectRatioRounded fontSize='small' />
          <span>
            {map.width} x {map.height}
          </span>
        </div>
      </div>

      <p className='mt-4 line-clamp-2 text-sm text-zinc-300'>{map.description}</p>

      <div className='mt-4 flex flex-wrap gap-2'>
        <button
          type='button'
          className='bw-button bw-button-secondary'
          onClick={() => router.push(`/maps/${map.id}`)}
        >
          {t('view-map')}
        </button>
        {onSelect && (
          <button
            type='button'
            className='bw-button bw-button-primary'
            onClick={() => {
              onSelect(map.id);
            }}
          >
            {t('choose-map')}
          </button>
        )}
      </div>
    </article>
  );
});

interface MapExplorerProps {
  userId: string;
  onSelect?: (mapId: string) => void;
}

const tabLabels = ['new', 'hot', 'best', 'search'] as const;

export default function MapExplorer({ userId, onSelect }: MapExplorerProps) {
  const [tabIndex, setTabIndex] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [maps, setMaps] = useState<CustomMapInfo[] | undefined>(undefined);
  const [starredMaps, setStarredMaps] = useState<{ [key: string]: boolean }>(
    {}
  );
  const { t } = useTranslation();

  useEffect(() => {
    if (!userId) return;
    const fetchStarredMaps = async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_API}/starredMaps?userId=${userId}`
      );
      const data: string[] = await response.json();

      const nextStarredMaps = data.reduce(
        (acc: { [key: string]: boolean }, mapId: string) => {
          acc[mapId] = true;
          return acc;
        },
        {}
      );
      setStarredMaps(nextStarredMaps);
    };

    fetchStarredMaps();
  }, [userId]);

  useEffect(() => {
    const fetchMaps = async () => {
      const endpoint = tabLabels[tabIndex];
      const url = `${process.env.NEXT_PUBLIC_SERVER_API}/${endpoint}${
        tabIndex === 3 ? `?q=${searchTerm}` : ''
      }`;
      const response = await fetch(url);
      const data = (await response.json()) as CustomMapInfo[];
      setMaps(data);
    };
    fetchMaps();
  }, [tabIndex, searchTerm]);

  const handleStarClick = useCallback(
    async (mapId: string) => {
      try {
        const isStarred = starredMaps[mapId];
        const action = isStarred ? 'decrease' : 'increase';

        setMaps((prevMaps) =>
          prevMaps?.map((map) =>
            map.id === mapId
              ? {
                  ...map,
                  starCount: isStarred ? map.starCount - 1 : map.starCount + 1,
                }
              : map
          )
        );
        setStarredMaps((prevStarredMaps) => ({
          ...prevStarredMaps,
          [mapId]: !isStarred,
        }));

        await fetch(`${process.env.NEXT_PUBLIC_SERVER_API}/toggleStar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            mapId,
            action,
          }),
        });
      } catch (error) {
        console.log('star error', error);
      }
    },
    [starredMaps, userId]
  );

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap gap-2 border-b border-zinc-800 pb-3'>
        {tabLabels.map((tab, index) => (
          <button
            key={tab}
            type='button'
            className={`bw-button min-h-10 px-3 text-xs ${
              tabIndex === index ? 'bw-button-primary' : 'bw-button-secondary'
            }`}
            onClick={() => setTabIndex(index)}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      {tabIndex === 3 && (
        <label className='relative block'>
          <SearchRounded className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500' />
          <input
            className='bw-input pl-10 text-left'
            placeholder='Search'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
      )}

      <div className='flex max-h-[500px] flex-col gap-3 overflow-auto pr-1'>
        {maps === undefined ? (
          <div className='border border-zinc-800 bg-zinc-950/60 px-4 py-6 text-center text-sm text-zinc-400'>
            Loading maps...
          </div>
        ) : maps.length === 0 ? (
          <div className='border border-zinc-800 bg-zinc-950/60 px-4 py-6 text-center text-sm text-zinc-400'>
            No maps found.
          </div>
        ) : (
          maps.map((map) => (
            <ListItem
              key={map.id}
              endpoint={tabLabels[tabIndex]}
              map={map}
              handleStarClick={handleStarClick}
              onSelect={onSelect}
              starred={starredMaps[map.id]}
            />
          ))
        )}
      </div>
    </div>
  );
}
