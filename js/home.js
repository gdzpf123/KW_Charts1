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
 * 经营实收构成饼图的窄屏断点状态
 *
 * null = 尚未渲染；true/false = 当前是否处于窄屏布局。
 * resize 跨过 440px 时重渲染一次，让简称 / 隐藏标签生效。
 */

let compositionNarrowBucket = null;

/**
 * 经营实收构成的下钻状态
 *
 * compositionDrill = 当前下钻到的大类名（null = 一级总览）。
 * compositionDrillKey = 该状态对应的「门店/月份」，
 * 换门店或换月份时据此复位，避免停在上个月的子类里。
 */

let compositionDrill = null;

let compositionDrillKey = "";

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
* 经营实收构成（两级下钻环形图）
*
* 【公式】（2026-09-22 用户分类版）
* 经营实收 = 货佬款项
*          + 店铺固定支出（店铺租金 + 店铺水电费
*                        + 物业服务费 + 停车费）
*          + 员工固定支出（宿舍房租 + 宿舍水电费
*                        + 员工工资 + 员工社保 + 绩效奖金）
*          + 总公司运营支出 + 耗材支出 + 净利润
*
* 一级只画 6 个大类（13 项明细归到两大固定支出里），
* 扇区从 13 个降到 6 个，标签不再互相挤压；
* 点击「店铺固定支出」/「员工固定支出」扇区下钻看明细，
* 卡片标题右侧的「返回」按钮回到一级。
*
* 13 项明细之和 = TXT「经营实收」，全量 40 个文件对齐
* （西乡店 8 月：675011.62 总成本 + 68063.92 净利润
*   = 743075.54 ≈ 743075.56 经营实收），不含平台调整项。
*
* 其中 9 项固定支出（店铺租金 / 店铺水电费 / 物业服务费 /
* 停车费 / 宿舍房租 / 宿舍水电费 / 员工工资 / 员工社保 /
* 绩效奖金）统一走 data.js 的 getFixedItem()，从 TXT
* 「固定支出数据如下」块读取 —— 块里的「宿舍水电燃气管理费」
* 在经营简报里恒为 0，只有块内才有真实值。
* =========================================================
    */

/**
* =========================================================
* 经营实收构成的分类定义
*
* 顺序与用户给的公式完全一致。
* 带 items 的大类支持下钻，value 由子项累加得出。
* =========================================================
    */

function compositionGroups(record) {

    if (!record) {

        return [];

    }


    const fromFixed =
        (key) =>
            getFixedItem(record, key);


    return [
        {
            name: "货佬款项",
            value:
                Number(
                    record.supplierPayment
                    || 0
                )
        },
        {
            name: "店铺固定支出",
            items: [
                {
                    name: "店铺租金",
                    value:
                        fromFixed("rent")
                },
                {
                    name: "店铺水电费",
                    value:
                        fromFixed("waterElectricity")
                },
                {
                    name: "物业服务费",
                    value:
                        fromFixed("propertyFee")
                },
                {
                    name: "停车费",
                    value:
                        fromFixed("parking")
                }
            ]
        },
        {
            name: "员工固定支出",
            items: [
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
                    name: "绩效奖金",
                    value:
                        fromFixed("bonus")
                }
            ]
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
    ]
        .map(
            group => {

                if (!group.items) {

                    return group;

                }

                return {
                    name: group.name,
                    items: group.items,
                    value:
                        group.items.reduce(
                            (sum, item) =>
                                sum + item.value,
                            0
                        )
                };

            }
        );

}


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

    const compositionEl =
        document.getElementById(
            "composition"
        );


    /**
     * -----------------------------------------------------
     * 窄屏标签适配
     *
     * 容器 < 440px（手机）时长科目名会贴着左右边缘
     * 被截成「总公司…」，这里改用简称；
     * 占比 < 1.5% 的小扇区则整块不画标签。
     * -----------------------------------------------------
     */

    const narrow =
        !!compositionEl
        && compositionEl.clientWidth > 0
        && compositionEl.clientWidth < 440;

    compositionNarrowBucket =
        narrow;


    /**
     * -----------------------------------------------------
     * 下钻状态
     *
     * 换门店 / 换月份时复位，避免停在上一个月份
     * 的子类里；跨 440px 断点重渲染时保留层级。
     * -----------------------------------------------------
     */

    const drillKey =
        `${currentStore}/${currentMonth}`;

    if (compositionDrillKey !== drillKey) {

        compositionDrillKey =
            drillKey;
        compositionDrill = null;

    }


    const groups =
        compositionGroups(record);

    const activeGroup =
        compositionDrill
            ? groups.find(
                group =>
                    group.name === compositionDrill
                    && group.items
            ) || null
            : null;

    const drilled =
        !!activeGroup;


    /**
     * 一级：6 个大类；二级：该大类下的明细子项。
     */

    const pieData =
        drilled
            ? activeGroup.items.map(
                item => ({
                    name: item.name,
                    value: item.value
                })
            )
            : groups.map(
                group => ({
                    name: group.name,
                    value: group.value
                })
            );


    const COMPOSITION_SHORT_NAME = {
        "货佬款项": "货佬",
        "店铺固定支出": "店铺固定",
        "员工固定支出": "员工固定",
        "总公司运营支出": "运营支出",
        "店铺水电费": "店水电",
        "店铺租金": "店租",
        "物业服务费": "物业费",
        "停车费": "停车费",
        "宿舍水电费": "宿舍水电",
        "宿舍房租": "宿舍租",
        "绩效奖金": "绩效",
        "耗材支出": "耗材"
    };

    function shortCompositionName(name) {

        return (
            narrow
                && COMPOSITION_SHORT_NAME[name]
        )
            || name;

    }


    /**
     * 经营实收合计
     *
     * 按公式逐项带符号相加（净利润为负时照减）。
     * 该合计 = TXT「经营实收」：西乡店 8 月
     * 743075.55 vs 743075.56，全量 40 个文件
     * 全部对齐（±0.02 元四舍五入）。
     *
     * 注意：净利润为负的月份（西乡店 2026-04，
     * -17021.23）饼图放不下负值扇区，该扇区只能按 0 画，
     * 所以图上少一块、合计仍按负数扣减并额外标注说明。
     */

    const rawNetProfit =
        Number(
            record.netProfit || 0
        );

    const revenueTotal =
        groups.reduce(
            (sum, group) =>
                sum + group.value,
            0
        )
        + (
            rawNetProfit < 0
                ? rawNetProfit
                : 0
        );


    /**
     * 圆心文字
     *
     * 一级显示「经营实收」合计，二级显示当前大类
     * 名称与金额，让下钻层级一眼可见。
     * 用像素换算圆心位置：圆心的 center 是百分比，
     * graphic 的 top 需要像素，故按容器高度折算。
     */

    const centerY =
        (
            compositionEl
            && compositionEl.clientHeight
            || 360
        )
        * (
            narrow
                ? 0.40
                : 0.44
        );

    const centerTitle =
        drilled
            ? shortCompositionName(
                activeGroup.name
            )
            : "经营实收";

    const centerValue =
        money(
            drilled
                ? activeGroup.value
                : revenueTotal
        );


    chart.setOption({
        animationDuration: 500,
        graphic: [
            {
                type: "text",
                left: "center",
                top: centerY - 18,
                silent: true,
                style: {
                    text: centerTitle,
                    textAlign: "center",
                    fill: "#8a8a8a",
                    fontSize: 11
                }
            },
            {
                type: "text",
                left: "center",
                top: centerY - 3,
                silent: true,
                style: {
                    text: centerValue,
                    textAlign: "center",
                    fill: "#333333",
                    fontSize: 13,
                    fontWeight: "bold"
                }
            }
        ],
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
            bottom: 2,
            left: "center",

            /**
             * 一级 6 项、二级最多 5 项，图例都只占一行；
             * 窄屏仍换简称，防止长名把图例挤成两行。
             */

            formatter:
                narrow
                    ? name =>
                        shortCompositionName(name)
                    : undefined,
            itemWidth: 10,
            itemHeight: 10,
            itemGap:
                narrow ? 8 : 10,
            textStyle: {
                color:
                    "#666",
                fontSize: 10
            }
        },
        series: [{
            type: "pie",

            /**
             * 分类后扇区变少，半径可以放大一档，
             * 圆心略微下移，留出外置标签的空间。
             */

            radius:
                narrow
                    ? ["32%", "54%"]
                    : ["36%", "58%"],
            center:
                narrow
                    ? ["50%", "40%"]
                    : ["50%", "44%"],
            avoidLabelOverlap: true,

            /**
             * 窄屏下小扇区（宿舍水电费 1.4% 等）的外置标签
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
                 * 宽屏：全名 + 百分比。
                 * 窄屏：长名换简称、占比不足 1.5% 的小扇区
                 * 不画标签（名称/数值仍在图例与 tooltip 里），
                 * 避免左右边缘截断成一堆「…」。
                 *
                 * 两种宽度都先过滤掉 0 值科目：物业服务费 /
                 * 停车费 / 绩效奖金 目前多为 0，没有扇区却会
                 * 在圆心下方叠出一排「0%」标签压住图例。
                 */

                formatter: (p) => {

                    if (!p.value) {

                        return "";

                    }

                    if (narrow) {

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

                    return (
                        p.name
                        + "\n"
                        + Number(
                            p.percent.toFixed(2)
                        )
                        + "%"
                    );

                },
                fontSize: 10,

                /**
                 * 关掉 ECharts 的标签截断：手机端左侧的
                 * 「员工固定 28.7%」原本会被压成「员工…」，
                 * 关掉后按实际宽度铺开（容器外还有卡片留白）。
                 */

                overflow: "none"
            },
            data:
                pieData
        }]
    });


    /**
     * 下钻交互
     *
     * 点击带子项的大类扇区进入二级；先 off 再 on，
     * 避免每次重渲染都往同一个实例上叠监听。
     */

    chart.off("click");

    chart.on(
        "click",
        params => {

            const group =
                groups.find(
                    item =>
                        item.name === params.name
                        && item.items
                );

            if (!group) {

                return;

            }

            compositionDrill =
                group.name;

            renderComposition();

        }
    );

    const backBtn =
        document.getElementById(
            "compositionBack"
        );

    if (backBtn) {

        backBtn.hidden = !drilled;

        backBtn.onclick = () => {

            compositionDrill = null;
            renderComposition();

        };

    }


    /**
     * 副标题
     *
     * 一级：门店 · 月份 · 经营实收合计；
     * 二级：门店 · 月份 · 大类金额（占经营实收比例）。
     */

    const subtitle =
        $("compositionSubtitle");

    if (subtitle) {

        const head =
            `${currentStore} · ${monthText(currentMonth)}`;

        if (drilled) {

            const share =
                revenueTotal
                    ? (
                        activeGroup.value
                        / revenueTotal
                        * 100
                    ).toFixed(2)
                    : "0.00";

            subtitle.textContent =
                `${head} · ${activeGroup.name} `
                + `${money(activeGroup.value)}`
                + `（占经营实收 ${share}%）`;

        }
        else {

            subtitle.textContent =
                `${head} · 经营实收 ${money(revenueTotal)}`
                + (
                    rawNetProfit < 0
                        ? "（该月净利润为负，扇区按 0 展示）"
                        : ""
                )
                + " · 点击扇区查看明细";

        }

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
     * 经营实收构成饼图需要重渲染一次决定是否用简称。
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