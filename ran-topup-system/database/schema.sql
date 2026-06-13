-- ============================================================
-- RAN TOP-UP SYSTEM - DATABASE SCHEMA
-- Premium Game Top-Up System
-- ============================================================

-- ============ CORE TABLES ============

-- Game Configuration (ตั้งค่าเกม)
CREATE TABLE GameConfig (
  ConfigID INT IDENTITY(1,1) PRIMARY KEY,
  GameName NVARCHAR(100) NOT NULL,
  GameCode NVARCHAR(50) NOT NULL UNIQUE,
  Currency NCHAR(3) DEFAULT 'THB',
  PointName NVARCHAR(50) DEFAULT 'Point',
  ExchangeRate DECIMAL(10,2) DEFAULT 1.0,
  LogoURL NVARCHAR(500),
  Status INT DEFAULT 1, -- 1=active, 0=inactive
  CreatedDate DATETIME DEFAULT GETDATE(),
  UpdatedDate DATETIME DEFAULT GETDATE()
);

-- Database Configuration (ตั้งค่า DB ของเกม)
CREATE TABLE DatabaseConfig (
  DBConfigID INT IDENTITY(1,1) PRIMARY KEY,
  ConfigID INT NOT NULL,
  DatabaseType NVARCHAR(20) NOT NULL, -- mssql, mysql, postgresql
  Host NVARCHAR(200) NOT NULL,
  Port INT DEFAULT 1433,
  DatabaseName NVARCHAR(100) NOT NULL,
  Username NVARCHAR(100) NOT NULL,
  Password NVARCHAR(200) NOT NULL, -- Encrypted
  Options NVARCHAR(MAX), -- JSON options
  FOREIGN KEY (ConfigID) REFERENCES GameConfig(ConfigID)
);

-- Column Mapping (Map คอลัมน์ระหว่างระบบกับเกม)
CREATE TABLE ColumnMapping (
  MappingID INT IDENTITY(1,1) PRIMARY KEY,
  ConfigID INT NOT NULL,
  Category NVARCHAR(50) NOT NULL, -- user, character, topup
  SystemField NVARCHAR(100) NOT NULL, -- ชื่อ field ในระบบ
  GameTable NVARCHAR(100) NOT NULL, -- ชื่อ table ในเกม
  GameColumn NVARCHAR(100) NOT NULL, -- ชื่อ column ในเกม
  Conditions NVARCHAR(500), -- เงื่อนไขเพิ่มเติม
  FOREIGN KEY (ConfigID) REFERENCES GameConfig(ConfigID)
);

-- ============ USER TABLES ============

-- Users (ผู้ใช้ระบบเติมเงิน)
CREATE TABLE Users (
  UserID INT IDENTITY(1,1) PRIMARY KEY,
  GameConfigID INT NOT NULL,
  GameUserID NVARCHAR(50) NOT NULL, -- ไอดีเกม
  GameUserName NVARCHAR(100), -- ชื่อ在游戏中
  Password NVARCHAR(200) NOT NULL, -- Hashed
  Email NVARCHAR(200),
  Phone NVARCHAR(20),
  PointBalance BIGINT DEFAULT 0,
  VotePointBalance BIGINT DEFAULT 0,
  Status INT DEFAULT 1, -- 1=active, 0=inactive, 2=banned
  LastLoginDate DATETIME,
  CreatedDate DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (GameConfigID) REFERENCES GameConfig(ConfigID),
  UNIQUE(GameConfigID, GameUserID)
);

-- Characters (ตัวละคร)
CREATE TABLE Characters (
  CharID INT IDENTITY(1,1) PRIMARY KEY,
  UserID INT NOT NULL,
  GameCharID NVARCHAR(50) NOT NULL,
  CharName NVARCHAR(100) NOT NULL,
  CharLevel INT DEFAULT 1,
  CharClass NVARCHAR(50),
  CharSchool NVARCHAR(50),
  Status INT DEFAULT 1,
  CreatedDate DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- ============ PACKAGE TABLES ============

-- Packages (แพ็กเกจเติมเงิน)
CREATE TABLE Packages (
  PackageID INT IDENTITY(1,1) PRIMARY KEY,
  ConfigID INT NOT NULL,
  PackageName NVARCHAR(100) NOT NULL,
  Price DECIMAL(10,2) NOT NULL,
  Point BIGINT NOT NULL,
  BonusPoint BIGINT DEFAULT 0,
  DiscountPercent DECIMAL(5,2) DEFAULT 0,
  PackageType INT DEFAULT 1, -- 1=normal, 2=promo, 3=vip
  SortOrder INT DEFAULT 0,
  Status INT DEFAULT 1,
  CreatedDate DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (ConfigID) REFERENCES GameConfig(ConfigID)
);

-- ============ ORDER TABLES ============

-- Orders (คำสั่งซื้อ)
CREATE TABLE Orders (
  OrderID INT IDENTITY(1,1) PRIMARY KEY,
  OrderNo NVARCHAR(30) NOT NULL UNIQUE,
  UserID INT NOT NULL,
  PackageID INT NOT NULL,
  Amount DECIMAL(10,2) NOT NULL,
  Point BIGINT NOT NULL,
  BonusPoint BIGINT DEFAULT 0,
  PaymentMethod NVARCHAR(50) NOT NULL,
  PaymentStatus INT DEFAULT 0, -- 0=pending, 1=paid, 2=failed, 3=refunded
  TransactionID NVARCHAR(100),
  QRCodeURL NVARCHAR(500),
  AgentID INT,
  Commission DECIMAL(10,2) DEFAULT 0,
  IP NVARCHAR(50),
  CreatedDate DATETIME DEFAULT GETDATE(),
  PaidDate DATETIME,
  ExpireDate DATETIME,
  FOREIGN KEY (UserID) REFERENCES Users(UserID),
  FOREIGN KEY (PackageID) REFERENCES Packages(PackageID)
);

-- Order Status History (ประวัติสถานะ)
CREATE TABLE OrderStatusHistory (
  HistoryID INT IDENTITY(1,1) PRIMARY KEY,
  OrderID INT NOT NULL,
  Status INT NOT NULL,
  Description NVARCHAR(500),
  CreatedDate DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
);

-- ============ PAYMENT TABLES ============

-- Payment Gateways (ตั้งค่า Payment Gateway)
CREATE TABLE PaymentGateways (
  GatewayID INT IDENTITY(1,1) PRIMARY KEY,
  GatewayName NVARCHAR(50) NOT NULL,
  GatewayType NVARCHAR(50) NOT NULL, -- promptpay, truemoney, bank, credit
  APIKey NVARCHAR(500),
  SecretKey NVARCHAR(500),
  MerchantID NVARCHAR(100),
  CallbackURL NVARCHAR(500),
  ConfigJSON NVARCHAR(MAX),
  Status INT DEFAULT 1,
  CreatedDate DATETIME DEFAULT GETDATE()
);

-- Transactions (ธุรกรรมการเงิน)
CREATE TABLE Transactions (
  TransactionID INT IDENTITY(1,1) PRIMARY KEY,
  OrderID INT NOT NULL,
  GatewayID INT,
  TransactionNo NVARCHAR(100),
  Amount DECIMAL(10,2) NOT NULL,
  Currency NCHAR(3) DEFAULT 'THB',
  Status INT DEFAULT 0, -- 0=pending, 1=success, 2=failed
  ResponseJSON NVARCHAR(MAX),
  CreatedDate DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
  FOREIGN KEY (GatewayID) REFERENCES PaymentGateways(GatewayID)
);

-- ============ AGENT TABLES ============

-- Agents (ตัวแทนขาย)
CREATE TABLE Agents (
  AgentID INT IDENTITY(1,1) PRIMARY KEY,
  AgentName NVARCHAR(100) NOT NULL,
  AgentCode NVARCHAR(50) NOT NULL UNIQUE,
  Password NVARCHAR(200) NOT NULL,
  Email NVARCHAR(200),
  Phone NVARCHAR(20),
  Balance DECIMAL(12,2) DEFAULT 0,
  CommissionRate DECIMAL(5,4) DEFAULT 0.0500,
  Status INT DEFAULT 1,
  CreatedDate DATETIME DEFAULT GETDATE(),
  LastLoginDate DATETIME
);

-- Agent Transactions (ธุรกรรม Agent)
CREATE TABLE AgentTransactions (
  AgentTransID INT IDENTITY(1,1) PRIMARY KEY,
  AgentID INT NOT NULL,
  OrderID INT,
  Type INT NOT NULL, -- 1=topup sale, 2=withdraw, 3=deposit, 4=commission
  Amount DECIMAL(12,2) NOT NULL,
  BalanceBefore DECIMAL(12,2),
  BalanceAfter DECIMAL(12,2),
  Description NVARCHAR(500),
  CreatedDate DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (AgentID) REFERENCES Agents(AgentID)
);

-- ============ PROMOTION TABLES ============

-- Promotions (โปรโมชั่น)
CREATE TABLE Promotions (
  PromoID INT IDENTITY(1,1) PRIMARY KEY,
  ConfigID INT NOT NULL,
  PromoName NVARCHAR(100) NOT NULL,
  Description NVARCHAR(500),
  DiscountType INT DEFAULT 1, -- 1=percent, 2=fixed
  DiscountValue DECIMAL(10,2),
  MinPurchase DECIMAL(10,2) DEFAULT 0,
  MaxDiscount DECIMAL(10,2),
  StartDate DATETIME NOT NULL,
  EndDate DATETIME NOT NULL,
  Status INT DEFAULT 1,
  CreatedDate DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (ConfigID) REFERENCES GameConfig(ConfigID)
);

-- Promo Usage (การใช้โปรโมชั่น)
CREATE TABLE PromoUsage (
  UsageID INT IDENTITY(1,1) PRIMARY KEY,
  PromoID INT NOT NULL,
  OrderID INT NOT NULL,
  UserID INT NOT NULL,
  DiscountAmount DECIMAL(10,2),
  UsedDate DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (PromoID) REFERENCES Promotions(PromoID),
  FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
);

-- ============ LOG TABLES ============

-- Activity Logs (บันทึกกิจกรรม)
CREATE TABLE ActivityLogs (
  LogID INT IDENTITY(1,1) PRIMARY KEY,
  UserID INT,
  AgentID INT,
  ActionType NVARCHAR(50) NOT NULL,
  Description NVARCHAR(1000),
  IPAddress NVARCHAR(50),
  CreatedDate DATETIME DEFAULT GETDATE()
);

-- TopUp Logs (บันทึกการเติมเงินเข้าเกม)
CREATE TABLE TopUpLogs (
  TopUpLogID INT IDENTITY(1,1) PRIMARY KEY,
  OrderID INT NOT NULL,
  UserID INT NOT NULL,
  GameUserID NVARCHAR(50),
  Point BIGINT NOT NULL,
  Status INT NOT NULL, -- 1=success, 0=failed
  ResponseFromGame NVARCHAR(MAX),
  CreatedDate DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
);

-- ============ INDEXES ============

CREATE INDEX IX_Orders_UserID ON Orders(UserID);
CREATE INDEX IX_Orders_OrderNo ON Orders(OrderNo);
CREATE INDEX IX_Orders_PaymentStatus ON Orders(PaymentStatus);
CREATE INDEX IX_Orders_CreatedDate ON Orders(CreatedDate);
CREATE INDEX IX_Transactions_OrderID ON Transactions(OrderID);
CREATE INDEX IX_AgentTransactions_AgentID ON AgentTransactions(AgentID);
CREATE INDEX IX_ActivityLogs_CreatedDate ON ActivityLogs(CreatedDate);
