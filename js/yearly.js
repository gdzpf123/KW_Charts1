/**
 * =========================================================
 * 年度总结页
 * =========================================================
 *
 * 展示本年度所有月份的累计值，以及逐月的
 * 经营实收 / 净利润 / 净利率 / 毛利率。
 *
 * 口径（2026-10-10 与用户确认）：
 * - 总经营实收    = Σ 经营实收（TXT「经营实收本月」）
 * - 总所有成本支出 = Σ 全部成本 = Σ(经营实收 − 净利润)
 * - 总利润        = Σ 净利润（= 经营实收 − 全部成本）
 * - 年度净利润    = Σ 净利润
 *
 * 因此「总利润」与「年度净利润」数值相同。
 * =========================================================
 */


/**
 * 金额格式化（整数，四舍五入）
 */
function formatYearlyMoney(value) {

    const number =
        Number(value) || 0;


    return (
        "¥"
        + Math.round(number).toLocaleString(
            "zh-CN"
        )
    );

}


/**
 * 百分比格式化（保留两位小数，缺失显示 —）
 */
function formatYearlyPercent(value) {

    if (
        value === null
        || value === undefined
        || !isFinite(Number(value))
    ) {

        return "—";

    }


    return (
        Number(value).toFixed(2)
        + "%"
    );

}


/**
 * 月度净利率：优先 TXT「净利率」，缺失时按 净利润/经营实收 推算
 */
function yearlyNetMargin(record) {

    const margin =
        record.netMargin;


    if (
        margin !== null
        && margin !== undefined
        && isFinite(Number(margin))
    ) {

        return Number(margin);

    }


    const income =
        Number(record.operatingIncome) || 0;


    const profit =
        Number(record.netProfit) || 0;


    return income > 0
        ? (profit / income) * 100
        : null;

}


/**
 * 渲染年度累计 KPI
 */
function renderYearlyKpis(
    totalIncome,
    totalCost,
    totalProfit,
    totalNet,
    totalNetMargin
) {

    const container =
        document.getElementById(
            "yearlyKpis"
        );


    if (!container) {

        return;

    }


    const cards = [

        {
            label: "总经营实收",
            value: totalIncome,
            accent: false
        },

        {
            label: "总所有成本支出",
            value: totalCost,
            accent: false
        },

        {
            label: "总利润",
            value: totalProfit,
            accent: false
        },

        {
            label: "年度净利润",
            value: totalNet,
            accent: true
        },

        {
            label: "总净利率",
            value: totalNetMargin,
            accent: false,
            percent: true
        }

    ];


    container.innerHTML =
        cards.map(
            card => `
                <div class="yearly-kpi">
                    <div class="yearly-kpi-label">
                        ${card.label}
                    </div>
                    <div class="yearly-kpi-value"
                         ${card.accent ? 'style="color:var(--accent)"' : ""}>
                        ${card.percent
                            ? formatYearlyPercent(card.value)
                            : formatYearlyMoney(card.value)}
                    </div>
                </div>
            `
        )
            .join("");

}


/**
 * 渲染每月明细 List
 */
function renderYearlyList(records) {

    const container =
        document.getElementById(
            "yearlyTable"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    if (!records || records.length === 0) {

        container.innerHTML = `
            <div class="supplier-empty">
                暂无数据
            </div>
        `;

        return;

    }


    records.forEach(
        record => {

            const income =
                Number(record.operatingIncome) || 0;


            const profit =
                Number(record.netProfit) || 0;


            const netMargin =
                yearlyNetMargin(record);


            const grossMargin =
                record.grossMargin;


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "yearly-row";


            row.innerHTML = `
                <div class="yearly-month">
                    ${Number(record.month.split("-")[1])}月
                </div>
                <div class="yearly-cell">
                    ${formatYearlyMoney(income)}
                </div>
                <div class="yearly-cell">
                    ${formatYearlyMoney(profit)}
                </div>
                <div class="yearly-cell">
                    ${formatYearlyPercent(netMargin)}
                </div>
                <div class="yearly-cell">
                    ${formatYearlyPercent(grossMargin)}
                </div>
            `;


            container.appendChild(
                row
            );

        }
    );

}


/**
 * =========================================================
 * 初始化页面
 * =========================================================
 */
async function initYearlyPage() {

    console.log(
        "========== 年度总结页初始化 =========="
    );


    /**
     * 当前门店
     */
    const store =
        (typeof currentStore !== "undefined"
            && currentStore) ||
        resolveStoreFromURL(
            "西乡店"
        );


    /**
     * 当前年份（以当前月份所在年份为准）
     */
    const allMonths =
        getMonths(store);


    const refMonth =
        (typeof currentMonth !== "undefined"
            && currentMonth) ||
        allMonths[0];


    const year =
        refMonth
            ? refMonth.split("-")[0]
            : null;


    const yearMonths =
        (allMonths || [])
            .filter(
                m => m.startsWith(year)
            )
            .sort();


    console.log(
        "门店：",
        store,
        " 年份：",
        year,
        " 月份：",
        yearMonths
    );


    /**
     * 副标题
     */
    const subtitle =
        document.getElementById(
            "yearlySubtitle"
        );


    if (subtitle) {

        subtitle.textContent =
            `${store} · ${year}年`;

    }


    const listSubtitle =
        document.getElementById(
            "yearlyListSubtitle"
        );


    if (listSubtitle) {

        listSubtitle.textContent =
            `${year}年 · 累计 ${yearMonths.length} 个月`;

    }


    /**
     * 加载全年数据
     */
    const results =
        await Promise.all(
            yearMonths.map(
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
            r => r !== null
        );


    /**
     * 累计
     */
    let totalIncome = 0;
    let totalCost = 0;
    let totalProfit = 0;


    records.forEach(
        record => {

            const income =
                Number(record.operatingIncome) || 0;


            const profit =
                Number(record.netProfit) || 0;


            totalIncome += income;
            totalProfit += profit;
            totalCost += (income - profit);

        }
    );


    /**
     * 总净利率 = 年度净利润 / 总经营实收
     */
    const totalNetMargin =
        totalIncome > 0
            ? (totalProfit / totalIncome) * 100
            : null;


    renderYearlyKpis(
        totalIncome,
        totalCost,
        totalProfit,
        totalProfit,
        totalNetMargin
    );


    renderYearlyList(
        records
    );

}
