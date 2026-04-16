// cSpell:ignore uuidv
import {
  useCallback,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
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
import useMediaQuery from '@/hooks/useMediaQuery';
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
  className = '',
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bw-panel-hard w-full shrink-0 overflow-y-auto p-2 md:shrink md:overflow-visible md:p-4 ${className}`}
    >
      <div className='mb-1 flex items-center gap-2 border-b border-zinc-800 pb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 md:mb-3 md:pb-3 md:text-xs'>
        {icon}
        {title}
      </div>
      <div className='space-y-2 md:space-y-3'>{children}</div>
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
          className='bw-input h-auto min-h-14 resize-y py-2 text-left md:min-h-24 md:py-3'
          value={value}
          onChange={onChange}
        />
      ) : (
        <input
          id={id}
          className='bw-input h-10 text-left md:h-12'
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
  const isCompactEditor = useMediaQuery('(max-width: 767px)');

  const router = useRouter();
  const mapId = router.query.mapId as string;

  const {
    tileSize,
    position,
    mapRef,
    mapBasePixelWidth,
    mapBasePixelHeight,
    zoom,
  } = useMap({
    mapWidth,
    mapHeight,
    smallScreenZoom: editMode ? 0.75 : 0.7,
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

  const handleTileClick = useCallback((x: number, y: number) => {
    setMapData((currentMapData) => {
      const currentTile = currentMapData[x]?.[y];
      if (!currentTile) return currentMapData;

      let nextTile = [...currentTile] as CustomMapTileData;

      if (selectedTileType !== null) {
        if (currentTile[0] === selectedTileType) {
          nextTile = [TileType.Plain, null, 0, false, 0];
        } else {
          switch (+selectedTileType) {
            case TileType.King:
              nextTile = [selectedTileType, 1, 0, false, 0];
              break;
            case TileType.City:
              nextTile = [selectedTileType, null, 40, false, 0];
              break;
            case TileType.Plain:
            case TileType.Mountain:
            case TileType.Swamp:
              nextTile = [selectedTileType, null, 0, false, 0];
              break;
            default:
              return currentMapData;
          }
        }
      }

      if (selectedProperty !== null) {
        switch (selectedProperty) {
          case 'team':
            nextTile[1] = team;
            break;
          case 'unitsCount':
            nextTile[2] = unitsCount;
            break;
          case 'revealed':
            nextTile[3] = !nextTile[3];
            break;
          case 'priority':
            nextTile[4] = priority;
            break;
        }
      }

      if (
        currentTile[0] === nextTile[0] &&
        currentTile[1] === nextTile[1] &&
        currentTile[2] === nextTile[2] &&
        currentTile[3] === nextTile[3] &&
        currentTile[4] === nextTile[4]
      ) {
        return currentMapData;
      }

      const nextMapData = currentMapData.map((row) => row.slice());
      nextMapData[x][y] = nextTile;
      return nextMapData;
    });
  }, [priority, selectedProperty, selectedTileType, team, unitsCount]);

  const handleMapClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!editMode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scaledTileSize = tileSize * zoom;
    if (scaledTileSize <= 0) return;

    const y = Math.floor((event.clientX - rect.left) / scaledTileSize);
    const x = Math.floor((event.clientY - rect.top) / scaledTileSize);
    if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) return;

    handleTileClick(x, y);
  }, [editMode, handleTileClick, mapHeight, mapWidth, tileSize, zoom]);

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

  const settingsDockClassName =
    'menu-container absolute inset-x-2 top-[82px] z-[102] flex h-[26dvh] min-h-[168px] max-h-[198px] flex-row items-stretch gap-2 overflow-x-auto overflow-y-hidden p-2 pb-3 md:left-auto md:right-0 md:top-[70px] md:h-[calc(100dvh-140px)] md:min-h-0 md:max-h-none md:w-[min(360px,88vw)] md:flex-col md:gap-4 md:overflow-x-hidden md:overflow-y-auto md:p-4';
  const paletteDockClassName =
    'menu-container absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+8px)] z-[102] overflow-x-auto overflow-y-hidden p-2 md:bottom-[70px] md:left-0 md:right-auto md:top-[70px] md:h-[calc(100dvh-140px)] md:w-[96px] md:overflow-x-hidden md:overflow-y-auto';
  const paletteGridClassName =
    'grid min-w-max grid-flow-col auto-cols-[70px] gap-2 md:min-w-0 md:grid-flow-row md:auto-cols-auto';
  const paletteItemClassName =
    'icon-box my-0 h-[78px] min-w-[70px] justify-center px-1.5 py-1.5 md:h-auto md:min-h-0 md:min-w-0 md:px-1 md:py-1';
  const editorCardRailClassName =
    'min-w-[252px] md:min-w-0';
  const editorActionRailClassName =
    'grid w-[190px] min-w-[190px] shrink-0 content-start self-start grid-cols-2 auto-rows-[56px] gap-2 md:w-auto md:min-w-0 md:auto-rows-auto md:shrink md:self-auto';
  const paletteIconSize = isCompactEditor ? 34 : 40;
  const palettePropertyIconSize = isCompactEditor ? 24 : 28;
  const mapCenterTop =
    editMode && isCompactEditor ? 'calc(50% + 85px)' : '50%';

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
        <aside className={settingsDockClassName}>
          <button
            type='button'
            className='bw-button bw-button-primary order-1 w-[180px] min-w-[180px] max-w-[180px] shrink-0 self-stretch px-3 text-[11px] leading-snug tracking-[0.12em] whitespace-normal md:order-none md:w-full md:min-w-0 md:max-w-none md:self-auto md:text-xs md:leading-tight md:tracking-[0.18em]'
            onClick={handleOpenMapExplorer}
          >
            <FolderOpen size={16} strokeWidth={2.5} />
            {t('select-a-custom-map')}
          </button>

          <EditorCard
            icon={<Info size={18} strokeWidth={2.25} />}
            title={t('basic-info')}
            className={`order-3 ${editorCardRailClassName} md:order-none`}
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
            className={`order-4 ${editorCardRailClassName} md:order-none`}
          >
            <div className='grid gap-3 sm:grid-cols-2 md:grid-cols-1'>
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
            </div>
          </EditorCard>
          <div className={`order-2 ${editorActionRailClassName} md:order-none`}>
            <button
              type='button'
              className='bw-button bw-button-secondary h-14 min-h-14 w-full text-[10px] leading-tight tracking-[0.12em] whitespace-normal md:h-auto md:min-h-0 md:text-xs md:tracking-[0.18em]'
              onClick={handleDownloadMap}
            >
              <Download size={15} strokeWidth={2.5} />
              {t('download')}
            </button>
            <button
              type='button'
              className='bw-button bw-button-secondary h-14 min-h-14 w-full text-[10px] leading-tight tracking-[0.12em] whitespace-normal md:h-auto md:min-h-0 md:text-xs md:tracking-[0.18em]'
              onClick={handleUploadMap}
            >
              <Upload size={15} strokeWidth={2.5} />
              {t('upload')}
            </button>
            <button
              type='button'
              className='bw-button bw-button-secondary h-14 min-h-14 w-full text-[10px] leading-tight tracking-[0.12em] whitespace-normal md:h-auto md:min-h-0 md:text-xs md:tracking-[0.18em]'
              onClick={handleSaveDraft}
            >
              <Save size={15} strokeWidth={2.5} />
              {t('save-draft')}
            </button>
            <button
              type='button'
              className='bw-button bw-button-primary h-14 min-h-14 w-full text-[10px] leading-tight tracking-[0.12em] whitespace-normal md:h-auto md:min-h-0 md:text-xs md:tracking-[0.18em]'
              onClick={handlePublish}
            >
              <Send size={15} strokeWidth={2.5} />
              {t('publish')}
            </button>
          </div>
        </aside>
      )}

      {editMode && (
        <aside className={paletteDockClassName}>
          <div className={paletteGridClassName}>
            {Object.keys(name2TileType).map((tileName) => (
              <div
                key={tileName}
                className={`${paletteItemClassName} w-full ${
                  selectedTileType === name2TileType[tileName]
                    ? 'bw-palette-selected'
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
                      height: paletteIconSize,
                      width: paletteIconSize,
                      backgroundColor: '#808080',
                      border: '#000 solid 1px',
                    }}
                  />
                ) : (
                  <Image
                    src={TileType2Image[name2TileType[tileName]]}
                    alt={tileName}
                    width={paletteIconSize}
                    height={paletteIconSize}
                    draggable={false}
                  />
                )}
                <span className='mt-1 text-center text-[9px] font-black uppercase tracking-[0.08em] md:text-[10px]'>
                  {t(tileName)}
                </span>
              </div>
            ))}

            {Object.keys(property2var).map((property) => (
              <div
                key={property}
                className={`${paletteItemClassName} w-full ${
                  selectedProperty === property
                    ? 'bw-palette-selected'
                    : ''
                }`}
                onClick={() => {
                  setSelectedProperty(property);
                  setSelectedTileType(null);
                }}
              >
                {property === 'revealed' ? (
                  <Lightbulb size={palettePropertyIconSize} strokeWidth={2.25} className='text-white' />
                ) : (
                  <input
                    id={property}
                    type='number'
                    className='h-9 w-full border border-zinc-700 bg-zinc-950/90 px-1 py-1 text-center text-xs font-black text-zinc-100 md:h-10'
                    min={property2min[property]}
                    max={property2max[property]}
                    value={property2var[property]}
                    onChange={(event) =>
                      property2setVar[property](+event.target.value)
                    }
                  />
                )}
                <span className='mt-1 text-center text-[9px] font-black uppercase tracking-[0.08em] md:text-[10px]'>
                  {t(property)}
                </span>
              </div>
            ))}

            <div
              key='clear-all'
              className={`${paletteItemClassName} w-full border-red-400/70 text-red-200 hover:border-red-300`}
              onClick={() => {
                setMapData(getNewMapData());
              }}
            >
              <Eraser size={palettePropertyIconSize} strokeWidth={2.25} className='text-red-400' />
              <span className='mt-1 text-center text-[9px] font-black uppercase tracking-[0.08em] md:text-[10px]'>
                {t('clear-all')}
              </span>
            </div>
          </div>
        </aside>
      )}

      <div
        style={{
          position: 'absolute',
          top: mapCenterTop,
          left: '50%',
          transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
          width: mapBasePixelHeight, // game's width and height are swapped
          height: mapBasePixelWidth,
        }}
      >
        <div
          ref={mapRef}
          tabIndex={0}
          onClick={handleMapClick}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#495468',
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            willChange: 'transform',
            contain: 'layout paint style',
            touchAction: 'none',
          }}
        >
          {mapData.map((tiles, x) => {
            return tiles.map((tile, y) => {
              return (
                <CustomMapTile
                  key={`${x}/${y}`}
                  size={tileSize}
                  x={x}
                  y={y}
                  tile={tile}
                />
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

export default MapEditor;
