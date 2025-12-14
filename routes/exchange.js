const express = require('express');
const router = express.Router();

// 실시간 환율 조회 (api.manana.kr 프록시)
router.get('/rates', async (req, res) => {
    try {
        const response = await fetch('https://api.manana.kr/exchange/rate/KRW/USD,JPY,EUR.json');

        if (!response.ok) {
            throw new Error('환율 API 호출 실패');
        }

        const data = await response.json();

        // 응답 형식 변환 (name이 USDKRW=X 형식임)
        const rates = {};
        data.forEach(item => {
            if (item.name === 'USDKRW=X') rates.USD = item.rate;
            if (item.name === 'JPYKRW=X') rates.JPY = item.rate;
            if (item.name === 'EURKRW=X') rates.EUR = item.rate;
        });

        res.json({
            success: true,
            rates: rates,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('환율 조회 에러:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
