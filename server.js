require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 라우터
const transactionsRouter = require('./routes/transactions');
const exchangeRouter = require('./routes/exchange');

app.use('/api/transactions', transactionsRouter);
app.use('/api/exchange', exchangeRouter);

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
