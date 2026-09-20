/**
 * ==============================
 * 历史月结
 * ==============================
 */

async function initHistoryPage() {

    console.log(
        "========== 历史月结初始化 =========="
    );

    await ensureHistoryDataLoaded();

    renderHistory();

    bindHistoryItemClicks();

}


/**
 * ==============================
 * 加载当前门店近几个月的历史数据
 * ==============================
 *
 * 历史月结页只展示「当前门店（currentStore）」
 * 近几个月的月结数据，所以这里只加载当前
 * 门店的月份组合，加载失败的月份跳过，完
 * 成后写入 STORE_DATA，renderHistory() 才
 * 能看到列表。
 *
 * 缓存按门店分桶：
 *
 * window.__historyCache = { [store]: records[] }
 *
 * 切回历史页或切换门店再次进入历史页时，
 * 直接命中缓存，不再重复请求。
 * ==============================
 */
async function ensureHistoryDataLoaded() {

    if (!window.__historyCache) {

        window.__historyCache = {};

    }


    /**
     * 没有当前门店时直接返回，避免污染 STORE_DATA
     */

    if (!currentStore) {

        return;

    }


    /**
     * 命中缓存 → 还原 STORE_DATA 后返回
     */

    if (window.__historyCache[currentStore]) {

        STORE_DATA =
            window.__historyCache[currentStore];

        return;

    }


    if (
        typeof getMonths !== "function"
        || typeof loadStoreData !== "function"
    ) {

        return;

    }


    const months =
        getMonths(currentStore) || [];


    const tasks =
        months.map(month =>

            loadStoreData(
                currentStore,
                month
            )
                .catch(
                    err => {

                        console.warn(
                            `跳过 ${currentStore}/${month}:`,
                            err.message
                        );

                        return null;

                    }
                )

        );


    const results =
        await Promise.all(tasks);


    const records =
        results.filter(
            r => r !== null
        );


    STORE_DATA =
        records;


    /**
     * 写入缓存，下一次进入直接复用
     */

    window.__historyCache[currentStore] =
        records;

}


/**
 * ==============================
 * 绑定历史 Item 点击跳转
 * ==============================
 */
function bindHistoryItemClicks() {

    const list =
        document.getElementById(
            "historyList"
        );

    if (!list) {

        return;

    }


    const items =
        list.querySelectorAll(
            ".history-item"
        );


    items.forEach(item => {

        item.addEventListener(
            "click",
            function () {

                const store =
                    item.dataset.store;

                const month =
                    item.dataset.month;


                if (!store || !month) {

                    return;

                }


                /**
                 * 暂存跳转参数，
                 * month_detail.js 在 init 时读取
                 */
                window.__pendingMonthDetail = {

                    store,
                    month

                };


                if (typeof loadPage === "function") {

                    loadPage(
                        "month_detail"
                    );

                }

            }
        );

    });

}


/**
 * ==============================
 * 金额格式化
 * ==============================
 */

function historyMoney(value) {

    return "¥" +
        Number(value || 0)
            .toLocaleString("zh-CN", {

                minimumFractionDigits: 0,

                maximumFractionDigits: 0

            });

}


/**
 * ==============================
 * 月份格式化
 * ==============================
 */

function historyMonthText(month) {

    const [y, m] =
        month.split("-");


    return `${y}年${Number(m)}月`;

}


/**
 * ==============================
 * 历史月结
 * ==============================
 */

function renderHistory() {

    const historyList =
        document.getElementById(
            "historyList"
        );


    if (!historyList) {

        return;

    }


    const records =
        [...STORE_DATA]
            .sort(
                (a, b) =>
                    b.month.localeCompare(
                        a.month
                    )
            );


    historyList.innerHTML =
        records
            .map(
                record => `

                    <div
                        class="history-item"
                        data-store="${record.store}"
                        data-month="${record.month}"
                    >

                        <div class="history-head">

                            <div class="history-month">

                                ${historyMonthText(
                                    record.month
                                )}

                            </div>


                            <div class="history-store">

                                ${record.store}

                            </div>

                        </div>


                        <div class="history-values">

                            <div class="history-value">

                                <span>
                                    营业收入
                                </span>

                                <strong>
                                    ${historyMoney(
                                        record.revenue
                                    )}
                                </strong>

                            </div>


                            <div class="history-value">

                                <span>
                                    毛利率
                                </span>

                                <strong>
                                    ${Number(
                                        record.grossMargin || 0
                                    ).toFixed(2)}%
                                </strong>

                            </div>


                            <div class="history-value">

                                <span>
                                    净利率
                                </span>

                                <strong>
                                    ${Number(
                                        record.netMargin || 0
                                    ).toFixed(2)}%
                                </strong>

                            </div>


                            <div class="history-value">

                                <span>
                                    净利润
                                </span>

                                <strong>
                                    ${historyMoney(
                                        record.netProfit
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div
                            class="history-arrow"
                            aria-hidden="true"
                        >
                            ›
                        </div>

                    </div>

                `
            )
            .join("");

}