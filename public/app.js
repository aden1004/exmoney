// 공통 API 함수들
const API = {
    // 환율 조회
    async getRates() {
        try {
            const res = await fetch('/api/exchange/rates');
            if (!res.ok) throw new Error('환율 조회 실패');
            return res.json();
        } catch (err) {
            console.error('getRates 에러:', err);
            return { success: false, error: err.message };
        }
    },

    // 거래 목록 조회
    async getTransactions(currency) {
        try {
            const res = await fetch(`/api/transactions?currency=${currency}`);
            if (!res.ok) throw new Error('거래 조회 실패');
            return res.json();
        } catch (err) {
            console.error('getTransactions 에러:', err);
            return [];
        }
    },

    // 매수 등록
    async addTransaction(data) {
        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || '매수 등록 실패');
            }
            return res.json();
        } catch (err) {
            console.error('addTransaction 에러:', err);
            throw err;
        }
    },

    // 매도 처리
    async sellTransaction(id, sell_rate) {
        try {
            const res = await fetch(`/api/transactions/${id}/sell`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sell_rate })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || '매도 처리 실패');
            }
            return res.json();
        } catch (err) {
            console.error('sellTransaction 에러:', err);
            throw err;
        }
    },

    // 거래 삭제
    async deleteTransaction(id) {
        try {
            const res = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || '삭제 실패');
            }
            return res.json();
        } catch (err) {
            console.error('deleteTransaction 에러:', err);
            throw err;
        }
    },

    // CSV 다운로드
    exportCSV(currency) {
        window.open(`/api/transactions/export?currency=${currency}`, '_blank');
    }
};

// 유틸리티 함수
const Utils = {
    // 숫자 포맷
    formatNumber(num, decimals = 0) {
        if (num === null || num === undefined) return '-';
        return Number(num).toLocaleString('ko-KR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    // 통화 기호
    getCurrencySymbol(currency) {
        const symbols = { USD: '$', JPY: '¥', EUR: '€' };
        return symbols[currency] || '';
    },

    // 날짜 포맷
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    },

    // 시간 포맷 (HH:MM:SS)
    formatTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ko-KR', { hour12: false });
    },

    // 토스트 표시
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.className = `toast ${type} show`;
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }
};

// 통화별 페이지 초기화
function initCurrencyPage(currency) {
    let currentRate = 0;

    // 환율 조회
    async function loadRate() {
        try {
            const data = await API.getRates();
            console.log('환율 데이터:', data);
            if (data.success && data.rates) {
                currentRate = data.rates[currency];
                const rateEl = document.getElementById('currentRate');
                const timeEl = document.getElementById('rateTime');

                if (rateEl && currentRate) {
                    // 엔화는 100엔 기준으로 표시
                    const displayRate = currency === 'JPY' ? currentRate * 100 : currentRate;
                    rateEl.textContent = '₩' + Utils.formatNumber(displayRate, 2);

                    // 조회 시각 표시
                    if (timeEl && data.timestamp) {
                        timeEl.textContent = `(${Utils.formatTime(data.timestamp)} 기준)`;
                    }

                    // 매수 환율 입력창이 비어있으면 자동 입력
                    const rateInput = document.getElementById('buyRate');
                    if (rateInput && !rateInput.value) {
                        rateInput.value = displayRate.toFixed(2);
                    }
                } else if (rateEl) {
                    rateEl.textContent = '조회 실패';
                }
            } else {
                console.error('환율 조회 실패:', data);
                const rateEl = document.getElementById('currentRate');
                if (rateEl) rateEl.textContent = '조회 실패';
            }
        } catch (err) {
            console.error('환율 조회 에러:', err);
        }
    }

    // 거래 목록 로드
    async function loadTransactions() {
        try {
            const transactions = await API.getTransactions(currency);
            console.log('거래 목록:', transactions);
            renderTransactions(transactions);
        } catch (err) {
            console.error('거래 목록 조회 실패:', err);
        }
    }

    // 거래 목록 렌더링
    function renderTransactions(transactions) {
        const tbody = document.getElementById('transactionList');
        if (!tbody) return;

        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <div class="icon">📭</div>
                        <p>아직 거래 기록이 없습니다</p>
                    </td>
                </tr>
            `;
            return;
        }

        const symbol = Utils.getCurrencySymbol(currency);

        tbody.innerHTML = transactions.map(t => {
            const isSold = t.sell_date !== null;
            const status = isSold
                ? '<span class="status sold">매도완료</span>'
                : '<span class="status holding">보유중</span>';

            const profitClass = t.profit > 0 ? 'profit-positive' : (t.profit < 0 ? 'profit-negative' : '');
            const profitText = t.profit !== null
                ? `<span class="${profitClass}">${t.profit > 0 ? '+' : ''}${Utils.formatNumber(t.profit)}원</span>`
                : '-';

            // 엔화는 100엔 기준 환율로 표시
            const displayBuyRate = currency === 'JPY' ? (t.buy_rate * 100) : t.buy_rate;
            const displaySellRate = t.sell_rate ? (currency === 'JPY' ? (t.sell_rate * 100) : t.sell_rate) : null;

            const sellBtn = isSold
                ? ''
                : `<button class="btn btn-success btn-small" data-action="sell" data-id="${t.id}" data-amount="${t.buy_amount}">매도</button>`;

            const deleteBtn = `<button class="btn btn-danger btn-small" data-action="delete" data-id="${t.id}">삭제</button>`;

            return `
                <tr>
                    <td>${t.id}</td>
                    <td>${Utils.formatDate(t.buy_date)}</td>
                    <td>${symbol}${Utils.formatNumber(t.buy_amount, currency === 'JPY' ? 0 : 2)}</td>
                    <td>${Utils.formatNumber(displayBuyRate, 2)}</td>
                    <td>${Utils.formatNumber(t.buy_krw)}원</td>
                    <td>${displaySellRate ? Utils.formatNumber(displaySellRate, 2) : '-'}</td>
                    <td>${profitText}</td>
                    <td>${status}</td>
                    <td class="action-buttons">${sellBtn} ${deleteBtn}</td>
                </tr>
            `;
        }).join('');

        // 이벤트 위임으로 버튼 이벤트 처리
        tbody.querySelectorAll('[data-action="sell"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const amount = btn.getAttribute('data-amount');
                openSellModal(id, amount);
            });
        });

        tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                handleDelete(id);
            });
        });
    }

    // 현재 환율 적용 버튼
    window.applyCurrentRate = function () {
        const rateInput = document.getElementById('buyRate');
        if (rateInput && currentRate) {
            // 엔화는 100엔 기준으로 입력
            rateInput.value = currency === 'JPY' ? (currentRate * 100).toFixed(2) : currentRate.toFixed(2);
        }
    };

    // 매수 등록
    window.submitBuy = async function (e) {
        e.preventDefault();

        const amount = parseFloat(document.getElementById('buyAmount').value);
        const rate = parseFloat(document.getElementById('buyRate').value);
        const memo = document.getElementById('buyMemo').value;

        if (!amount || !rate) {
            Utils.showToast('금액과 환율을 입력해주세요', 'error');
            return;
        }

        // 엔화는 100엔 기준 환율을 1엔 기준으로 변환
        const actualRate = currency === 'JPY' ? rate / 100 : rate;

        try {
            await API.addTransaction({
                currency,
                buy_amount: amount,
                buy_rate: actualRate,
                memo
            });

            Utils.showToast('매수가 등록되었습니다');
            document.getElementById('buyForm').reset();
            // 등록 후 현재 환율 다시 세팅
            applyCurrentRate();
            loadTransactions();
        } catch (err) {
            Utils.showToast(err.message || '매수 등록 실패', 'error');
        }
    };

    // 매도 모달 열기
    function openSellModal(id, amount) {
        const modal = document.getElementById('sellModal');
        document.getElementById('sellTransactionId').value = id;
        document.getElementById('sellAmount').textContent = Utils.getCurrencySymbol(currency) + Utils.formatNumber(parseFloat(amount), currency === 'JPY' ? 0 : 2);
        document.getElementById('sellRate').value = currentRate ? (currency === 'JPY' ? (currentRate * 100).toFixed(2) : currentRate.toFixed(2)) : '';
        modal.classList.add('active');
    }

    // 매도 모달 닫기
    window.closeSellModal = function () {
        document.getElementById('sellModal').classList.remove('active');
    };

    // 매도 처리
    window.submitSell = async function () {
        const id = document.getElementById('sellTransactionId').value;
        const rate = parseFloat(document.getElementById('sellRate').value);

        if (!rate) {
            Utils.showToast('매도 환율을 입력해주세요', 'error');
            return;
        }

        // 엔화는 100엔 기준 환율을 1엔 기준으로 변환
        const actualRate = currency === 'JPY' ? rate / 100 : rate;

        try {
            const result = await API.sellTransaction(id, actualRate);
            Utils.showToast(`매도 완료! 수익: ${Utils.formatNumber(result.profit)}원`);
            closeSellModal();
            loadTransactions();
        } catch (err) {
            Utils.showToast(err.message || '매도 처리 실패', 'error');
        }
    };

    // 거래 삭제 (모달 열기)
    function handleDelete(id) {
        const modal = document.getElementById('deleteModal');
        document.getElementById('deleteTransactionId').value = id;
        modal.classList.add('active');
    }

    // 삭제 모달 닫기
    window.closeDeleteModal = function () {
        document.getElementById('deleteModal').classList.remove('active');
    };

    // 삭제 확정
    window.confirmDelete = async function () {
        const id = document.getElementById('deleteTransactionId').value;
        try {
            await API.deleteTransaction(id);
            Utils.showToast('거래가 삭제되었습니다');
            closeDeleteModal();
            loadTransactions();
        } catch (err) {
            Utils.showToast(err.message || '삭제 실패', 'error');
            closeDeleteModal();
        }
    };

    // CSV 내보내기
    window.exportCSV = function () {
        API.exportCSV(currency);
    };

    // 환율 새로고침
    window.refreshRate = loadRate;

    // 초기 로드
    loadRate();
    loadTransactions();

    // 30초마다 환율 업데이트
    setInterval(loadRate, 30000);
}
