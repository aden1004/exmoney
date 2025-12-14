const { Pool } = require('pg');

// PostgreSQL 연결 풀 생성
// Render에서 제공하는 DATABASE_URL을 사용하거나 로컬 설정을 사용
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// 테이블 생성 (PostgreSQL 문법)
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        currency VARCHAR(10) NOT NULL,
        buy_date TEXT NOT NULL,
        buy_amount NUMERIC NOT NULL,
        buy_rate NUMERIC NOT NULL,
        buy_krw NUMERIC NOT NULL,
        sell_date TEXT,
        sell_rate NUMERIC,
        sell_krw NUMERIC,
        profit NUMERIC,
        memo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

// 연결 테스트 및 테이블 생성
pool.query(createTableQuery)
    .then(() => console.log('✅ PostgreSQL 테이블 준비 완료'))
    .catch(err => console.error('❌ 데이터베이스 연결/테이블 생성 실패:', err));

module.exports = pool;
