/**
 * =========================================================
 * 非食材耗材详情页
 * =========================================================
 */


/**
 * =========================================================
 * 非食材耗材合计 · 月份趋势图
 * =========================================================
 */

let consumableTrendChart = null;


/**
 * 趋势图取值
 *
 * 与页面顶部「非食材耗材合计」卡片同口径：
 * 取账面值 record.consumableExpense
 * （= TXT「非食材 耗材 支出本月」），
 * 明细列表本身不完整（列表求和 < 账面值），
 * 不能作为合计依据。
 */
function consumableTrendValue(record) {

    const value =
        Number(
            record.consumableExpense
            || record.otherExpense
        );


    return Number.isFinite(value)
        ? value
        : 0;

}


/**
 * 该月份是否有可用的耗材数据
 *
 * parseStoreTxt 对空文本 / 没有耗材段的 TXT
 * 也会返回对象（各项为 0），不过滤的话
 * 趋势图上会冒出一个 ¥0 的坑。
 */
function hasConsumableTrendData(record) {

    return consumableTrendValue(record) !== 0;

}


/**
 * 月份简称（跨年时非首年带年份前缀）
 */
function consumableMonthShort(
    month,
    firstYear
) {

    const [y, m] =
        month.split("-");

    const year =
        Number(y);


    if (
        firstYear !== null
        && year !== firstYear
    ) {

        return `${String(year).slice(-2)}年${Number(m)}月`;

    }


    return `${Number(m)}月`;

}


/**
 * 加载近12个月数据并渲染趋势图
 *
 * 用 loadStoreData 逐个读取，
 * 不经过 loadStoreMonthsData，
 * 避免覆盖全局 STORE_DATA。
 */
async function loadConsumableTrend(store) {

    console.log(
        "========== 加载耗材趋势 =========="
    );


    try {

        const months =
            getMonths(store);


        if (
            !months
            || months.length === 0
        ) {

            console.warn(
                "没有找到门店历史月份：",
                store
            );


            renderConsumableTrendChart(
                store,
                [],
                []
            );

            return;

        }


        const targetMonths =
            months
                .slice(0, 12)
                .sort();


        console.log(
            "趋势图读取月份：",
            targetMonths
        );


        const results =
            await Promise.all(
                targetMonths.map(
                    month =>
                        loadStoreData(
                            store,
                            month
                        )
                            .catch(
                                err => {

                                    console.warn(
                                        `加载 ${store}/${month} 失败：`,
                                        err.message
                                    );

                                    return null;

                                }
                            )
                )
            );


        const records =
            results.filter(
                r =>
                    r !== null
                    && hasConsumableTrendData(r)
            );


        if (records.length === 0) {

            renderConsumableTrendChart(
                store,
                [],
                []
            );

            return;

        }


        const firstYear =
            Number(
                records[0].month.split("-")[0]
            );


        const labels =
            records.map(
                r =>
                    consumableMonthShort(
                        r.month,
                        firstYear
                    )
            );


        const values =
            records.map(consumableTrendValue);


        renderConsumableTrendChart(
            store,
            labels,
            values
        );


    } catch (error) {

        console.error(
            "加载耗材趋势失败：",
            error
        );

    }

}


/**
 * 渲染趋势图
 */
function renderConsumableTrendChart(
    store,
    labels,
    values
) {

    const chartDom =
        document.getElementById(
            "consumableTrendChart"
        );


    if (!chartDom) {

        console.error(
            "找不到 consumableTrendChart"
        );

        return;

    }


    const subtitleElement =
        document.getElementById(
            "consumableTrendSubtitle"
        );


    if (subtitleElement) {

        subtitleElement.textContent =
            labels.length > 0
                ? `${store} · 近${labels.length}个月`
                : "暂无数据";

    }


    if (
        typeof echarts ===
        "undefined"
    ) {

        console.error(
            "ECharts 没有加载"
        );

        return;

    }


    if (consumableTrendChart) {

        consumableTrendChart.dispose();

        consumableTrendChart = null;

    }


    consumableTrendChart =
        echarts.init(
            chartDom
        );


    const avg =
        values.length > 0
            ? values.reduce(
                (sum, v) => sum + v,
                0
            ) / values.length
            : 0;


    const series = [

        {

            name:
                "非食材耗材合计",

            type:
                "line",

            smooth:
                true,

            symbol:
                "circle",

            symbolSize:
                6,

            data:
                values,

            lineStyle: {

                width: 3,

                color: "#3478f6"

            },

            itemStyle: {

                color: "#3478f6"

            },

            areaStyle: {

                color: "#3478f620"

            }

        }

    ];


    if (values.length > 1) {

        series.push({

            name:
                "均值",

            type:
                "line",

            symbol:
                "none",

            data:
                values.map(
                    () => avg
                ),

            lineStyle: {

                width: 1.5,

                color: "#ef233c",

                type: "dashed"

            },

            itemStyle: {

                color: "#ef233c"

            },

            tooltip: {

                show: false

            }

        });

    }


    consumableTrendChart.setOption({

        animationDuration: 500,

        grid: {

            left: 8,

            right: 12,

            top: 35,

            bottom: 20,

            containLabel: true

        },

        legend: {

            top: 0,

            left: "center",

            textStyle: {

                color: "#666",

                fontSize: 11

            }

        },

        tooltip: {

            trigger: "axis",

            formatter: function (params) {

                if (
                    !params
                    || params.length === 0
                ) {

                    return "";

                }


                const rows =
                    params.map(
                        item => {

                            const value =
                                Number(item.value) || 0;


                            return (
                                `${item.marker}${item.seriesName}：`
                                + `<strong>${formatSupplierMoney(value)}</strong>`
                            );

                        }
                    );


                return (
                    `${params[0].axisValue}<br>`
                    + rows.join("<br>")
                );

            }

        },

        xAxis: {

            type: "category",

            data: labels,

            boundaryGap: false,

            axisTick: {

                show: false

            },

            axisLine: {

                lineStyle: {

                    color: "#e5e8ec"

                }

            },

            axisLabel: {

                color: "#8a8f98",

                fontSize: 11

            }

        },

        yAxis: {

            type: "value",

            axisLine: {

                show: false

            },

            axisTick: {

                show: false

            },

            axisLabel: {

                color: "#8a8f98",

                fontSize: 11,

                formatter: function (value) {

                    return (
                        "¥"
                        + Number(value).toLocaleString(
                            "zh-CN"
                        )
                    );

                }

            },

            splitLine: {

                lineStyle: {

                    color: "#e5e8ec"

                }

            }

        },

        series:
            series

    });


    setTimeout(
        function () {

            if (consumableTrendChart) {

                consumableTrendChart.resize();

            }

        },
        50
    );

}


/**
 * 调整图表尺寸（由 app.js 的 resizeCharts 调用）
 */
function resizeConsumableDetailChart() {

    if (consumableTrendChart) {

        consumableTrendChart.resize();

    }

}


/**
 * =========================================================
 * 初始化
 * =========================================================
 */
function initConsumableDetailPage() {

    console.log(
        "========== 非食材耗材详情页初始化 =========="
    );


    /**
     * 当前门店
     *
     * 注意：currentStore 是 app.js 顶层
     * let 声明，不在 window 上，
     * 必须用裸名读取（与 month_detail.js
     * 的赋值方式对应）。
     */
    const store =
        (typeof currentStore !== "undefined"
            && currentStore) ||
        resolveStoreFromURL(
            "西乡店"
        );


    /**
     * 当前月份
     *
     * 同上：currentMonth 是 home.js
     * 顶层 let 声明，裸名读取。
     */
    const month =
        (typeof currentMonth !== "undefined"
            && currentMonth) ||
        new URLSearchParams(
            window.location.search
        ).get("month") ||
        getMonths(store)[0];


    console.log(
        "当前门店：",
        store
    );


    console.log(
        "当前月份：",
        month
    );


    /**
     * 顶部「非食材耗材合计 · 月份趋势」
     *
     * 自己加载近12个月，与当前月份记录无关，
     * 因此放在最前面且不阻塞下面的明细渲染。
     */
    loadConsumableTrend(store);


    /**
     * 从 STORE_DATA 查找数据
     */
    let record = null;


    if (
        Array.isArray(STORE_DATA)
    ) {

        record =
            STORE_DATA.find(
                item =>
                    item.store === store &&
                    item.month === month
            );

    }


    if (!record) {

        console.error(
            "没有找到当前门店月份数据：",
            store,
            month
        );

        return;

    }


    const details =
        record.consumableDetails || [];


    /**
     * 页面标题
     */
    const subtitle =
        document.getElementById(
            "consumableDetailSubtitle"
        );


    if (subtitle) {

        subtitle.textContent =
            `${store} · ${month.replace("-", "年")}月`;

    }


    /**
     * =====================================================
     * 合计金额
     * =====================================================
     *
     * 取账面值 record.consumableExpense
     * （= TXT「非食材 耗材 支出本月」），
     * 与首页 / 月结详情页顶部的「非食材耗材」卡片完全一致。
     *
     * 【为什么不累加列表】
     *
     * 明细列表本身是**不完整**的：
     * 全量核对 5 店 × 8 月共 40 个文件，35 个文件的
     * 列表求和都小于账面值（少 25 ~ 696 元，最大差
     * 出现在西乡店 2026-03，差 696.28）。
     * 若按列表求和展示，详情页合计会比首页少一截，
     * 看起来像是数据出错，实际是列表缺失。
     *
     * 列表仍照常逐条展示，只作为明细参考。
     * 这里与 supplier_detail.js 的
     * foodTotal / nonFoodTotal 取值方式保持一致 ——
     * 同样取账面小计，而非累加列表。
     *
     * otherExpense 是历史字段（data.js 里与
     * consumableExpense 同源），仅作降级兜底。
     */
    const total =
        Number(
            record.consumableExpense
            || record.otherExpense
            || 0
        );


    const totalElement =
        document.getElementById(
            "consumableDetailTotal"
        );


    if (totalElement) {

        totalElement.textContent =
            formatSupplierMoney(total);

    }


    /**
     * 明细列表
     */
    renderConsumableList(
        details
    );


    /**
     * 返回按钮
     * 注：返回按钮的渲染与点击由 PageHeader 组件统一处理，
     * 默认行为即 history.back() → loadPage("home")，
     * 故此处不再单独绑定。
     */

}


/**
 * =========================================================
 * 渲染耗材列表
 * =========================================================
 */
function renderConsumableList(
    list
) {

    const container =
        document.getElementById(
            "consumableDetailList"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    if (
        !list ||
        list.length === 0
    ) {

        container.innerHTML = `

            <div class="supplier-empty">
                暂无耗材数据
            </div>

        `;

        return;

    }


    list.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "supplier-row";


            row.innerHTML = `

                <div class="supplier-index">
                    ${index + 1}
                </div>

                <div
                    class="supplier-name"
                    style="display:flex;flex-direction:column;"
                >

                    <span>
                        ${escapeHtml(item.name)}
                    </span>

                    <span
                        style="
                            margin-top:3px;
                            color:#999;
                            font-size:11px;
                        "
                    >
                        ${escapeHtml(item.date)}
                    </span>

                </div>

                <div class="supplier-amount">
                    ${formatSupplierMoney(item.amount)}
                </div>

            `;


            container.appendChild(
                row
            );

        }
    );

}