import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TileType = {
  King: 0,
  City: 1,
  Plain: 4,
  Mountain: 5,
  Swamp: 6,
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }
  return args;
}

function createGrid(size) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [TileType.Plain, null, 0, false, 0])
  );
}

function inBounds(grid, row, col) {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length;
}

function setTile(grid, row, col, type, options = {}) {
  if (!inBounds(grid, row, col)) {
    return;
  }

  const {
    team = null,
    units = type === TileType.King ? 1 : 0,
    revealed = false,
    priority = 0,
  } = options;

  grid[row][col] = [type, team, units, revealed, priority];
}

function paintDisk(grid, row, col, radius, painter) {
  for (let nextRow = row - radius; nextRow <= row + radius; nextRow += 1) {
    for (let nextCol = col - radius; nextCol <= col + radius; nextCol += 1) {
      if (!inBounds(grid, nextRow, nextCol)) {
        continue;
      }
      const distance = Math.hypot(nextRow - row, nextCol - col);
      if (distance <= radius + 0.2) {
        painter(nextRow, nextCol);
      }
    }
  }
}

function drawLine(grid, from, to, painter, thickness = 0) {
  let [row0, col0] = from;
  const [row1, col1] = to;
  const deltaRow = Math.abs(row1 - row0);
  const deltaCol = Math.abs(col1 - col0);
  const stepRow = row0 < row1 ? 1 : -1;
  const stepCol = col0 < col1 ? 1 : -1;
  let error = deltaRow - deltaCol;

  while (true) {
    paintDisk(grid, row0, col0, thickness, painter);
    if (row0 === row1 && col0 === col1) {
      break;
    }

    const nextError = error * 2;
    if (nextError > -deltaCol) {
      error -= deltaCol;
      row0 += stepRow;
    }
    if (nextError < deltaRow) {
      error += deltaRow;
      col0 += stepCol;
    }
  }
}

function drawPolyline(grid, points, painter, thickness = 0) {
  for (let index = 1; index < points.length; index += 1) {
    drawLine(grid, points[index - 1], points[index], painter, thickness);
  }
}

function drawEllipseOutline(grid, centerRow, centerCol, radiusRow, radiusCol, painter, tolerance = 0.16) {
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[0].length; col += 1) {
      const normalized =
        ((row - centerRow) * (row - centerRow)) / (radiusRow * radiusRow) +
        ((col - centerCol) * (col - centerCol)) / (radiusCol * radiusCol);

      if (Math.abs(normalized - 1) <= tolerance) {
        painter(row, col);
      }
    }
  }
}

function carvePassages(grid, cells) {
  for (const [row, col] of cells) {
    if (inBounds(grid, row, col)) {
      grid[row][col] = [TileType.Plain, null, 0, false, 0];
    }
  }
}

function placeKings(grid, capitals) {
  capitals.forEach((capital, index) => {
    setTile(grid, capital.row, capital.col, TileType.King, {
      units: 1,
      priority: index,
      revealed: false,
    });
  });
}

function placeCities(grid, cities) {
  for (const city of cities) {
    setTile(grid, city.row, city.col, TileType.City, {
      units: city.units,
      revealed: city.revealed ?? false,
    });
  }
}

function buildChinaMap() {
  const grid = createGrid(40);

  const mountain = (row, col) => {
    if (grid[row][col][0] !== TileType.King && grid[row][col][0] !== TileType.City) {
      setTile(grid, row, col, TileType.Mountain);
    }
  };
  const swamp = (row, col, revealed = false) => {
    if (grid[row][col][0] !== TileType.King && grid[row][col][0] !== TileType.City) {
      setTile(grid, row, col, TileType.Swamp, { revealed });
    }
  };

  drawPolyline(
    grid,
    [
      [1, 6],
      [7, 4],
      [14, 6],
      [20, 5],
      [28, 6],
      [36, 8],
    ],
    mountain,
    1
  );
  drawPolyline(grid, [[17, 9], [18, 12], [19, 16], [19, 20]], mountain, 1);
  drawPolyline(grid, [[6, 24], [10, 26], [14, 27], [19, 28]], mountain, 1);
  drawPolyline(grid, [[25, 26], [29, 30], [34, 33]], mountain, 1);
  drawPolyline(grid, [[24, 5], [28, 8], [34, 10]], mountain, 1);

  drawPolyline(grid, [[7, 10], [9, 14], [10, 18], [12, 20], [12, 24], [13, 28]], (r, c) => swamp(r, c), 0);
  drawPolyline(grid, [[21, 11], [22, 16], [23, 21], [23, 26], [24, 32]], (r, c) => swamp(r, c), 0);
  drawPolyline(grid, [[29, 23], [31, 26], [33, 29]], (r, c) => swamp(r, c), 0);
  drawPolyline(grid, [[13, 28], [18, 28], [23, 29], [28, 29]], (r, c) => swamp(r, c, r === 18 || r === 23), 0);

  const capitals = [
    { name: '乌鲁木齐', row: 4, col: 4 },
    { name: '长安', row: 10, col: 12 },
    { name: '洛阳', row: 14, col: 18 },
    { name: '北京', row: 6, col: 29 },
    { name: '沈阳', row: 10, col: 34 },
    { name: '南京', row: 21, col: 28 },
    { name: '成都', row: 24, col: 10 },
    { name: '广州', row: 31, col: 28 },
  ];
  const cities = [
    { name: '兰州', row: 12, col: 9, units: 15 },
    { name: '太原', row: 11, col: 23, units: 15 },
    { name: '济南', row: 12, col: 30, units: 15 },
    { name: '武汉', row: 22, col: 20, units: 25, revealed: true },
    { name: '杭州', row: 22, col: 31, units: 15 },
    { name: '长沙', row: 26, col: 22, units: 15 },
    { name: '昆明', row: 29, col: 11, units: 15 },
    { name: '福州', row: 27, col: 33, units: 15 },
    { name: '重庆', row: 23, col: 13, units: 20 },
    { name: '开封', row: 15, col: 21, units: 20, revealed: true },
  ];

  placeCities(grid, cities);
  placeKings(grid, capitals);

  return {
    id: 'china-heartland-40x40-20260423',
    name: '九州山河 · 40x40',
    width: 40,
    height: 40,
    creator: 'jackie',
    description: [
      '中国题材大图，适配当前线上 40x40 限制。',
      `王都：${capitals.map((capital) => capital.name).join('、')}。`,
      '西部高山、华北山线与长江黄河水系共同塑造推进节奏；仅对少数中部战略锚点做了亮灯处理。',
      '推荐 4-8 人。',
    ].join('\n'),
    mapTilesData: grid,
  };
}

function buildWorldMap() {
  const grid = createGrid(40);

  const mountain = (row, col) => {
    if (grid[row][col][0] !== TileType.King && grid[row][col][0] !== TileType.City) {
      setTile(grid, row, col, TileType.Mountain);
    }
  };
  const swamp = (row, col, revealed = false) => {
    if (grid[row][col][0] !== TileType.King && grid[row][col][0] !== TileType.City) {
      setTile(grid, row, col, TileType.Swamp, { revealed });
    }
  };

  drawPolyline(grid, [[4, 4], [10, 6], [16, 7]], mountain, 1);
  drawPolyline(grid, [[22, 8], [30, 10], [36, 11]], mountain, 1);
  drawPolyline(grid, [[9, 19], [10, 21], [11, 24]], mountain, 0);
  drawPolyline(grid, [[17, 18], [18, 20], [19, 22]], mountain, 0);
  drawPolyline(grid, [[22, 24], [28, 24], [33, 23]], mountain, 0);
  drawPolyline(grid, [[12, 27], [13, 30], [13, 34]], mountain, 1);
  drawPolyline(grid, [[9, 37], [12, 38]], mountain, 0);
  drawPolyline(grid, [[27, 32], [32, 33], [35, 34]], mountain, 0);

  drawPolyline(grid, [[0, 14], [8, 15], [16, 16], [24, 15], [39, 16]], (r, c) => swamp(r, c), 1);
  drawPolyline(grid, [[18, 27], [24, 29], [30, 30], [35, 31]], (r, c) => swamp(r, c), 1);
  drawPolyline(grid, [[14, 19], [15, 21], [16, 23]], (r, c) => swamp(r, c, true), 0);
  drawPolyline(grid, [[18, 31], [22, 32], [25, 31]], (r, c) => swamp(r, c, r === 22), 0);

  const capitals = [
    { name: '纽约', row: 9, col: 7 },
    { name: '伦敦', row: 8, col: 18 },
    { name: '开罗', row: 16, col: 22 },
    { name: '德里', row: 16, col: 30 },
    { name: '北京', row: 8, col: 34 },
    { name: '圣保罗', row: 28, col: 13 },
    { name: '开普敦', row: 32, col: 22 },
    { name: '悉尼', row: 31, col: 34 },
  ];
  const cities = [
    { name: '墨西哥城', row: 16, col: 9, units: 15 },
    { name: '巴黎', row: 8, col: 20, units: 15 },
    { name: '莫斯科', row: 7, col: 26, units: 20 },
    { name: '伊斯坦布尔', row: 14, col: 24, units: 20, revealed: true },
    { name: '新加坡', row: 23, col: 31, units: 20, revealed: true },
    { name: '拉各斯', row: 22, col: 20, units: 15 },
    { name: '利马', row: 29, col: 8, units: 15 },
    { name: '东京', row: 10, col: 36, units: 15 },
    { name: '约翰内斯堡', row: 29, col: 23, units: 15 },
    { name: '巴拿马', row: 18, col: 12, units: 20, revealed: true },
  ];

  placeCities(grid, cities);
  placeKings(grid, capitals);

  return {
    id: 'world-frontiers-40x40-20260423',
    name: '寰宇列国 · 40x40',
    width: 40,
    height: 40,
    creator: 'jackie',
    description: [
      '世界题材大图，使用海洋航道型沼泽与大陆山脉来模拟跨洲推进。',
      `王都：${capitals.map((capital) => capital.name).join('、')}。`,
      '只对少数海峡与全球枢纽城市亮灯，默认仍保留较强战争迷雾。',
      '推荐 4-8 人。',
    ].join('\n'),
    mapTilesData: grid,
  };
}

function buildDoubleRingMap() {
  const grid = createGrid(40);

  const mountain = (row, col) => {
    if (grid[row][col][0] !== TileType.King && grid[row][col][0] !== TileType.City) {
      setTile(grid, row, col, TileType.Mountain);
    }
  };
  const swamp = (row, col, revealed = false) => {
    if (grid[row][col][0] !== TileType.King && grid[row][col][0] !== TileType.City) {
      setTile(grid, row, col, TileType.Swamp, { revealed });
    }
  };

  drawEllipseOutline(grid, 18, 11, 11, 8, mountain, 0.18);
  drawEllipseOutline(grid, 18, 28, 11, 8, mountain, 0.18);
  drawEllipseOutline(grid, 18, 11, 8, 5, (r, c) => swamp(r, c), 0.14);
  drawEllipseOutline(grid, 18, 28, 8, 5, (r, c) => swamp(r, c), 0.14);
  drawPolyline(grid, [[18, 14], [18, 25]], (r, c) => swamp(r, c, c === 19 || c === 20), 0);
  drawPolyline(grid, [[8, 19], [13, 19], [18, 19], [23, 19], [30, 19]], (r, c) => swamp(r, c, r === 18), 0);

  carvePassages(grid, [
    [10, 11], [26, 11], [18, 3], [18, 19],
    [10, 28], [26, 28], [18, 36], [18, 20],
    [14, 19], [22, 19],
  ]);

  const capitals = [
    { name: '北庭', row: 6, col: 12 },
    { name: '雾港', row: 12, col: 6 },
    { name: '西都', row: 28, col: 6 },
    { name: '炎城', row: 33, col: 13 },
    { name: '东都', row: 6, col: 27 },
    { name: '星坞', row: 12, col: 33 },
    { name: '南垣', row: 28, col: 33 },
    { name: '寒川', row: 33, col: 26 },
  ];
  const cities = [
    { name: '北门', row: 10, col: 11, units: 20, revealed: true },
    { name: '南门', row: 26, col: 11, units: 20, revealed: true },
    { name: '东门', row: 10, col: 28, units: 20, revealed: true },
    { name: '西门', row: 26, col: 28, units: 20, revealed: true },
    { name: '中枢', row: 18, col: 19, units: 35, revealed: true },
    { name: '左桥', row: 18, col: 15, units: 15 },
    { name: '右桥', row: 18, col: 24, units: 15 },
    { name: '北井', row: 14, col: 19, units: 15 },
    { name: '南井', row: 22, col: 19, units: 15 },
  ];

  placeCities(grid, cities);
  placeKings(grid, capitals);

  return {
    id: 'double-ring-basin-40x40-20260423',
    name: '双环群岛 · 40x40',
    width: 40,
    height: 40,
    creator: 'jackie',
    description: [
      '玩法向奇观地图，两座环形战区通过中轴与桥头连接。',
      `王都：${capitals.map((capital) => capital.name).join('、')}。`,
      '亮灯只留给四门与中央中枢，其他区域仍保留侦察价值。',
      '推荐 6-8 人。',
    ].join('\n'),
    mapTilesData: grid,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outdir = path.resolve(args.outdir ?? '/tmp/blockwar-map-presets');
  await mkdir(outdir, { recursive: true });

  const maps = [buildChinaMap(), buildWorldMap(), buildDoubleRingMap()];

  for (const map of maps) {
    const target = path.join(outdir, `${map.id}.json`);
    await writeFile(target, JSON.stringify(map, null, 2));
    console.log(target);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
