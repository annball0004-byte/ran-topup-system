// Default Game Configurations
// ค่าเริ่มต้นสำหรับแต่ละเกม - แก้ไขได้ผ่าน UI โดยไม่ต้องแก้โค้ด

export interface GameConfig {
  gameCode: string;
  gameName: string;
  database: DatabaseConfig;
  columnMapping: ColumnMapping;
  pointExchange: PointExchange;
  features: GameFeatures;
}

export interface DatabaseConfig {
  type: 'mssql' | 'mysql' | 'postgresql';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface ColumnMapping {
  // User mapping
  user: {
    table: string;
    id: string;
    username: string;
    password?: string;
    passwordType?: 'plaintext' | 'md5' | 'sha256' | 'bcrypt';
    email?: string;
    phone?: string;
    pointBalance?: string;
    votePointBalance?: string;
    status?: string;
    conditions?: string;
  };
  // Character mapping
  character: {
    table: string;
    id: string;
    userId: string;
    name: string;
    level?: string;
    class?: string;
    classNameMap?: Record<number, string>;
    school?: string;
    schoolMap?: Record<number, string>;
    status?: string;
    conditions?: string;
  };
  // TopUp transaction mapping
  topup: {
    table: string;
    id?: string;
    userId: string;
    amount: string;
    point: string;
    date?: string;
    conditions?: string;
  };
}

export interface PointExchange {
  rate: number; // 1 THB = X Points
  minTopup: number;
  maxTopup: number;
  currencies: string[];
}

export interface GameFeatures {
  hasGuild: boolean;
  hasPet: boolean;
  hasVehicle: boolean;
  hasExtreme: boolean;
  hasAssassin: boolean;
  hasGunner: boolean;
  maxLevel: number;
  classes: string[];
}

// ============ DEFAULT CONFIGURATIONS ============

export const DEFAULT_CONFIGS: Record<string, GameConfig> = {
  'ran-online': {
    gameCode: 'ran-online',
    gameName: 'RAN Online',
    database: {
      type: 'mssql',
      host: 'localhost',
      port: 1433,
      database: 'RanGame1',
      user: 'sa',
      password: ''
    },
    columnMapping: {
      user: {
        table: 'UserInfo',
        id: 'UserID',
        username: 'UserID',
        pointBalance: 'Point',
        votePointBalance: 'VotePoint',
        status: 'Status',
        conditions: 'Status = 1'
      },
      character: {
        table: 'ChaInfo',
        id: 'ChaGUID',
        userId: 'UsrUID',
        name: 'ChaName',
        level: 'ChaLevel',
        class: 'ChaClass',
        classNameMap: {
          1: 'Brawler',
          2: 'Knight',
          4: 'Archer',
          8: 'Shaman',
          16: 'Extreme Brawler',
          32: 'Extreme Knight',
          64: 'Gunner',
          128: 'Assassin',
          256: 'Pritti'
        },
        school: 'ChaSchool',
        schoolMap: {
          1: 'Scrappers',
          2: 'Shadows',
          4: 'Nova'
        },
        status: 'Status',
        conditions: 'DelFlag = 0'
      },
      topup: {
        table: 'TopUp',
        id: 'TopUpGUID',
        userId: 'UsrUID',
        amount: 'Amount',
        point: 'Point',
        date: 'TopUpDate',
        conditions: 'Status = 1'
      }
    },
    pointExchange: {
      rate: 10, // 1 THB = 10 Points
      minTopup: 1,
      maxTopup: 10000,
      currencies: ['THB']
    },
    features: {
      hasGuild: true,
      hasPet: true,
      hasVehicle: true,
      hasExtreme: true,
      hasAssassin: true,
      hasGunner: true,
      maxLevel: 120,
      classes: ['Brawler', 'Knight', 'Archer', 'Shaman', 'Gunner', 'Assassin', 'Pritti']
    }
  },
  'ran-mars': {
    gameCode: 'ran-mars',
    gameName: 'RAN Mars',
    database: {
      type: 'mssql',
      host: 'localhost',
      port: 1433,
      database: 'RanGame1',
      user: 'sa',
      password: ''
    },
    columnMapping: {
      user: {
        table: 'UserInfo',
        id: 'UserID',
        username: 'UserID',
        pointBalance: 'Point',
        status: 'Status'
      },
      character: {
        table: 'ChaInfo',
        id: 'ChaGUID',
        userId: 'UsrUID',
        name: 'ChaName',
        level: 'ChaLevel',
        class: 'ChaClass',
        status: 'Status',
        conditions: 'DelFlag = 0'
      },
      topup: {
        table: 'TopUp',
        userId: 'UsrUID',
        amount: 'Amount',
        point: 'Point'
      }
    },
    pointExchange: {
      rate: 10,
      minTopup: 1,
      maxTopup: 10000,
      currencies: ['THB']
    },
    features: {
      hasGuild: true,
      hasPet: true,
      hasVehicle: true,
      hasExtreme: false,
      hasAssassin: false,
      hasGunner: false,
      maxLevel: 100,
      classes: ['Brawler', 'Knight', 'Archer', 'Shaman']
    }
  }
};

export default DEFAULT_CONFIGS;
