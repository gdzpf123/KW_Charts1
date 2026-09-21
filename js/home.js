/**

* =========================================================
* 首页 Home
* =========================================================
* 门店通过 URL 指定：
* index.html?store=西乡店
* 例如：
* index.html?store=碧海湾店
* 首页不再提供门店切换功能。

*/

/**

 * ==============================

 * DOM 快捷方法

 * ==============================

 */

const $ = (id) => {

    return document.getElementById(id);

};


/**

* =========================================================
* 当前月份
* =========================================================
    */

let currentMonth = "";

/**

* =========================================================
* 首页图表
* =========================================================
    */

let homeCharts = {};


/**
 * 营业收入构成饼图的窄屏断点状态
 *
 * null = 尚未渲染；true/false = 当前是否处于窄屏布局。
 * resize 跨过 440px 时重渲染一次，让简称 / 隐藏标签生效。
 */

let compositionNarrowBucket = null;

/**


/**

* =========================================================
* 首页初始化
* =========================================================
    */

async function initHomePage() {

    console.log(
        "========== 首页初始化 =========="
    );

    console.log(
        "当前 URL：",
        window.location.href
    );

    console.log(
        "当前门店：",
        currentStore
    );


    /**
     * =====================================================
     * 检查门店是否存在
     * =====================================================
     */
    const stores =
        getStores();

    console.log(
        "所有门店：",
        stores
    );


    if (
        !stores.includes(
            currentStore
        )
    ) {

        console.warn(
            "URL 中的门店不存在：",
            currentStore
        );

        currentStore =
            "西乡店";

    }


    /**
     * =====================================================
     * 获取当前门店月份
     * =====================================================
     */
    const months =
        getMonths(
            currentStore
        );

    console.log(
        "当前门店月份：",
        months
    );


    if (
        !months.length
    ) {

        console.warn(
            "当前门店没有月份数据：",
            currentStore
        );

        showHomeError(
            "暂无门店数据"
        );

        return;

    }


    /**
     * =====================================================
     * 默认使用最新月份
     * =====================================================
     */
    currentMonth =
        months[0];

    console.log(
        "当前月份：",
        currentMonth
    );


    /**
     * =====================================================
     * 更新首页门店名称
     * =====================================================
     */
    updateStoreName();


    /**
     * =====================================================
     * 首页：月份只读展示（点击跳转历史页切换）
     * =====================================================
     */
    updateMonthLabel();


    /**
     * =====================================================
     * 绑定详情点击
     * =====================================================
     */
    initSupplierPaymentClick();

    initConsumableExpenseClick();


    /**
     * =====================================================
     * 加载当前月份 TXT
     *
     * 注意：
     * 这里会更新首页所有数据以及饼图数据
     * =====================================================
     */
    await loadCurrentMonthData();


    /**
     * =====================================================
     * 饼图已在 loadCurrentMonthData → renderHome 中绘制，
     * 这里无需重复调用。
     * =====================================================
     */


    /**
     * =====================================================
     * 绑定趋势详情
     * =====================================================
     */
    bindTrendCard(
        "rentCard",
        "店铺租金",
        "rent"
    );


    bindTrendCard(
        "waterElectricityCard",
        "店铺水电费",
        "waterElectricity"
    );


    bindTrendCard(
        "dormitoryRentCard",
        "宿舍房租",
        "dormitoryRent"
    );


    bindTrendCard(
        "salaryCard",
        "员工工资",
        "salary"
    );


    bindTrendCard(
        "socialSecurityCard",
        "员工社保",
        "socialSecurity"
    );


    bindTrendCard(
        "hqExpenseCard",
        "总公司运营支出",
        "hqExpense"
    );

    bindTrendCard(
        "grossProfitSection",
        "毛利",
        "grossProfit"
    );

    bindTrendCard(
        "operatingIncomeCard",
        "经营实收",
        "operatingIncome"
    );

    bindTrendCard(
        "netProfitSection",
        "净利润",
        "netProfit"
    );

    /**
     * =====================================================
     * 调整图表尺寸
     * =====================================================
     */
    setTimeout(
        function () {

            resizeHomeCharts();

        },
        300
    );

}

/**

* =========================================================
* 加载当前月份数据
* =========================================================
    */

async function loadCurrentMonthData() {

    console.log(
        "开始加载：",
        currentStore,
        currentMonth
    );
    try {
        /**
         * 从 TXT 文件读取数据
         */
        const record =
            await loadStoreData(
                currentStore,
                currentMonth
            );
        if (!record) {
            throw new Error(
                "TXT 数据为空"
            );
        }
        /**
         * 当前月份数据
         *
         * STORE_DATA 是公共数据变量。
         *
         * 首页当前只需要当前月份，
         * 后续历史页面可以再统一加载全部月份。
         */
        STORE_DATA = [
            record
        ];
        console.log(
            "TXT 解析结果：",
            record
        );
        /**
         * =================================================
         * 渲染首页
         * =================================================
         */
        renderHome();
    } catch (error) {
        console.error(
            "加载门店数据失败：",
            error
        );
        showHomeError(
            "数据加载失败，请检查 TXT 文件是否存在"
        );
    }

}

/**

* =========================================================
* 更新门店名称
* =========================================================
    */

function updateStoreName() {

    const storeName =
        $("storeName");
    if (!storeName) {
        return;
    }
    storeName.textContent =
        currentStore;

}

/**

* =========================================================
* 首页统一渲染
* =========================================================
    */

function renderHome() {

    console.log(
        "开始渲染首页：",
        currentStore,
        currentMonth
    );
    renderBusinessOverview();
    // renderRevenueTrend();
    // renderSupplierPaymentTrend();
    renderComposition();
    resizeHomeCharts();

}

/**

* =========================================================
* 显示首页错误
* =========================================================
    */

function showHomeError(message) {

    const overviewSubtitle =
        $("overviewSubtitle");
    if (overviewSubtitle) {
        overviewSubtitle.textContent =
            message;
    }
    const storeName =
        $("storeName");
    if (storeName) {
        storeName.textContent =
            currentStore;
    }

}

/**

* =========================================================
* 金额格式化
* =========================================================
    */

function money(value) {

    return "¥" +
        Number(
            value || 0
        ).toLocaleString(
            "zh-CN",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }
        );

}

/**

* =========================================================
* 万元格式化
* =========================================================
    */

function wan(value) {

    const n =
        Number(
            value || 0
        ) / 10000;
    return (
        n.toFixed(
            n >= 100
                ? 0
                : 1
        )
        + "万"
    );

}

/**

* =========================================================
* 月份格式化
* =========================================================
    */

function monthText(month) {

    if (!month) {
        return "";
    }
    const [y, m] =
        month.split("-");
    return `${y}年${Number(m)}月`;

}

/**

* =========================================================
* 获取指定数据
* =========================================================
    */

function getRecord(
    store,
    month
) {

    return STORE_DATA.find(
        item =>
            item.store === store
            &&
            item.month === month
    );

}

/**

* =========================================================
* 获取指定门店所有月份数据
* 注意：
* 当前首页 STORE_DATA 只保存当前月份，
* 所以趋势图暂时只有当前月份。
* 后续历史数据加载完善后，
* 这里可以直接用于显示近 6 个月。
* =========================================================
    */

function getStoreRecords(
    store
) {

    return STORE_DATA
        .filter(
            item =>
                item.store === store
        )
        .sort(
            (a, b) =>
                a.month.localeCompare(
                    b.month
                )
        );

}

/**

 * =========================================================
 * 首页：更新月份标签
 *
 * 2026-09-21 改造：
 * 月份 Div 不再绑定点击事件，仅作为纯展示标签。
 * =========================================================
 */

function updateMonthLabel() {

    const label =
        $("monthLabel");
    if (!label) {
        console.warn(
            "没有找到 monthLabel"
        );
        return;
    }
    label.textContent =
        monthText(currentMonth);

}


/**

* =========================================================
* 初始化图表
* =========================================================
    */

function initHomeChart(
    name,
    elementId
) {

    const element =
        $(elementId);
    if (!element) {
        console.warn(
            "没有找到图表 DOM：",
            elementId
        );
        return null;
    }

    /**
     * 页面切换时 pageContainer.innerHTML
     * 会被整体替换，缓存的实例还绑定在
     * 已销毁的旧 DOM 上。这里校验实例
     * 的宿主 DOM 是否为当前元素，不是
     * 则销毁旧实例并重新初始化。
     */
    if (
        homeCharts[name]
        && !homeCharts[name].isDisposed()
        && homeCharts[name].getDom() === element
    ) {
        return homeCharts[name];
    }

    if (
        homeCharts[name]
        && !homeCharts[name].isDisposed()
    ) {
        homeCharts[name].dispose();
    }

    homeCharts[name] =
        echarts.init(
            element
        );
    return homeCharts[name];

}

/**

* =========================================================
* 当月经营概览
* =========================================================
    */

function renderBusinessOverview() {

    const record =
        getRecord(
            currentStore,
            currentMonth
        );
    if (!record) {
        console.warn(
            "没有找到当前经营数据：",
            currentStore,
            currentMonth
        );
        return;
    }
    /**
     * =====================================================
     * 收入
     * =====================================================
     */
    $("totalRevenue").textContent =
        money(
            record.totalRevenue
        );
    $("totalDiscount").textContent =
        money(
            record.totalDiscount
        );
    $("revenue").textContent =
        money(
            record.revenue
        );
    $("totalFee").textContent =
        money(
            record.totalFee
        );
    $("operatingIncome").textContent =
        money(
            record.operatingIncome
        );
    /*
     * ==============================
     * 货佬款项
     * ==============================
     */

    $("foodPayment").textContent =
        money(
            record.foodPayment
        );


    $("nonFoodPayment").textContent =
        money(
            record.nonFoodPayment
        );


    /*
     * 合计直接使用经营分析表
     * 的“货佬款项(-)本月”
     *
     * 不使用：
     * foodPayment + nonFoodPayment
     *
     * 因为明细可能存在 0.01 元级别的差异
     */

    $("supplierPayment").textContent =
        money(
            record.supplierPayment
        );
    /**
     * =====================================================
     * 毛利
     * =====================================================
     */
    $("grossProfit").textContent =
        money(
            record.grossProfit
        );
    $("grossMargin").textContent =
        Number(
            record.grossMargin || 0
        ).toFixed(2)
        + "%";
    /**
     * =====================================================
     * 支出
     * =====================================================
     */
    setText(
        "rent",
        money(record.rent)
    );
    setText(
        "propertyFee",
        money(record.propertyFee)
    );
    setText(
        "waterElectricity",
        money(record.waterElectricity)
    );
    setText(
        "dormitoryRent",
        money(record.dormitoryRent)
    );
    setText(
        "salary",
        money(record.salary)
    );
    setText(
        "socialSecurity",
        money(record.socialSecurity)
    );
    setText(
        "consumableExpense",
        money(record.consumableExpense)
    );
    setText(
        "fixedExpense",
        money(record.fixedExpense)
    );
    setText(
        "otherExpense",
        money(record.otherExpense)
    );
    setText(
        "hqExpense",
        money(record.hqExpense)
    );
    /**
     * =====================================================
     * 净利润
     * =====================================================
     */
    $("netProfit").textContent =
        money(
            record.netProfit
        );
    $("netMargin").textContent =
        Number(
            record.netMargin || 0
        ).toFixed(2)
        + "%";
    /**
     * =====================================================
     * 页面标题
     * =====================================================
     */
    const subtitle =
        $("overviewSubtitle");
    if (subtitle) {
        subtitle.textContent =
            `${currentStore} · ${monthText(currentMonth)}`;
    }

}

/**

* =========================================================
* 设置 DOM 文本
* =========================================================
    */

function setText(
    id,
    value
) {

    const element =
        $(id);
    if (element) {
        element.textContent =
            value;
    }

}

/**

* =========================================================
* 营业收入趋势
* =========================================================
    */

function renderRevenueTrend() {

    const records =
        getStoreRecords(
            currentStore
        ).slice(-6);
    const chart =
        initHomeChart(
            "revenueTrend",
            "revenueTrend"
        );
    if (!chart) {
        return;
    }
    chart.setOption({
        animationDuration: 500,
        grid: {
            left: 48,
            right: 18,
            top: 25,
            bottom: 30
        },
        tooltip: {
            trigger: "axis",
            formatter:
                params => {
                    const p =
                        params[0];
                    return (
                        `${p.axisValue}<br/>`
                        +
                        `营业收入：`
                        +
                        `${money(p.value)}`
                    );
                }
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data:
                records.map(
                    item =>
                        monthText(
                            item.month
                        )
                ),
            axisLine: {
                lineStyle: {
                    color:
                        "#e5e8ec"
                }
            },
            axisLabel: {
                color:
                    "#8a8f98",
                fontSize: 10
            }
        },
        yAxis: {
            type: "value",
            axisLabel: {
                color:
                    "#8a8f98",
                fontSize: 10,
                formatter:
                    value =>
                        wan(value)
            },
            splitLine: {
                lineStyle: {
                    color:
                        "#f0f2f5"
                }
            }
        },
        series: [{
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 7,
            data:
                records.map(
                    item =>
                        item.revenue
                ),
            lineStyle: {
                width: 3,
                color:
                    "#ef233c"
            },
            itemStyle: {
                color:
                    "#ef233c"
            },
            areaStyle: {
                color:
                    "rgba(239,35,60,.08)"
            }
        }]
    });

}

/**

* =========================================================
* 供应商货款趋势
* =========================================================
    */

function renderSupplierPaymentTrend() {

    const records =
        getStoreRecords(
            currentStore
        ).slice(-6);
    const chart =
        initHomeChart(
            "supplierPaymentTrend",
            "supplierPaymentTrend"
        );
    if (!chart) {
        return;
    }
    chart.setOption({
        animationDuration: 500,
        grid: {
            left: 48,
            right: 18,
            top: 25,
            bottom: 30
        },
        tooltip: {
            trigger: "axis",
            formatter:
                params => {
                    const p =
                        params[0];
                    return (
                        `${p.axisValue}<br/>`
                        +
                        `货佬款项：`
                        +
                        `${money(p.value)}`
                    );
                }
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data:
                records.map(
                    item =>
                        monthText(
                            item.month
                        )
                ),
            axisLine: {
                lineStyle: {
                    color:
                        "#e5e8ec"
                }
            },
            axisLabel: {
                color:
                    "#8a8f98",
                fontSize: 10
            }
        },
        yAxis: {
            type: "value",
            axisLabel: {
                color:
                    "#8a8f98",
                fontSize: 10,
                formatter:
                    value =>
                        wan(value)
            },
            splitLine: {
                lineStyle: {
                    color:
                        "#f0f2f5"
                }
            }
        },
        series: [{
            name: "货佬款项",
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 7,
            data:
                records.map(
                    item =>
                        item.supplierPayment
                ),
            lineStyle: {
                width: 3,
                color:
                    "#f59e0b"
            },
            itemStyle: {
                color:
                    "#f59e0b"
            },
            areaStyle: {
                color:
                    "rgba(245,158,11,.08)"
            }
        }]
    });

}

/**

* =========================================================
* 营业收入构成
*
* 【公式】（2026-09-21 用户提供）
* 营业收入 = 总手续费 + 货佬款项 + 员工工资 + 员工社保
*          + 宿舍房租 + 宿舍水电费 + 店铺水电费 + 店铺租金
*          + 总公司运营支出 + 耗材支出 + 净利润
*
* 共 11 项，即「营业收入」的完整去向。
* 其中店铺租金 / 店铺水电费 / 宿舍房租 / 宿舍水电费
* 这四项固定支出从 TXT「固定支出数据如下」块读取 ——
* 块里的「宿舍水电燃气管理费」在经营简报里恒为 0，
* 只有块内才有真实值；未补该块的月份回退简报字段。
* =========================================================
    */

function renderComposition() {

    const record =
        getRecord(
            currentStore,
            currentMonth
        );
    if (!record) {
        return;
    }
    const chart =
        initHomeChart(
            "composition",
            "composition"
        );
    if (!chart) {
        return;
    }
    /**
     * -----------------------------------------------------
     * 固定支出明细取值
     *
     * 统一走 data.js 的 getFixedItem()：
     * 优先取 TXT「成本数据」段里的「固定支出数据如下」块，
     * 没有该块的旧月份回退经营简报字段。
     * -----------------------------------------------------
     */

    const fromFixed =
        (key) =>
            getFixedItem(record, key);


    /**
     * 营业收入 11 项构成
     *
     * 净利润为负时饼图无处安放负值扇区，
     * 这里按 0 处理（正常经营月份不会出现）。
     */

    const values = [
        {
            name: "总手续费",
            value:
                Number(
                    record.totalFee || 0
                )
        },
        {
            name: "货佬款项",
            value:
                Number(
                    record.supplierPayment || 0
                )
        },
        {
            name: "员工工资",
            value:
                fromFixed("salary")
        },
        {
            name: "员工社保",
            value:
                fromFixed("socialSecurity")
        },
        {
            name: "宿舍房租",
            value:
                fromFixed("dormitoryRent")
        },
        {
            name: "宿舍水电费",
            value:
                fromFixed("dormitoryUtility")
        },
        {
            name: "店铺水电费",
            value:
                fromFixed("waterElectricity")
        },
        {
            name: "店铺租金",
            value:
                fromFixed("rent")
        },
        {
            name: "总公司运营支出",
            value:
                Number(
                    record.hqExpense || 0
                )
        },
        {
            name: "耗材支出",
            value:
                Number(
                    record.consumableExpense
                    || record.otherExpense
                    || 0
                )
        },
        {
            name: "净利润",
            value:
                Math.max(
                    Number(
                        record.netProfit || 0
                    ),
                    0
                )
        }
    ];


    /**
     * -----------------------------------------------------
     * 窄屏标签适配
     *
     * 容器 < 440px（手机）时长科目名会贴着左右边缘
     * 被截成「总公司…」，这里改用简称；
     * 占比 < 1.5% 的小扇区则整块不画标签。
     * -----------------------------------------------------
     */

    const compositionEl =
        document.getElementById(
            "composition"
        );

    const narrow =
        !!compositionEl
        && compositionEl.clientWidth > 0
        && compositionEl.clientWidth < 440;

    compositionNarrowBucket =
        narrow;

    const COMPOSITION_SHORT_NAME = {
        "总手续费": "手续费",
        "总公司运营支出": "运营支出",
        "店铺水电费": "店水电",
        "店铺租金": "店租",
        "宿舍水电费": "宿舍水电",
        "宿舍房租": "宿舍租"
    };

    function shortCompositionName(name) {

        return (
            narrow
                && COMPOSITION_SHORT_NAME[name]
        )
            || name;

    }


    chart.setOption({
        animationDuration: 500,
        tooltip: {
            trigger: "item",
            formatter:
                p =>
                    `${p.name}<br/>`
                    +
                    `${money(p.value)}`
                    +
                    `（${p.percent}%）`
        },
        legend: {
            bottom: 5,
            left: "center",
            textStyle: {
                color:
                    "#666",
                fontSize: 10
            }
        },
        series: [{
            type: "pie",

            /**
             * 11 项构成：图例多行 + 外置标签较多，
             * 半径收一档、圆心上移，配合 #composition
             * 的加高（css/home.css），避免标签压图例；
             * 窄屏图例占三行，再收一档并进一步上移。
             */

            radius:
                narrow
                    ? ["34%", "54%"]
                    : ["36%", "60%"],
            center:
                narrow
                    ? ["50%", "37%"]
                    : ["50%", "42%"],
            avoidLabelOverlap: true,

            /**
             * 窄屏下小扇区（宿舍水电费 0.19% 等）的外置标签
             * 会挤在一起，交给 ECharts 自动隐藏重叠的那几个；
             * 名称与数值在底部图例和 tooltip 里依然可查。
             */

            labelLayout: {
                hideOverlap: true
            },
            itemStyle: {
                borderRadius: 5,
                borderColor: "#fff",
                borderWidth: 2
            },
            label: {

                /**
                 * 宽屏：全名 + 百分比（原样）。
                 * 窄屏：长名换简称、占比不足 1.5% 的小扇区
                 * 不画标签（名称/数值仍在图例与 tooltip 里），
                 * 避免左右边缘截断成一堆「…」。
                 */

                formatter:
                    narrow
                        ? (p) => {

                            if (p.percent < 1.5) {

                                return "";

                            }

                            return (
                                shortCompositionName(p.name)
                                + "\n"
                                + Number(
                                    p.percent.toFixed(2)
                                )
                                + "%"
                            );

                        }
                        : "{b}\n{d}%",
                fontSize: 10
            },
            data:
                values
        }]
    });
    /**
     * 副标题带上「营业收入」合计
     *
     * 按公式逐项相加得出（与饼图口径完全一致），
     * 不取 TXT「营业收入本月」——
     * TXT 的营业收入与经营实收之间含平台调整项，
     * 与本公式存在小额差异（如西乡店 8 月差 3116.54）。
     */

    const revenueTotal =
        values.reduce(
            (sum, item) =>
                sum + item.value,
            0
        );

    const subtitle =
        $("compositionSubtitle");
    if (subtitle) {
        subtitle.textContent =
            `${currentStore} · ${monthText(currentMonth)}`
            + ` · 营业收入 ${money(revenueTotal)}`;
    }

}

/**

* =========================================================
* 调整图表大小
* =========================================================
    */

function resizeHomeCharts() {

    /**
     * 窗口跨过 440px 断点时，
     * 营业收入构成饼图需要重渲染一次决定是否用简称。
     */

    const compositionEl =
        document.getElementById(
            "composition"
        );

    if (compositionEl) {

        const narrow =
            compositionEl.clientWidth > 0
            && compositionEl.clientWidth < 440;

        if (
            compositionNarrowBucket !== null
            && narrow !== compositionNarrowBucket
        ) {

            renderComposition();

        }

    }

    Object.values(
        homeCharts
    )
        .forEach(
            chart => {
                if (
                    chart
                    &&
                    !chart.isDisposed()
                ) {
                    chart.resize();
                }
            }
        );

}

/**

* =========================================================
* 销毁首页图表
* =========================================================
    */

function destroyHomeCharts() {

    Object.values(
        homeCharts
    )
        .forEach(
            chart => {
                if (
                    chart
                    &&
                    !chart.isDisposed()
                ) {
                    chart.dispose();
                }
            }
        );
    homeCharts = {};

}

/**
 * =========================================================
 * 货佬款项详情点击
 * =========================================================
 */
function initSupplierPaymentClick() {

    const section =
        document.getElementById(
            "supplierPaymentSection"
        );
    if (!section) {

        return;

    }


    /**
     * 防止重复绑定
     */
    section.onclick = function () {

        const result =
            confirm(
                "是否查看货佬款项详情？"
            );


        if (!result) {
            return;
        }
        loadPage(
            "supplier_detail"
        );
    };

}


/**
 * =========================================================
 * 非食材耗材详情点击
 * =========================================================
 */
function initConsumableExpenseClick() {

    const section =
        document.getElementById(
            "consumableExpenseSection"
        );


    if (!section) {

        return;

    }


    section.onclick = function () {

        const result =
            confirm(
                "是否查看非食材耗材详情？"
            );


        if (!result) {

            return;

        }


        loadPage(
            "consumable_detail"
        );

    };

}

function openRentDetail() {

    console.log(
        "打开店铺租金详情"
    );

    loadPage("storeRent");

}

function bindTrendCard(cardId, title, field) {

    const card =
        document.getElementById(cardId);

    if (!card) {

        console.warn(
            "找不到趋势图卡片：",
            cardId
        );

        return;
    }


    card.onclick = function () {

        console.log(
            "========== 点击趋势卡片 =========="
        );

        console.log(
            "标题：",
            title
        );

        console.log(
            "字段：",
            field
        );

        console.log(
            "门店：",
            currentStore
        );

        console.log(
            "月份：",
            currentMonth
        );


        /**
         * 保存趋势详情参数
         *
         * 因为 trend_detail.html
         * 是通过 loadPage() 动态加载，
         * 所以不再依赖 URL。
         */
        window.trendDetailParams = {

            store: currentStore,

            month: currentMonth,

            title: title,

            field: field

        };


        /**
         * 动态加载趋势详情页
         */
        loadPage(
            "trendDetail"
        );

    };

}