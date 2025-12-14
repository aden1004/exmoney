const express = require('express');
const router = express.Router();
const pool = require('../database');

// CSV 내보내기 (이 라우트를 먼저 정의해야 :id와 충돌하지 않음)
router.get('/export', async (req, res) => {
    const { currency } = req.query;
    let sql = 'SELECT * FROM transactions';
    let params = [];

    if (currency) {
        sql += ' WHERE currency = $1';
        params.push(currency.toUpperCase());
    }

    sql += ' ORDER BY buy_date DESC';

    try {
        const result = await pool.query(sql, params);
        const rows = result.rows;

        // CSV 헤더
        const headers = ['ID', '통화', '매수일', '매수외화', '매수환율', '매수원화', '매도일', '매도환율', '매도원화', '수익', '메모'];
        let csv = '\uFEFF' + headers.join(',') + '\n';

        // CSV 데이터
        rows.forEach(row => {
            csv += [
                row.id,
                row.currency,
                row.buy_date,
                row.buy_amount,
                row.buy_rate,
                row.buy_krw,
                row.sell_date || '',
                row.sell_rate || '',
                row.sell_krw || '',
                row.profit || '',
                (row.memo || '').replace(/,/g, ' ')  // 메모 내 콤마 처리
            ].join(',') + '\n';
        });

        const now = new Date();
        const dateStr = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=exchange_${currency || 'all'}_${dateStr}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('CSV 내보내기 에러:', err);
        res.status(500).json({ error: err.message });
    }
});

// 거래 목록 조회 (통화별 필터)
router.get('/', async (req, res) => {
    const { currency } = req.query;
    let sql = 'SELECT * FROM transactions';
    let params = [];

    if (currency) {
        sql += ' WHERE currency = $1';
        params.push(currency.toUpperCase());
    }

    sql += ' ORDER BY created_at DESC';

    try {
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error('거래 조회 에러:', err);
        res.status(500).json({ error: err.message });
    }
});

// 새 매수 등록
router.post('/', async (req, res) => {
    const { currency, buy_amount, buy_rate, memo } = req.body;

    if (!currency || !buy_amount || !buy_rate) {
        return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
    }

    const buy_date = new Date().toISOString().split('T')[0];
    const buy_krw = buy_amount * buy_rate;

    const sql = `
        INSERT INTO transactions (currency, buy_date, buy_amount, buy_rate, buy_krw, memo)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
    `;

    try {
        const result = await pool.query(sql, [currency.toUpperCase(), buy_date, buy_amount, buy_rate, buy_krw, memo || '']);
        res.json({
            id: result.rows[0].id,
            message: '매수가 등록되었습니다.'
        });
    } catch (err) {
        console.error('매수 등록 에러:', err);
        res.status(500).json({ error: err.message });
    }
});

// 매도 처리
router.put('/:id/sell', async (req, res) => {
    const { id } = req.params;
    const { sell_rate } = req.body;

    if (!sell_rate) {
        return res.status(400).json({ error: '매도 환율을 입력해주세요.' });
    }

    try {
        // 먼저 해당 거래 조회
        const checkResult = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: '거래를 찾을 수 없습니다.' });
        }

        const row = checkResult.rows[0];
        if (row.sell_date) {
            return res.status(400).json({ error: '이미 매도된 거래입니다.' });
        }

        const sell_date = new Date().toISOString().split('T')[0];
        const sell_krw = row.buy_amount * sell_rate;
        const profit = sell_krw - row.buy_krw;

        const sql = `
            UPDATE transactions 
            SET sell_date = $1, sell_rate = $2, sell_krw = $3, profit = $4
            WHERE id = $5
        `;

        await pool.query(sql, [sell_date, sell_rate, sell_krw, profit, id]);

        res.json({
            message: '매도가 완료되었습니다.',
            profit: profit
        });
    } catch (err) {
        console.error('매도 처리 에러:', err);
        res.status(500).json({ error: err.message });
    }
});

// 거래 삭제
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM transactions WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: '거래를 찾을 수 없습니다.' });
        }
        res.json({ message: '거래가 삭제되었습니다.' });
    } catch (err) {
        console.error('삭제 에러:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
