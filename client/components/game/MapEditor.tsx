// cSpell:ignore uuidv
import {
  useCallback,
  type ChangeEvent,
  type ReactNode,
  useMemo,
  useState,
  useEffect,
  useReducer,
} from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  Position,
  TileType,
  CustomMapTileData,
  TileType2Image,
  CustomMapData,
} from '@/lib/types';
import CustomMapTile from '@/components/game/CustomMapTile';
import { useTranslation } from 'next-i18next';
import { snackStateReducer } from '@/context/GameReducer';
import useMap from '@/hooks/useMap';
import MapExplorer from '@/components/game/MapExplorer';
import Loading from '@/components/Loading';
import PublishMapDialog from '@/components/PublishMapDialog';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import Toast from '@/components/ui/Toast';
import ModalShell from '@/components/ui/ModalShell';
import {
  Download,
  Eraser,
  FolderOpen,
  Info,
  Lightbulb,
  Save,
  Scaling,
  Send,
  Upload,
} from 'lucide-react';

const name2TileType: Record<string, TileType> = {
  king: TileType.King,
  city: TileType.City,
  plain: TileType.Plain,
  mountain: TileType.Mountain,
  swamp: TileType.Swamp,
};

function EditorCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className='bw-panel-hard w-full p-4'>
      <div className='mb-3 flex items-center gap-2 border-b border-zinc-800 pb-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-400'>
        {icon}
        {title}
      </div>
      <div className='space-y-3'>{children}</div>
    </section>
  );
}

function EditorField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  multiline = false,
}: {
  id: string;
  label: string;
  type?: 'text' | 'number';
  value: string | number;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  multiline?: boolean;
}) {
  return (
    <label className='block w-full' htmlFor={id}>
      <span className='mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500'>
        {label}
      </span>
      {multiline ? (
        <textarea
          id={id}
          className='bw-input min-h-24 resize-y py-3 text-left'
          value={value}
          onChange={onChange}
        />
      ) : (
        <input
          id={id}
          className='bw-input text-left'
          type={type}
          value={value}
          onChange={onChange}
        />
      )}
    </label>
  );
}

function getNewMapData(): CustomMapTileData[][] {
  return Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => [TileType.Plain, null, 0, false, 0])
  );
}

function MapEditor({ editMode }: { editMode: boolean }) {
  const [mapWidth, setMapWidth] = useState<number>(10);
  const [mapHeight, setMapHeight] = useState<number>(10);
  const [username, setUsername] = useState<string>('');
  const [team, setTeam] = useState<number>(0);
  const [unitsCount, setUnitCount] = useState<number>(50);
  const [priority, setPriority] = useState<number>(0);
  const [mapData, setMapData] = useState<CustomMapTileData[][]>(
    getNewMapData()
  );
  const [selectedTileType, setSelectedTileType] = useState<TileType | null>(
    TileType.Plain
  );
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [mapName, setMapName] = useState('');
  const [mapDescription, setMapDescription] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const { t } = useTranslation();
  const [snackState, snackStateDispatch] = useReducer(snackStateReducer, {
    open: false,
    title: '',
    message: '',
    duration: 1000,
    status: 'error',
  });

  const [loading, setLoading] = useState(false);
  const [openMapExplorer, setOpenMapExplorer] = useState(false);
  const [openPublishDialog, setOpenPublishDialog] = useState(false);
  const [publishMapId, setPublishMapId] = useState('');

  const router = useRouter();
  const mapId = router.query.mapId as string;

  const {
    tileSize,
    position,
    mapRef,
    mapPixelWidth,
    mapPixelHeight,
    zoom,
  } = useMap({
    mapWidth,
    mapHeight,
  });

  const handleOpenMapExplorer = () => {
    setOpenMapExplorer(true);
  };

  const handleCloseMapExplorer = () => {
    setOpenMapExplorer(false);
  };

  useEffect(() => {
    if (!editMode) return;
    let tmp: string | null = localStorage.getItem('username');
    if (!tmp) {
      setUsername('anonymous');
    } else {
      setUsername(tmp);
    }
    const mapDraft = localStorage.getItem('mapDraft');
    if (mapDraft) {
      const customMapData: CustomMapData = JSON.parse(mapDraft);
      setMapData(customMapData.mapTilesData);
      setMapWidth(customMapData.width);
      setMapHeight(customMapData.height);
      setMapName(customMapData.name);
      setMapDescription(customMapData.description);
    }
  }, [editMode]);

  const getMapDataFromServer = useCallback((custom_mapId: string) => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_SERVER_API}/maps/${custom_mapId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        return response.json();
      })
      .then((responseData) => {
        console.log(responseData);
        const customMapData = responseData as CustomMapData;
        setMapData(customMapData.mapTilesData);
        setMapWidth(customMapData.width);
        setMapHeight(customMapData.height);
        setMapName(customMapData.name);
        setMapDescription(customMapData.description);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (editMode) return;
    getMapDataFromServer(mapId);
  }, [mapId, editMode, getMapDataFromServer]);

  const handleMapSelect = (mapId: string) => {
    getMapDataFromServer(mapId);
    setOpenMapExplorer(false);
  };

  const property2var: Record<string, any> = {
    team: team,
    unitsCount: unitsCount,
    priority: priority,
    revealed: '',
  };

  const property2min: Record<string, any> = {
    team: 0,
    unitsCount: -9999,
    priority: 0,
    revealed: '',
  };

  const property2max: Record<string, any> = {
    team: 100,
    unitsCount: 9999,
    priority: 100,
    revealed: '',
  };

  const checkSetUnitCount = (value: number) => {
    if (value < property2min.unitsCount) {
      setUnitCount(property2min.unitsCount);
    } else if (value > property2max.unitsCount) {
      setUnitCount(property2max.unitsCount);
    } else {
      setUnitCount(value);
    }
  };
  const checkSetTeam = (value: number) => {
    if (value < property2min.team) {
      setTeam(property2min.team);
    } else if (value > property2max.team) {
      setTeam(property2max.team);
    } else {
      setTeam(value);
    }
  };

  const checkSetPriority = (value: number) => {
    if (value < property2min.priority) {
      setPriority(property2min.priority);
    } else if (value > property2max.priority) {
      setPriority(property2max.priority);
    } else {
      setPriority(value);
    }
  };

  const property2setVar: Record<string, any> = {
    team: checkSetTeam,
    unitsCount: checkSetUnitCount,
    priority: checkSetPriority,
  };

  const handleMapWidthChange = (event: any) => {
    let value = Number(event.target.value);

    if (value < 2) value = 2;
    if (value > 50) value = 50;

    setMapWidth(value);
    const newMapData = [...mapData];
    if (value > mapWidth) {
      for (let i = 0; i < value - mapWidth; ++i) {
        newMapData.push(
          Array.from({ length: mapHeight }, () => [
            TileType.Plain,
            null,
            0,
            false,
            0,
          ])
        );
      }
    } else {
      newMapData.splice(value, mapWidth - value);
    }
    setMapData(newMapData);
  };

  const handleMapHeightChange = (event: any) => {
    let value = Number(event.target.value);

    if (value < 2) value = 2;
    if (value > 50) value = 50;

    setMapHeight(value);
    const newMapData = [...mapData];
    if (value > mapHeight) {
      for (let i = 0; i < mapWidth; ++i) {
        for (let j = 0; j < value - mapHeight; ++j) {
          newMapData[i].push([TileType.Plain, null, 0, false, 0]);
        }
      }
    } else {
      for (let i = 0; i < mapWidth; ++i) {
        newMapData[i].splice(value, mapHeight - value);
      }
    }
    setMapData(newMapData);
  };

  const handleTileClick = (x: number, y: number) => {
    console.log('handleTileClick', x, y, selectedTileType, selectedProperty);
    const newMapData = [...mapData];

    if (selectedTileType !== null) {
      if (newMapData[x][y][0] === selectedTileType) {
        newMapData[x][y] = [TileType.Plain, null, 0, false, 0];
      } else {
        switch (+selectedTileType) {
          case TileType.King:
            newMapData[x][y] = [selectedTileType, 1, 0, false, 0];
            break;
          case TileType.City:
            newMapData[x][y] = [selectedTileType, null, 40, false, 0];
            break;
          case TileType.Plain:
          case TileType.Mountain:
          case TileType.Swamp:
            newMapData[x][y] = [selectedTileType, null, 0, false, 0];
            break;
          default:
            console.log('Error! no match TileType', selectedTileType);
        }
      }
    }

    if (selectedProperty !== null) {
      switch (selectedProperty) {
        case 'team':
          newMapData[x][y][1] = property2var[selectedProperty] as number;
          break;
        case 'unitsCount':
          newMapData[x][y][2] = property2var[selectedProperty] as number;
          break;
        case 'revealed':
          newMapData[x][y][3] = !newMapData[x][y][3];
          break;
        case 'priority': // todo
          newMapData[x][y][4] = property2var[selectedProperty] as number;
          break;
      }
    }

    setMapData(newMapData);
  };

  const generateCustomMapData = () => {
    // make sure mapName is not empty
    if (mapName === '') {
      snackStateDispatch({
        type: 'update',
        title: 'Error',
        message: t('Map name cannot be empty'),
        duration: null,
      });
      return;
    }

    let customMapData: CustomMapData = {
      id: uuidv4(),
      name: mapName,
      width: mapWidth,
      height: mapHeight,
      creator: username,
      description: mapDescription,
      mapTilesData: mapData,
    };
    return customMapData;
  };

  const handleSaveDraft = () => {
    // Save draft to local storage
    setDraftSaved(true);
    const customMapData = generateCustomMapData();
    if (customMapData)
      localStorage.setItem('mapDraft', JSON.stringify(customMapData));
  };

  const handlePublish = async () => {
    const customMapData = generateCustomMapData();
    if (!customMapData) return;

    snackStateDispatch({
      type: 'update',
      title: 'info',
      message: 'Map publishing... Please wait',
      status: 'info',
      duration: 5000,
    });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_API}/maps`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(customMapData),
        }
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      await response.json();

      setPublishMapId(customMapData.id);
      setOpenPublishDialog(true);
    } catch (error) {
      console.error('Error:', error);

      // Dispatch error snack
      snackStateDispatch({
        type: 'update',
        title: 'Error',
        message: 'Failed to publish map',
        duration: 5000,
      });
    }
  };

  const handleUploadMap = () => {
    // user can upload a json file contain map data
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = (event) => {
        const result = event.target?.result as string;
        try {
          const customMapData: CustomMapData = JSON.parse(result);

          setMapData(customMapData.mapTilesData);
          setMapWidth(customMapData.width);
          setMapHeight(customMapData.height);
          setMapName(customMapData.name);
          setMapDescription(customMapData.description);
        } catch (error) {
          snackStateDispatch({
            type: 'update',
            title: 'Error',
            message: t('Error parsing JSON file'),
            duration: 5000,
          });
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  const handleDownloadMap = () => {
    // download MapData as json
    const customMapData = generateCustomMapData();
    if (!customMapData) return;
    // Create a blob from the JSON string
    const blob = new Blob([JSON.stringify(customMapData, null, 2)], {
      type: 'application/json',
    });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `blockwar_custom_map_${username}_${mapName}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Quick select different type of tiles
    switch (event.key) {
      case 'k': // king
      case 'g': // general
        setSelectedTileType(TileType.King);
        setSelectedProperty(null);
        break;
      case 'c': // city
        setSelectedTileType(TileType.City);
        setSelectedProperty(null);
        break;
      case 'p': // plain
        setSelectedTileType(TileType.Plain);
        setSelectedProperty(null);
        break;
      case 'm': // mountain
        setSelectedTileType(TileType.Mountain);
        setSelectedProperty(null);
        break;
      case 's': // swamp
        setSelectedTileType(TileType.Swamp);
        setSelectedProperty(null);
        break;
      case 'r': // revealed
        setSelectedTileType(null);
        setSelectedProperty('revealed');
        break;
      case 't': // team
        setSelectedTileType(null);
        setSelectedProperty('team');
        break;
      case 'u': // unitsCount
        setSelectedTileType(null);
        setSelectedProperty('unitsCount');
        break;
      case 'o': // priority
        setSelectedTileType(null);
        setSelectedProperty('priority');
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    if (!editMode) return;
    const mapNode = mapRef.current;
    if (mapNode) {
      mapNode.addEventListener('keydown', handleKeyDown);
      return () => {
        mapNode.removeEventListener('keydown', handleKeyDown);
      };
    }
    return () => { };
  }, [mapRef, editMode, handleKeyDown]);

  return (
    <div
      className='app-container'
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <Toast
        open={snackState.open}
        duration={snackState.duration}
        status={snackState.status}
        title={snackState.title}
        message={snackState.message}
        onClose={() => {
          snackStateDispatch({ type: 'toggle', duration: null });
        }}
      />
      {!editMode && <Loading open={loading} title={t('loading-map')} />}
      {!editMode && (
        <>
          <section className='menu-container absolute bottom-0 left-1/2 z-[101] max-h-[30%] min-h-[10%] w-[90vw] -translate-x-1/2 overflow-y-auto border-b-0 p-4 md:w-[55vw] lg:w-[45vw]'>
            <h2 className='bw-title text-2xl'>{mapName}</h2>
            <div className='react_markdown mt-2'>
              <ReactMarkdown>{mapDescription}</ReactMarkdown>
            </div>
          </section>
          <button
            type='button'
            className='bw-button bw-button-primary absolute bottom-2 left-1/2 z-[1001] -translate-x-1/2'
            onClick={handleDownloadMap}
          >
            <Download size={16} strokeWidth={2.5} />
            {t('download')}
          </button>
        </>
      )}
      <PublishMapDialog
        open={openPublishDialog}
        onClose={() => setOpenPublishDialog(false)}
        mapId={publishMapId}
      ></PublishMapDialog>

      <ModalShell
        open={openMapExplorer}
        onClose={handleCloseMapExplorer}
        title={
          <div>
            <p className='bw-page-copy'>Map Library</p>
            <h2 className='bw-title text-4xl'>{t('choose-map')}</h2>
          </div>
        }
        widthClassName='max-w-5xl'
        actions={
          <button
            type='button'
            className='bw-button bw-button-secondary'
            onClick={handleCloseMapExplorer}
          >
            {t('close')}
          </button>
        }
      >
        <MapExplorer userId={username} onSelect={handleMapSelect} />
      </ModalShell>

      {editMode && (
        <aside className='menu-container absolute bottom-[70px] right-0 top-[70px] z-[102] flex h-[calc(100dvh-140px)] w-[min(360px,88vw)] flex-col gap-4 overflow-auto p-4'>
          <button
            type='button'
            className='bw-button bw-button-primary w-full'
            onClick={handleOpenMapExplorer}
          >
            <FolderOpen size={16} strokeWidth={2.5} />
            {t('select-a-custom-map')}
          </button>

          <EditorCard
            icon={<Info size={18} strokeWidth={2.25} />}
            title={t('basic-info')}
          >
              <EditorField
                id='map-name'
                label='Map Name'
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
              />
              <EditorField
                id='map-desc'
                label='Map Description'
                value={mapDescription}
                onChange={(e) => setMapDescription(e.target.value)}
                multiline
              />
          </EditorCard>
          <EditorCard
            icon={<Scaling size={18} strokeWidth={2.25} />}
            title={t('map-size')}
          >
              <EditorField
                id='map-width'
                label='Map Width'
                type='number'
                value={mapWidth}
                onChange={handleMapWidthChange}
              />
              <EditorField
                id='map-height'
                label='Map Height'
                type='number'
                value={mapHeight}
                onChange={handleMapHeightChange}
              />
          </EditorCard>
          <div className='grid w-full grid-cols-2 gap-2'>
            <button
              type='button'
              className='bw-button bw-button-secondary w-full text-xs'
              onClick={handleDownloadMap}
            >
              <Download size={15} strokeWidth={2.5} />
              {t('download')}
            </button>
            <button
              type='button'
              className='bw-button bw-button-secondary w-full text-xs'
              onClick={handleUploadMap}
            >
              <Upload size={15} strokeWidth={2.5} />
              {t('upload')}
            </button>
          </div>
          <div className='grid w-full grid-cols-2 gap-2'>
            <button
              type='button'
              className='bw-button bw-button-secondary w-full text-xs'
              onClick={handleSaveDraft}
            >
              <Save size={15} strokeWidth={2.5} />
              {t('save-draft')}
            </button>
            <button
              type='button'
              className='bw-button bw-button-primary w-full text-xs'
              onClick={handlePublish}
            >
              <Send size={15} strokeWidth={2.5} />
              {t('publish')}
            </button>
          </div>
        </aside>
      )}

      {editMode && (
        <aside className='menu-container absolute bottom-[70px] left-0 top-[70px] z-[102] h-[calc(100dvh-140px)] w-[96px] overflow-y-auto p-2'>
          <div className='grid gap-2'>
            {Object.keys(name2TileType).map((tileName) => (
              <div
                key={tileName}
                className={`icon-box w-full ${
                  selectedTileType === name2TileType[tileName]
                    ? 'border-yellow-300 bg-yellow-300/15 text-yellow-200'
                    : ''
                }`}
                onClick={() => {
                  setSelectedTileType(name2TileType[tileName]);
                  setSelectedProperty(null);
                }}
              >
                {tileName === 'plain' ? (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: '#808080',
                      border: '#000 solid 1px',
                    }}
                  />
                ) : (
                  <Image
                    src={TileType2Image[name2TileType[tileName]]}
                    alt={tileName}
                    width={40}
                    height={40}
                    draggable={false}
                  />
                )}
                <span className='mt-1 text-center text-[10px] font-black uppercase tracking-[0.08em]'>
                  {t(tileName)}
                </span>
              </div>
            ))}

            {Object.keys(property2var).map((property) => (
              <div
                key={property}
                className={`icon-box w-full ${
                  selectedProperty === property
                    ? 'border-yellow-300 bg-yellow-300/15 text-yellow-200'
                    : ''
                }`}
                onClick={() => {
                  setSelectedProperty(property);
                  setSelectedTileType(null);
                }}
              >
                {property === 'revealed' ? (
                  <Lightbulb size={28} strokeWidth={2.25} className='text-white' />
                ) : (
                  <input
                    id={property}
                    type='number'
                    className='w-full border border-zinc-700 bg-zinc-950/90 px-1 py-1 text-center text-xs font-black text-zinc-100'
                    min={property2min[property]}
                    max={property2max[property]}
                    value={property2var[property]}
                    onChange={(event) =>
                      property2setVar[property](+event.target.value)
                    }
                  />
                )}
                <span className='mt-1 text-center text-[10px] font-black uppercase tracking-[0.08em]'>
                  {t(property)}
                </span>
              </div>
            ))}

            <div
              key='clear-all'
              className='icon-box w-full border-red-400/70 text-red-200 hover:border-red-300'
              onClick={() => {
                setMapData(getNewMapData());
              }}
            >
              <Eraser size={28} strokeWidth={2.25} className='text-red-400' />
              <span className='mt-1 text-center text-[10px] font-black uppercase tracking-[0.08em]'>
                {t('clear-all')}
              </span>
            </div>
          </div>
        </aside>
      )
      }

      <div
        ref={mapRef}
        tabIndex={0}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
          width: mapPixelHeight, // game's width and height are swapped
          height: mapPixelWidth,
          backgroundColor: '#495468',
        }}
      >
        {mapData.map((tiles, x) => {
          return tiles.map((tile, y) => {
            return (
              <CustomMapTile
                key={`${x}/${y}`}
                zoom={zoom}
                size={tileSize}
                x={x}
                y={y}
                tile={tile}
                handleClick={editMode ? () => handleTileClick(x, y) : () => { }}
              />
            );
          });
        })}
      </div>
    </div >
  );
}

export default MapEditor;
