/**
 * =========================================================
 * 分析 2 · 单店股东视角
 *
 * 定位：帮股东看懂这家店的经营状况，发现趋势和问题。
 * 注意：只做单店分析，不做任何跨店内容。
 *
 * 五大模块：
 *   1. KPI 涨跌卡片   （营收/毛利率/净利率/净利润 × 当月/环比/同比）
 *   2. 趋势图          （折线 + 同比 + 均值参考线，可切换指标）
 *   3. 成本结构        （堆叠柱状图 + 当月成本饼图）
 *   4. 利润瀑布        （收入 → 各成本扣减 → 净利润）
 * =========================================================
 */


/**
 * ==============================
 * 模块状态
 * ==============================
 */

let a2AllRecords = [];

let a2Range = 12;

let a2Metric = "revenue";

let a2ShowYoY = true;

let a2ShowAvg = true;

/**
 * 成本结构模块：用户当前选中的月份
 *
 * 留空表示「取最新月」（默认状态），
 * 非空表示「点击柱状图后选中的月份」，
 *   用于驱动下方饼图切换数据。
 */

let a2SelectedMonth = "";


/**
 * ==============================
 * 瀑布图 · 移动端适配
 * ==============================
 * 思路：宽屏（≥600px）保持原样；
 * 中屏（360-600px）旋转 30° + 缩短标签 + 加大底部；
 * 窄屏（<360px）旋转 45° + hideOverlap 兜底。
 *
 * 三个常量供 renderWaterfall / 响应式 resize 共享。
 */

/**
 * 节点 label → 移动端简称
 * 用于窄屏减少 X 轴文字密度。
 */

const A2_WATERFALL_LABEL_SHORT = {

    "营业收入": "营收",
    "- 货佬款项": "- 货佬",
    "- 员工工资": "- 工资",
    "- 员工社保": "- 社保",
    "- 宿舍房租": "- 宿舍租",
    "- 宿舍水电费": "- 宿舍水电",
    "- 店铺水电费": "- 店水电",
    "- 店铺租金": "- 店租",
    "- 总手续费": "- 手续费",
    "- 总公司运营支出": "- 运营",
    "- 耗材支出": "- 耗材",
    "净利润": "净利"

};


/**
 * 根据当前视口宽度，返回瀑布图的布局预设。
 * @returns {{bucket: string, fontSize: number, rotate: number,
 *           bottom: number, hideOverlap: boolean, labelMode: string}}
 *   labelMode: 'full' 保留原 label；'short' 用 A2_WATERFALL_LABEL_SHORT 映射。
 */

function a2WaterfallLayout() {

    const w =
        window.innerWidth;


    if (w >= 600) {

        return {

            bucket: "wide",
            fontSize: 10,
            rotate: 0,
            bottom: 30,
            hideOverlap: false,
            labelMode: "full"

        };

    }


    if (w >= 360) {

        return {

            bucket: "mid",
            fontSize: 9,
            rotate: 30,
            bottom: 60,
            hideOverlap: false,
            labelMode: "short"

        };

    }


    return {

        bucket: "narrow",
        fontSize: 9,
        rotate: 45,
        bottom: 80,
        hideOverlap: true,
        labelMode: "short"

    };

}


/**
 * 当前瀑布图所在断点 bucket。
 * resize 跨断点时用于触发重渲染；同一 bucket 内只走 .resize()。
 */

let a2WaterfallBucket = "";


/**
 * ==============================
 * 页面入口
 * ==============================
 */

async function initAnalysis2Page() {

    const store =
        getA2Store();


    /**
     * 加载近 12 个月（不足 12 个月则取全部），
     * 失败月份跳过。
     */

    const months =
        (typeof getMonths === "function"
            ? getMonths(store)
            : []
        )
            .slice(0, 12);


    if (
        typeof loadStoreMonthsData ===
        "function"
        && months.length > 0
    ) {

        await loadStoreMonthsData(
            store,
            months
        );

    }


    a2AllRecords =
        STORE_DATA
            .filter(
                x => x.store === store
            )
            .sort(
                (a, b) =>
                    a.month.localeCompare(
                        b.month
                    )
            );


    const subtitle =
        document.getElementById(
            "analysis2Subtitle"
        );


    if (
        subtitle
        && a2AllRecords.length
    ) {

        const last =
            a2AllRecords[
                a2AllRecords.length - 1
            ];

        subtitle.textContent =
            `${store} · ${a2MonthText(
                last.month
            )} · 共 ${a2AllRecords.length} 个月数据`;

    }


    /**
     * 渲染六大模块
     */

    renderKPI();

    renderTrend();

    renderCostStack();

    renderCostPie();

    renderWaterfall();

    renderBriefing();

    bindA2Filters();

}


/**
 * ==============================
 * 获取当前门店
 * ==============================
 */

function getA2Store() {

    if (
        typeof currentStore !==
        "undefined"
    ) {

        return currentStore;

    }


    return "西乡店";

}


/**
 * ==============================
 * 工具函数
 * ==============================
 */

function a2Money(value) {

    return "¥" +
        Number(value || 0)
            .toLocaleString("zh-CN", {

                minimumFractionDigits: 0,

                maximumFractionDigits: 0

            });

}


function a2Wan(value) {

    const n =
        Number(value || 0) / 10000;


    return n.toFixed(
        n >= 100 ? 0 : 1
    ) + "万";

}


function a2MonthText(month) {

    const [y, m] =
        month.split("-");


    return `${y}年${Number(m)}月`;

}


function a2MonthShort(
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
 * ==============================
 * 同比：找去年同月
 * ==============================
 *
 * 注意：这只是兜底方案。
 *
 * 优先使用 TXT 自带的去年同月值
 * （a2BaseValue），因为本店历史
 * TXT 经常不齐全，而 TXT 每行
 * 都自带「本月,上月,去年N月,去年平均」。
 */

function a2FindYoY(month, records) {

    const [y, m] =
        month.split("-");

    const lastYear =
        `${Number(y) - 1}-${m}`;


    return records.find(
        x => x.month === lastYear
    ) || null;

}


/**
 * ==============================
 * 从 TXT 解析出的基准值中取数
 * ==============================
 *
 * suffix：
 *
 *     "Prev"      上月值（环比基准）
 *     "LastYear"  去年同月值（同比基准）
 *
 * 数据源缺该段时返回 null，
 * 由调用方回退到本地记录推算。
 */

function a2BaseValue(record, key, suffix) {

    const field = key + suffix;

    const v =
        record
            ? record[field]
            : undefined;


    if (
        v === undefined
        || v === null
    ) {

        return null;

    }


    const n = Number(v);


    return Number.isNaN(n)
        ? null
        : n;

}


/**
 * ==============================
 * 变化率（百分比）
 * ==============================
 */

function a2CalcChange(curr, prev) {

    if (
        prev === null
        || prev === undefined
    ) {

        return null;

    }


    const p =
        Number(prev);

    const c =
        Number(curr);


    if (p === 0) {

        return c === 0
            ? 0
            : null;

    }


    return ((c - p) / p) * 100;

}


function a2ChangeClass(v) {

    if (
        v === null
        || v === undefined
        || Number.isNaN(v)
    ) {

        return "a2-kpi-change neutral";

    }


    if (v > 0) {

        return "a2-kpi-change up";

    }


    if (v < 0) {

        return "a2-kpi-change down";

    }


    return "a2-kpi-change neutral";

}


function a2ChangeText(v) {

    if (
        v === null
        || v === undefined
        || Number.isNaN(v)
    ) {

        return "—";

    }


    const sign =
        v > 0 ? "+" : "";


    return `${sign}${v.toFixed(1)}%`;

}


/**
 * ==============================
 * 变化文本（比率类：个百分点）
 * ==============================
 *
 * 毛利率 / 净利率这类比率指标，
 * 环比同比展示的是「百分点差」，
 * 而不是相对变化率。
 *
 * 与 TXT 原文口径一致：
 *
 * 净利率环比上月 增长2.74个百分点
 */

function a2ChangeTextPP(v) {

    if (
        v === null
        || v === undefined
        || Number.isNaN(v)
    ) {

        return "—";

    }


    const sign =
        v > 0 ? "+" : "";


    return `${sign}${v.toFixed(2)}个百分点`;

}


/**
 * ==============================
 * 成本拆分
 *
 * 食材  = supplierPayment（货佬款项）
 * 人力  = salary + socialSecurity
 * 房租  = rent + propertyFee + dormitoryRent
 * 水电  = waterElectricity
 * 营销  = totalFee（总手续费/服务费 ≈ 外卖平台费等）
 * 其他  = consumableExpense + hqExpense
 *         （非食材耗材 + 总公司运营支出）
 * ==============================
 */

function a2SplitCost(record) {

    return {

        food:
            Number(
                record.supplierPayment || 0
            ),

        labor:
            getFixedItem(record, "salary") +
            getFixedItem(
                record,
                "socialSecurity"
            ),

        rent:
            getFixedItem(record, "rent") +
            getFixedItem(
                record,
                "propertyFee"
            ) +
            getFixedItem(
                record,
                "dormitoryRent"
            ),

        utility:
            getFixedItem(
                record,
                "waterElectricity"
            ),

        marketing:
            Number(record.totalFee || 0),

        other:
            Number(
                record.consumableExpense || 0
            ) +
            Number(record.hqExpense || 0)

    };

}


/**
 * =========================================================
 * 成本项明细配置（成本结构模块专用）
 * =========================================================
 *
 * 与 a2SplitCost() 的「合并口径」不同：
 *
 * a2SplitCost()   把科目合并成 6 大类（食材/人力/房租…）
 *                 供瀑布图做粗颗粒的利润扣减链路。
 *
 * a2CostItems()   供成本结构的「堆叠柱状图 + 饼图」使用，
 *                 让股东能直接看到每一笔支出花在哪。
 *
 * ---------------------------------------------------------
 * 双口径（2026-09-21）
 * ---------------------------------------------------------
 *
 * 新口径：TXT 中新增的「X月 成本数据」段
 *         货佬款项 + 固定支出 9 项明细
 *         + 其他耗材支出 + 总公司运营支出，共 12 项。
 *
 * 旧口径：TXT 原始科目 9 项（无「成本数据」段时回退）。
 *
 * 判断依据：所选月份是否全部带 record.costStructure。
 * 同一家门店的各月 TXT 结构一致，因此柱状图
 * 不会出现「一半新口径、一半旧口径」的错位。
 *
 * 每项字段：
 *
 *   key    唯一标识
 *   label  显示名称
 *   color  图表颜色
 *   get    从 record 中取当月值的函数
 *   short  可选，饼图外置标签用的短名（长科目在手机端避免溢出）
 *
 * 说明：
 *
 * 「物业服务费」「停车费」「绩效奖金」当前为 0，
 * 渲染时会被 a2ActiveCostItems() 自动跳过；
 * 等数据源出现非 0 值后无需改代码即会自动显示。
 *
 * =========================================================
 */

function a2CostItems(records) {

    /**
     * 口径判断：所选月份是否全部带「成本数据」段
     */

    const useCostStructure =
        Array.isArray(records)
        && records.length > 0
        && records.every(
            r =>
                r
                && r.costStructure
        );


    if (useCostStructure) {

        return [

            {
                key: "supplierPayment",
                label: "货佬款项",
                color: "#dc2626",
                get: r =>
                    Number(
                        r.costStructure
                            .supplierPayment || 0
                    )
            },

            {
                key: "rent",
                label: "店铺租金",
                color: "#0891b2",
                get: r =>
                    Number(
                        r.costStructure
                            .fixed.rent || 0
                    )
            },

            {
                key: "propertyFee",
                label: "物业服务费",
                color: "#06b6d4",
                get: r =>
                    Number(
                        r.costStructure
                            .fixed.propertyFee || 0
                    )
            },

            {
                key: "parking",
                label: "停车费",
                color: "#eab308",
                get: r =>
                    Number(
                        r.costStructure
                            .fixed.parking || 0
                    )
            },

            {
                key: "waterElectricity",
                label: "店铺水电费",
                color: "#3478f6",
                get: r =>
                    Number(
                        r.costStructure
                            .fixed
                            .waterElectricity || 0
                    )
            },

            {
                key: "dormitoryRent",
                label: "宿舍房租",
                color: "#0ea5e9",
                get: r =>
                    Number(
                        r.costStructure
                            .fixed.dormitoryRent || 0
                    )
            },

            {
                key: "dormitoryUtility",
                label: "宿舍水电燃气管理费",
                short: "宿舍水电",
                color: "#14b8a6",
                get: r =>
                    Number(
                        r.costStructure
                            .fixed
                            .dormitoryUtility || 0
                    )
            },

            {
                key: "salary",
                label: "员工工资",
                color: "#7657e8",
                get: r =>
                    Number(
                        r.costStructure
                            .fixed.salary || 0
                    )
            },

            {
                key: "socialSecurity",
                label: "员工社保",
                color: "#a855f7",
                get: r =>
                    Number(
                        r.costStructure
                            .fixed
                            .socialSecurity || 0
                    )
            },

            {
                key: "bonus",
                label: "绩效奖金",
                color: "#ec4899",
                get: r =>
                    Number(
                        r.costStructure
                            .fixed.bonus || 0
                    )
            },

            {
                key: "consumableExpense",
                label: "其他耗材支出",
                color: "#8a8f98",
                get: r =>
                    Number(
                        r.costStructure
                            .consumable || 0
                    )
            },

            {
                key: "hqExpense",
                label: "总公司运营支出",
                short: "总公司运营",
                color: "#475569",
                get: r =>
                    Number(
                        r.costStructure
                            .hqExpense || 0
                    )
            }

        ];

    }


    /**
     * 旧口径：TXT 原始科目 9 项
     */

    return [

        {
            key: "supplierPayment",
            label: "货佬款项",
            color: "#dc2626",
            get: r =>
                Number(r.supplierPayment || 0)
        },

        {
            key: "totalFee",
            label: "总手续费",
            color: "#f97316",
            get: r =>
                Number(r.totalFee || 0)
        },

        {
            key: "rent",
            label: "店铺租金",
            color: "#0891b2",
            get: r =>
                Number(r.rent || 0)
        },

        {
            key: "waterElectricity",
            label: "店铺水电费",
            color: "#3478f6",
            get: r =>
                Number(r.waterElectricity || 0)
        },

        {
            key: "dormitoryRent",
            label: "宿舍房租",
            color: "#0ea5e9",
            get: r =>
                Number(r.dormitoryRent || 0)
        },

        {
            key: "dormitoryUtility",
            label: "宿舍水电费",
            color: "#14b8a6",
            get: r =>
                Number(r.dormitoryUtility || 0)
        },

        {
            key: "salary",
            label: "员工工资",
            color: "#7657e8",
            get: r =>
                Number(r.salary || 0)
        },

        {
            key: "socialSecurity",
            label: "社保",
            color: "#a855f7",
            get: r =>
                Number(r.socialSecurity || 0)
        },

        {
            key: "consumableExpense",
            label: "耗材",
            color: "#8a8f98",
            get: r =>
                Number(r.consumableExpense || 0)
        }

    ];

}


/**
 * 过滤掉在所选月份里全部为 0 的科目，
 * 避免出现空图例（如暂缺数据的「物业服务费」）。
 */

function a2ActiveCostItems(records) {

    return a2CostItems(records)
        .filter(
            item =>
                records.some(
                    r => item.get(r) > 0
                )
        );

}


/**
 * =========================================================
 * 1. KPI 涨跌卡片
 * =========================================================
 */

function renderKPI() {

    const container =
        document.getElementById("a2Kpi");


    if (
        !container
        || !a2AllRecords.length
    ) {

        return;

    }


    const records =
        a2AllRecords.slice(-a2Range);


    const latest =
        records[records.length - 1];


    const prev =
        records.length > 1
            ? records[records.length - 2]
            : null;


    const yoy =
        a2FindYoY(
            latest.month,
            a2AllRecords
        );


    const metrics = [

        {
            key: "revenue",
            name: "营业收入",
            isPercent: false
        },

        {
            key: "grossMargin",
            name: "毛利率",
            isPercent: true
        },

        {
            key: "netMargin",
            name: "净利率",
            isPercent: true
        },

        {
            key: "netProfit",
            name: "净利润",
            isPercent: false
        }

    ];


    container.innerHTML =
        metrics.map(m => {

            const curr =
                latest[m.key];

            /**
             * 环比基准：
             * 优先用 TXT 自带的上月值，
             * 缺失时回退到上一条记录。
             */
            const momBase =
                a2BaseValue(
                    latest,
                    m.key,
                    "Prev"
                )
                ?? (prev
                    ? Number(prev[m.key] || 0)
                    : null);

            /**
             * 同比基准：
             * 优先用 TXT 自带的去年同月值，
             * 缺失时回退到本地去年同月记录。
             */
            const yoyBase =
                a2BaseValue(
                    latest,
                    m.key,
                    "LastYear"
                )
                ?? (yoy
                    ? Number(yoy[m.key] || 0)
                    : null);


            /**
             * 计算变化量
             *
             * 金额类（营收/净利润）：
             *     相对变化率（%）
             *
             * 比率类（毛利率/净利率）：
             *     百分点差（个百分点），
             *     与 TXT 原文口径一致
             */
            const calcChange = base =>
                base === null
                    ? null
                    : m.isPercent
                        ? Number(curr) -
                            Number(base)
                        : a2CalcChange(
                            curr,
                            base
                        );

            const momChange =
                calcChange(momBase);

            const yoyChange =
                calcChange(yoyBase);


            /**
             * 变化文本：比率类用「个百分点」
             */
            const changeText = v =>
                m.isPercent
                    ? a2ChangeTextPP(v)
                    : a2ChangeText(v);


            const formattedValue =
                m.isPercent
                    ? `${Number(
                        curr || 0
                    ).toFixed(2)}%`
                    : a2Money(curr);


            return `

                <div class="a2-kpi-card">

                    <div class="a2-kpi-label">
                        ${m.name}
                    </div>

                    <div class="a2-kpi-value">
                        ${formattedValue}
                    </div>

                    <div class="a2-kpi-changes">

                        <div class="${a2ChangeClass(momChange)}">

                            环比 ${changeText(momChange)}

                        </div>


                        <div class="${a2ChangeClass(yoyChange)}">

                            同比 ${changeText(yoyChange)}

                        </div>

                    </div>

                </div>

            `;

        })
            .join("");

}


/**
 * =========================================================
 * 2. 趋势图
 * =========================================================
 */

function renderTrend() {

    const records =
        a2AllRecords.slice(-a2Range);


    if (!records.length) {

        return;

    }


    const metricDef = {

        revenue: {
            name: "营业收入",
            color: "#3478f6",
            isPercent: false
        },

        grossMargin: {
            name: "毛利率",
            color: "#16a36a",
            isPercent: true
        },

        netMargin: {
            name: "净利率",
            color: "#f59e0b",
            isPercent: true
        },

        netProfit: {
            name: "净利润",
            color: "#7657e8",
            isPercent: false
        }

    };

    const cfg =
        metricDef[a2Metric] ||
        metricDef.revenue;


    const subEl =
        document.getElementById(
            "a2TrendSubtitle"
        );


    if (subEl) {

        subEl.textContent =
            `${cfg.name} · ${a2MonthText(
                records[0].month
            )} - ${a2MonthText(
                records[
                    records.length - 1
                ].month
            )} · 共 ${records.length} 个月`;

    }


    const element =
        document.getElementById(
            "a2TrendChart"
        );


    if (!element) {

        return;

    }


    if (!window.charts) {

        window.charts = {};

    }


    /**
     * 校验宿主 DOM，不匹配则重建
     */

    if (
        window.charts.a2Trend
        && !window.charts.a2Trend.isDisposed()
        && window.charts.a2Trend.getDom() !==
            element
    ) {

        window.charts.a2Trend.dispose();

        window.charts.a2Trend = null;

    }


    if (!window.charts.a2Trend) {

        window.charts.a2Trend =
            echarts.init(element);

    }


    const chart =
        window.charts.a2Trend;


    /**
     * 短月份标签
     */

    const firstYear =
        Number(
            records[0].month.split("-")[0]
        );

    const labels =
        records.map(r =>
            a2MonthShort(
                r.month,
                firstYear
            )
        );


    const values =
        records.map(
            r => Number(r[a2Metric] || 0)
        );


    /**
     * 均值
     */

    const avg =
        values.length > 0
            ? values.reduce(
                (s, v) => s + v,
                0
            ) / values.length
            : 0;


    /**
     * 同比数据
     *
     * 优先用 TXT 自带的去年同月值，
     * 缺失时回退到本地去年同月记录。
     */

    const yoyData =
        records.map(r => {

            const base =
                a2BaseValue(
                    r,
                    a2Metric,
                    "LastYear"
                );


            if (base !== null) {

                return base;

            }


            const y =
                a2FindYoY(
                    r.month,
                    a2AllRecords
                );


            return y
                ? Number(y[a2Metric] || 0)
                : null;

        });


    /**
     * series 装配
     */

    const series = [

        {
            name: cfg.name,
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 7,
            data: values,
            lineStyle: {
                width: 3,
                color: cfg.color
            },
            itemStyle: {
                color: cfg.color
            },
            areaStyle: {
                color: cfg.color + "20"
            }
        }

    ];


    if (a2ShowYoY) {

        series.push({

            name: "去年同月",
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 5,
            data: yoyData,
            lineStyle: {
                width: 2,
                color: "#8a8f98",
                type: "dashed"
            },
            itemStyle: {
                color: "#8a8f98"
            },
            connectNulls: true

        });

    }


    if (a2ShowAvg) {

        series.push({

            name: "均值",
            type: "line",
            data: records.map(
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
            symbol: "none",
            tooltip: {
                show: false
            }

        });

    }


    /**
     * 2026-09-20：Y 轴范围重定：
     *
     * 同时考虑当前值 / 去年同月 / 均值，
     * 这样 YoY / 均值线不会被截顶，负净利率也能落到 0 基线之下。
     *
     * max：所有点的最大值向上十位去整（最小兜底 10）
     *  - 例：当前 35 / 去年 30 / 均值 25 → max = 40
     *  - 例：当前 30 → max = 30
     *  - 例：当前 31 → max = 40
     *  - 例：全 0 / 空 → max = 10
     *
     * min：所有点的最小值向下十位取整（只有出现负数才下沉）
     *  - 例：最小 -2.84 → min = -10（向下十位）
     *  - 例：最小 -15.5 → min = -20
     *  - 例：最小 0 → min = 0（保持原样，不下沉）
     *
     * 这样 16% 与 35% 的对比从"几乎平"变成"清晰起伏"，
     * 也不会再把 -2.84% 截掉看不到。
     */

    const allRangeValues = [
        ...values
    ];

    if (a2ShowYoY) {
        yoyData.forEach(v => {
            if (
                v !== null &&
                v !== undefined
            ) {
                allRangeValues.push(v);
            }
        });
    }

    if (a2ShowAvg) {
        allRangeValues.push(avg);
    }

    const trendMaxValue =
        allRangeValues.length > 0
            ? Math.max(...allRangeValues)
            : 10;

    const trendMinValue =
        allRangeValues.length > 0
            ? Math.min(...allRangeValues)
            : 0;

    const yMax =
        Math.ceil(
            Math.max(
                trendMaxValue,
                10
            ) / 10
        ) * 10;

    const yMin =
        trendMinValue < 0
            ? Math.floor(
                trendMinValue / 10
            ) * 10
            : 0;


    chart.setOption({

        animationDuration: 500,

        grid: {

            left: 8,

            right: 8,

            top: 35,

            bottom:
                records.length > 6
                    ? 55
                    : 30,

            containLabel: true

        },

        legend: {

            top: 0,

            left: "center",

            textStyle: {

                color: "#666",

                fontSize: 11

            },

            data:
                series.map(
                    s => s.name
                )

        },

        tooltip: {

            trigger: "axis",

            formatter: params => {

                let html =
                    params[0].axisValue;

                params.forEach(p => {

                    if (
                        p.value === null
                        || p.value === undefined
                    ) {

                        return;

                    }


                    if (
                        cfg.isPercent
                    ) {

                        html += `<br/>${p.marker} ${p.seriesName}：${Number(p.value).toFixed(2)}%`;

                    } else {

                        html += `<br/>${p.marker} ${p.seriesName}：${a2Money(p.value)}`;

                    }

                });


                return html;

            }

        },

        xAxis: {

            type: "category",

            data: labels,

            axisLine: {

                lineStyle: {

                    color: "#e5e8ec"

                }

            },

            axisLabel: {

                interval: 0,

                rotate:
                    records.length > 6
                        ? 45
                        : 0,

                color: "#8a8f98",

                fontSize: 10

            }

        },

        yAxis:
            cfg.isPercent
                ? {

                    type: "value",

                    min: yMin,

                    max: yMax,

                    interval: 10,

                    axisLabel: {

                        formatter: v =>
                            `${v}%`,

                        color: "#8a8f98",

                        fontSize: 10

                    },

                    splitLine: {

                        lineStyle: {

                            color: "#f0f2f5"

                        }

                    }

                }
                : {

                    type: "value",

                    axisLabel: {

                        formatter: a2Wan,

                        color: "#8a8f98",

                        fontSize: 10

                    },

                    splitLine: {

                        lineStyle: {

                            color: "#f0f2f5"

                        }

                    }

                },

        series

    },
    /**
     * notMerge: 同比/均值开关会增减
     * series 数量，merge 模式下旧
     * series 不会被移除，必须整体替换
     */
    { notMerge: true });

}


/**
 * =========================================================
 * 3. 成本结构：堆叠柱状图
 * =========================================================
 */

/**
 * 规整 a2SelectedMonth：
 *
 * 如果用户选中的月份已经不在当前
 * 切片里（例如把时间范围切小），
 * 自动清掉选中状态，避免显示异常。
 */

function a2NormalizeSelectedMonth(records) {

    if (!a2SelectedMonth) {

        return;

    }


    if (
        !records.some(
            r =>
                r.month ===
                    a2SelectedMonth
        )
    ) {

        a2SelectedMonth = "";

    }

}


function renderCostStack() {

    const records =
        a2AllRecords.slice(-a2Range);


    if (!records.length) {

        return;

    }


    a2NormalizeSelectedMonth(records);


    const subEl =
        document.getElementById(
            "a2CostSubtitle"
        );


    if (subEl) {

        subEl.textContent =
            `${a2MonthText(
                records[0].month
            )} - ${a2MonthText(
                records[
                    records.length - 1
                ].month
            )} · 各项成本月度金额`;

    }


    const element =
        document.getElementById(
            "a2CostStackChart"
        );


    if (!element) {

        return;

    }


    if (!window.charts) {

        window.charts = {};

    }


    if (
        window.charts.a2CostStack
        && !window.charts.a2CostStack.isDisposed()
        && window.charts.a2CostStack.getDom() !==
            element
    ) {

        window.charts.a2CostStack.dispose();

        window.charts.a2CostStack = null;

    }


    if (!window.charts.a2CostStack) {

        window.charts.a2CostStack =
            echarts.init(element);


        /**
         * 首次创建时绑定一次点击事件：
         * 点击某根柱子 → 记录月份到
         * a2SelectedMonth，然后重渲染
         * 柱状图（高亮选中列）+ 重渲染
         * 饼图（切换数据）。
         *
         * 后面 chart 被 dispose / 重建时
         * 这段会重新执行，绑定自动恢复。
         */

        window.charts.a2CostStack.on(
            "click",
            a2HandleCostStackClick
        );

    }


    const chart =
        window.charts.a2CostStack;


    const firstYear =
        Number(
            records[0].month.split("-")[0]
        );

    const labels =
        records.map(r =>
            a2MonthShort(
                r.month,
                firstYear
            )
        );


    /**
     * 成本科目逐项拆分（见 a2CostItems() 的双口径说明）
     */

    const costItems =
        a2ActiveCostItems(records);


    /**
     * 当前选中月在 records 中的索引
     *
     * -1 = 未选中 / 默认（即「最新月」）
     */

    const selectedIdx =
        a2SelectedMonth
            ? records.findIndex(
                r =>
                    r.month ===
                        a2SelectedMonth
            )
            : -1;


    chart.setOption({

        animationDuration: 500,

        grid: {

            left: 8,

            right: 8,

            top: 58,

            bottom:
                records.length > 6
                    ? 55
                    : 30,

            containLabel: true

        },

        legend: {

            top: 2,

            left: "center",

            width: "92%",

            itemWidth: 11,

            itemHeight: 11,

            itemGap: 8,

            textStyle: {

                color: "#666",

                fontSize: 10

            }

        },

        tooltip: {

            trigger: "axis",

            axisPointer: {

                type: "shadow"

            },

            formatter: params => {

                let html =
                    params[0].axisValue;

                let total = 0;

                params.forEach(p => {

                    const v =
                        Number(p.value || 0);

                    total += v;

                    html += `<br/>${p.marker} ${p.seriesName}：${a2Money(v)}`;

                });


                /**
                 * 选中月提示用户「点击查看饼图」，
                 * 引导性更强
                 */

                html += `<br/><span style="color:#3478f6">点击此列 → 下方饼图切换到该月</span>`;

                html += `<br/><strong>合计：${a2Money(total)}</strong>`;

                return html;

            }

        },

        xAxis: {

            type: "category",

            data: labels,

            axisLine: {

                lineStyle: {

                    color: "#e5e8ec"

                }

            },

            axisLabel: {

                interval: 0,

                rotate:
                    records.length > 6
                        ? 45
                        : 0,

                color:
                    idx =>
                        selectedIdx >= 0 &&
                        idx === selectedIdx
                            ? "#3478f6"
                            : "#8a8f98",

                fontWeight: idx =>
                        selectedIdx >= 0 &&
                        idx === selectedIdx
                            ? 700
                            : 400,

                fontSize: 10

            }

        },

        yAxis: {

            type: "value",

            axisLabel: {

                formatter: a2Wan,

                color: "#8a8f98",

                fontSize: 10

            },

            splitLine: {

                lineStyle: {

                    color: "#f0f2f5"

                }

            }

        },

        series:
            costItems.map(item => ({

                name: item.label,

                type: "bar",

                stack: "cost",

                /**
                 * 鼠标手势：
                 * 提示用户该柱可点击
                 */

                cursor: "pointer",

                /**
                 * 选中月之外的其他月份
                 * 用 opacity 调暗，
                 * 让用户一眼看到选中哪一列
                 */

                data:
                    records.map(
                        (r, i) => {

                            const dim =
                                selectedIdx >=
                                    0 &&
                                i !==
                                    selectedIdx;


                            return {

                                value:
                                    item.get(r),

                                itemStyle:
                                    dim
                                        ? {
                                            color: item.color,
                                            opacity: 0.28
                                        }
                                        : {
                                            color: item.color,
                                            opacity: 1
                                        }

                            };

                        }
                    ),

                itemStyle: {

                    color: item.color

                },

                barMaxWidth: 32

            }))

    }, { notMerge: true });

}


/**
 * =========================================================
 * 成本结构：堆叠柱状图点击处理
 * =========================================================
 */

function a2HandleCostStackClick(params) {

    if (
        !params
        || params.componentType !==
            "series"
        || typeof params.dataIndex !==
            "number"
    ) {

        return;

    }


    const records =
        a2AllRecords.slice(-a2Range);

    const i = params.dataIndex;


    if (
        i < 0
        || i >= records.length
    ) {

        return;

    }


    const clicked =
        records[i].month;


    /**
     * 再次点击同一列 → 取消选择（恢复最新月）
     */

    if (
        a2SelectedMonth ===
        clicked
    ) {

        a2SelectedMonth = "";

    } else {

        a2SelectedMonth =
            clicked;

    }


    renderCostStack();

    renderCostPie();

}


/**
 * =========================================================
 * 3. 成本结构：当月成本饼图
 * =========================================================
 */

function renderCostPie() {

    const records =
        a2AllRecords.slice(-a2Range);


    if (!records.length) {

        return;

    }


    a2NormalizeSelectedMonth(records);


    /**
     * 选定月份所在索引
     *
     *  -1  = 未选中，默认取最新月
     *  >=0 = 用户点击柱状图选中的某个月
     *
     * 若选中的月份已被当前切片淘汰
     * （例如切到了更短的时间范围），
     * 自动回归最新月。
     */

    const idx =
        a2SelectedMonth
            ? records.findIndex(
                r =>
                    r.month ===
                        a2SelectedMonth
            )
            : -1;

    const isCustom = idx >= 0;

    const latest = records[records.length - 1];

    const target =
        isCustom
            ? records[idx]
            : latest;


    if (
        a2SelectedMonth
        && !isCustom
    ) {

        a2SelectedMonth = "";

    }


    /**
     * 当月各项成本
     * （有「成本数据」段走新口径，否则回退旧口径，
     *   见 a2CostItems()）
     */
    const costItems =
        a2ActiveCostItems(records);

    const data =
        costItems.map(item => ({

            name: item.label,

            value: item.get(target)

        }));


    /**
     * 更新分隔条：
     *  - 默认    ：「当月成本占比」
     *  - 选中月  ：「YYYY年M月 成本占比」
     * 并按需展示「× 恢复最新」按钮
     */

    const titleEl =
        document.getElementById(
            "a2CostPieTitle"
        );

    const resetBtn =
        document.getElementById(
            "a2CostPieReset"
        );


    if (titleEl) {

        const labelEl =
            titleEl.querySelector(
                ".a2-cost-divider-label"
            );


        if (labelEl) {

            labelEl.textContent =
                isCustom
                    ? `${a2MonthText(
                        target.month
                    )} 成本占比`
                    : "当月成本占比";

        }

    }


    if (resetBtn) {

        resetBtn.hidden = !isCustom;

    }


    const element =
        document.getElementById(
            "a2CostPieChart"
        );


    if (!element) {

        return;

    }


    /**
     * 饼图几何自适应
     *
     *  - 旧口径（≤8 项）：图例单行即可放下，沿用原半径与圆心
     *  - 新口径（9 项）：图例折两行，收一圈给外置标签留空间
     *  - 窄屏：再收一圈，避免左右两侧标签被容器边缘裁切
     *
     * 容器高度由 css/analysis2.css 的 #a2CostPieChart 提供。
     */

    const pieWidth =
        element.clientWidth
        || element.offsetWidth
        || 0;

    const isNarrowPie =
        pieWidth > 0
        && pieWidth < 440;

    const isDensePie =
        costItems.length > 8;


    let pieRadius = ["45%", "70%"];

    let pieCenter = ["50%", "45%"];


    if (isDensePie) {

        pieRadius = ["42%", "66%"];

        pieCenter = ["50%", "42%"];

    }


    if (isNarrowPie) {

        pieRadius = ["36%", "58%"];

        pieCenter = ["50%", "41%"];

    }


    if (!window.charts) {

        window.charts = {};

    }


    if (
        window.charts.a2CostPie
        && !window.charts.a2CostPie.isDisposed()
        && window.charts.a2CostPie.getDom() !==
            element
    ) {

        window.charts.a2CostPie.dispose();

        window.charts.a2CostPie = null;

    }


    if (!window.charts.a2CostPie) {

        window.charts.a2CostPie =
            echarts.init(element);

    }


    const chart =
        window.charts.a2CostPie;


    chart.setOption({

        animationDuration: 500,

        tooltip: {

            trigger: "item",

            formatter: p =>
                `${p.name}<br/>${a2Money(p.value)}<br/>占比 ${p.percent.toFixed(1)}%`

        },

        legend: {

            bottom: 0,

            left: "center",

            width: "92%",

            itemWidth: 11,

            itemHeight: 11,

            itemGap: 8,

            textStyle: {

                color: "#666",

                fontSize: 10

            }

        },

        color:
            costItems.map(
                item => item.color
            ),

        series: [{

            type: "pie",

            /**
             * 新口径最多 9 项，图例在窄屏会折成两行；
             * 圆心与半径按容器宽度自适应
             *（窄屏收一圈避免标签被裁切），
             * 配合 #a2CostPieChart 的加高（css/analysis2.css），
             * 让外置标签既不被裁切、也不压住底部图例。
             */

            radius: pieRadius,

            center: pieCenter,

            avoidLabelOverlap: true,

            label: {

                show: true,

                position: "outside",

                /**
                 * 外置标签用短名（item.short），
                 * 避免「宿舍水电燃气管理费」这类长科目
                 * 在手机端溢出；图例与 tooltip 仍显示全名。
                 */

                formatter: p => {

                    const item =
                        costItems.find(
                            i =>
                                i.label === p.name
                        );

                    const shown =
                        (item && item.short)
                        || p.name;

                    return `${shown}\n${p.percent.toFixed(1)}%`;

                },

                fontSize: 10,

                color: "#666"

            },

            labelLine: {

                show: true,

                length: 6,

                length2: 8

            },

            data:
                data.filter(
                    d =>
                        d.value > 0
                )

        }]

    });

}


/**
 * =========================================================
 * 4. 利润瀑布图
 *
 * 公式（用户在 2026-09-20 给定，与
 * pages/analysis2.html 里的 .a2-waterfall-formula 同步）：
 *
 * 营业收入 = 货佬款项 + 员工工资 + 员工社保
 *          + 宿舍房租 + 宿舍水电费
 *          + 店铺水电费 + 店铺租金
 *          + 总手续费 + 净利润
 *
 * 实现方式：堆叠柱状图 + 透明 placeholder。
 * - 起点柱（营业收入）：placeholder=0，value=revenue
 * - 扣减柱：        placeholder=当前层高度 - cost，value=cost
 * - 终点柱（净利润）：placeholder=0，value=netProfit
 *
 * 9 个扣减项 + 1 个起点柱 + 1 个终点柱，
 * 按 nodes 数组顺序渲染。
 *
 * 8 项扣减之和可能与 (revenue - netProfit) 不完全相等，
 * 差额由「其他调整」一项自动闭合瀑布链路，避免视觉断链。
 * =========================================================
 */

function renderWaterfall() {

    const records =
        a2AllRecords.slice(-a2Range);


    if (!records.length) {

        return;

    }


    const latest =
        records[records.length - 1];


    const subEl =
        document.getElementById(
            "a2WaterfallSubtitle"
        );


    if (subEl) {

        subEl.textContent =
            `${a2MonthText(
                latest.month
            )} · 从收入到净利润的扣减链路`;

    }


    const revenue =
        Number(latest.revenue || 0);


    /**
     * -----------------------------------------------------
     * 利润瀑布拆解明细
     *
     * 公式：营业收入 = 货佬款项 + 员工工资 + 员工社保
     *             + 宿舍房租 + 宿舍水电费
     *             + 店铺水电费 + 店铺租金
     *             + 总手续费 + 总公司运营支出 + 耗材支出
     *             + 净利润
     *
     * 注意：10 项扣减必须与上方 HTML 静态公式条一一对应。
     * 修改此处时，记得同步更新 pages/analysis2.html 里
     * `.a2-waterfall-formula` 的文本。
     *
     * 固定支出相关科目（员工工资 / 员工社保 / 宿舍房租 /
     * 宿舍水电费 / 店铺水电费 / 店铺租金）统一走
     * getFixedItem()，即优先读 TXT「固定支出数据如下」块。
     *
     * 【2026-09-21 修复】
     * 此前这里直接读 latest.dormitoryUtility，
     * 而该字段在经营简报里恒为 0 —— 真实值
     * 「宿舍水电燃气管理费」只在固定支出块里，
     * 导致瀑布图「宿舍水电费」一直显示 0。
     * -----------------------------------------------------
     */

    const supplierPayment =
        Number(
            latest.supplierPayment || 0
        );

    const salary =
        getFixedItem(
            latest,
            "salary"
        );

    const socialSecurity =
        getFixedItem(
            latest,
            "socialSecurity"
        );

    const dormitoryRent =
        getFixedItem(
            latest,
            "dormitoryRent"
        );

    const dormitoryUtility =
        getFixedItem(
            latest,
            "dormitoryUtility"
        );

    const waterElectricity =
        getFixedItem(
            latest,
            "waterElectricity"
        );

    const rent =
        getFixedItem(
            latest,
            "rent"
        );

    const totalFee =
        Number(latest.totalFee || 0);

    const hqExpense =
        Number(
            latest.hqExpense || 0
        );

    const consumableExpense =
        Number(
            latest.consumableExpense || 0
        );

    const netProfit =
        Number(latest.netProfit || 0);


    /**
     * 动态构建瀑布节点（10 项扣减柱）
     *
     * 按用户在 2026-09-20 的口径：
     * 不再加「其他调整」自动闭合逻辑，
     * 10 项扣减之和与 TXT 净利润若有差额，由视觉自然吸收。
     */

    const nodes = [

        {
            label: "营业收入",
            value: revenue,
            color: "#3478f6"
        },

        {
            label: "- 货佬款项",
            value: supplierPayment,
            color: "#ef233c"
        },

        {
            label: "- 员工工资",
            value: salary,
            color: "#ef233c"
        },

        {
            label: "- 员工社保",
            value: socialSecurity,
            color: "#ef233c"
        },

        {
            label: "- 宿舍房租",
            value: dormitoryRent,
            color: "#ef233c"
        },

        {
            label: "- 宿舍水电费",
            value: dormitoryUtility,
            color: "#ef233c"
        },

        {
            label: "- 店铺水电费",
            value: waterElectricity,
            color: "#ef233c"
        },

        {
            label: "- 店铺租金",
            value: rent,
            color: "#ef233c"
        },

        {
            label: "- 总手续费",
            value: totalFee,
            color: "#ef233c"
        },

        {
            label: "- 总公司运营支出",
            value: hqExpense,
            color: "#ef233c"
        },

        {
            label: "- 耗材支出",
            value: consumableExpense,
            color: "#ef233c"
        },

        {
            /**
             * 净利润固定按 TXT 中的「净利润本月」画出，
             * 不参与 10 项扣减的求和闭环。
             */
            label: "净利润",
            value: netProfit,
            color: "#16a36a"
        }

    ];


    /**
     * -----------------------------------------------------
     * 视觉对齐
     *
     * 「净利润」柱仍按 TXT 中的实际净利画出（起点 0，高度 netProfit）。
     * 若 10 项扣减之和与 (营业收入 - 净利润) 不完全相等，
     * 差额由「净利润」柱高度自然吸收，不另算「其他调整」。
     *
     * level 复用了原 waterfall 的「每根柱子起点高度」算法。
     * -----------------------------------------------------
     */


    const stepLabels =
        nodes.map(
            n => n.label
        );


    /**
     * 响应式布局（≥600 / 360-600 / <360 三段）
     *
     * displayLabels 给 ECharts X 轴显示：
     *   宽屏用 stepLabels 原文；
     *   小屏走 A2_WATERFALL_LABEL_SHORT 简称。
     *
     * tooltip 仍然读 stepLabels，保持原全名。
     */

    const layout =
        a2WaterfallLayout();


    a2WaterfallBucket =
        layout.bucket;


    const displayLabels =
        layout.labelMode === "short"
            ? stepLabels.map(
                l =>
                    A2_WATERFALL_LABEL_SHORT[l]
                    || l
            )
            : stepLabels;


    /**
     * 计算每根柱子的
     * "堆叠底"（starts）与"高度"（heights）
     *
     * level 表示当前瀑布所处的高度。
     */

    let level = revenue;

    const starts = [];

    const heights = [];


    nodes.forEach((n, i) => {

        if (i === 0) {

            /**
             * 起点柱：从 0 开始
             */

            starts.push(0);

            heights.push(n.value);

            return;

        }


        if (
            n.label === "净利润"
        ) {

            /**
             * 终点柱：从 0 开始
             */

            starts.push(0);

            heights.push(n.value);

            return;

        }


        if (
            n.label.startsWith("+")
        ) {

            /**
             * 向上调整柱：
             * 从当前 level 向上延伸，
             * level 抬升
             */

            starts.push(level);

            heights.push(n.value);

            level += n.value;

            return;

        }


        /**
         * 常规扣减柱：
         * 从当前 level 向下扣减，
         * level 下沉
         */

        level -= n.value;

        starts.push(level);

        heights.push(n.value);

    });


    const element =
        document.getElementById(
            "a2WaterfallChart"
        );


    if (!element) {

        return;

    }


    if (!window.charts) {

        window.charts = {};

    }


    if (
        window.charts.a2Waterfall
        && !window.charts.a2Waterfall.isDisposed()
        && window.charts.a2Waterfall.getDom() !==
            element
    ) {

        window.charts.a2Waterfall.dispose();

        window.charts.a2Waterfall = null;

    }


    if (!window.charts.a2Waterfall) {

        window.charts.a2Waterfall =
            echarts.init(element);

    }


    const chart =
        window.charts.a2Waterfall;


    chart.setOption({

        animationDuration: 500,

        grid: {

            left: 8,

            right: 8,

            top: 30,

            bottom: layout.bottom,

            containLabel: true

        },

        tooltip: {

            trigger: "axis",

            axisPointer: {

                type: "shadow"

            },

            formatter: params => {

                /**
                 * value series 在 params[1]，
                 * placeholder 在 params[0]
                 */

                const p =
                    params.find(
                        x =>
                            x.seriesName ===
                                "value"
                    ) ||
                    params[1] ||
                    params[0];

                const idx =
                    p.dataIndex;

                const label =
                    stepLabels[idx];

                const val =
                    Number(
                        heights[idx] || 0
                    );


                return `${label}<br/>${a2Money(Math.abs(val))}`;

            }

        },

        xAxis: {

            type: "category",

            data: displayLabels,

            axisLine: {

                lineStyle: {

                    color: "#e5e8ec"

                }

            },

            axisLabel: {

                color: "#8a8f98",

                fontSize: layout.fontSize,

                rotate: layout.rotate,

                hideOverlap: layout.hideOverlap,

                interval: 0

            }

        },

        yAxis: {

            type: "value",

            axisLabel: {

                formatter: a2Wan,

                color: "#8a8f98",

                fontSize: 10

            },

            splitLine: {

                lineStyle: {

                    color: "#f0f2f5"

                }

            }

        },

        series: [

            {
                /**
                 * 透明占位柱：决定
                 * "扣减柱"的视觉起点
                 */

                name: "placeholder",

                type: "bar",

                stack: "total",

                silent: true,

                itemStyle: {

                    color: "transparent"

                },

                emphasis: {

                    itemStyle: {

                        color: "transparent"

                    }

                },

                data: starts

            },

            {
                /**
                 * 实际显示柱
                 */
                name: "value",

                type: "bar",

                stack: "total",

                label: {

                    show: true,

                    position: "top",

                    formatter: p =>
                        a2Wan(
                            Math.abs(
                                heights[
                                    p.dataIndex
                                ] || 0
                            )
                        ),

                    color: "#666",

                    fontSize: 10

                },

                data:
                    heights.map(
                        (h, i) => {

                            return {

                                value: h,

                                itemStyle: {

                                    color:
                                        nodes[i]
                                            .color

                                }

                            };

                        }
                    ),

                /**
                 * 12 根柱子的瀑布图（1 起点 + 10 扣减 + 1 终点），
                 * barMaxWidth 收到 28 保证 H5 卡片宽度内不被裁切。
                 */

                barMaxWidth: 28

            }

        ]

    });


    /**
     * 同时渲染文字版兜底
     */

    a2RenderWaterfallFallback(
        nodes
    );

}


/**
 * 瀑布图文字版兜底（图表渲染失败时显示）
 */

function a2RenderWaterfallFallback(
    nodes
) {

    const fb =
        document.getElementById(
            "a2WaterfallFallback"
        );


    if (!fb) {

        return;

    }


    fb.innerHTML =
        nodes
            .map((n, i) => {

                const isStart =
                    i === 0;

                const isEnd =
                    n.label ===
                        "净利润";

                const isDeduct =
                    n.label.startsWith(
                        "-"
                    ) && !isStart;

                const typeClass =
                    isEnd
                        ? "total"
                        : isDeduct
                            ? "negative"
                            : "positive";


                return `

                <div class="a2-waterfall-row ${typeClass === "total" ? "total" : ""}">

                    <div class="a2-waterfall-name">
                        ${n.label}
                    </div>

                    <div class="a2-waterfall-amount ${typeClass === "negative" ? "negative" : typeClass === "positive" ? "positive" : ""}">

                        ${a2Money(Math.abs(n.value))}

                    </div>

                </div>

            `;

            })
            .join("");

}


/**
 * =========================================================
 * 6. 经营简报 / 异常提示
 * =========================================================
 *
 * 数据源：TXT 的「经营简报:」段落（由 data.js 中的
 *   getBriefing() 解析为 record.briefing 字符串）。
 *
 * 显隐规则：
 *   - 没有简报内容（null / 仅空白）→ 隐藏整张卡
 *   - 有简报内容                  → 显示，按 .pre + pre-wrap
 *                              保留原 TXT 的换行和缩进
 *
 * 由于简报是「门店当月」叙事，绑定在最后一条 record 上。
 * 用户切换月份（range 12m / 6m）时这条内容不变，因此
 * 不需要重渲染；切换门店（loadPage 重新跑 initAnalysis2Page）
 * 时整页都会重新构建，所以这里走一次性渲染即可。
 * =========================================================
 */

function renderBriefing() {

    const section =
        document.getElementById(
            "a2BriefingSection"
        );


    if (!section) {

        return;

    }


    /**
     * 没有数据时直接走隐藏分支。
     */

    if (!a2AllRecords.length) {

        section.hidden = true;

        return;

    }


    const latest =
        a2AllRecords[
            a2AllRecords.length - 1
        ];


    const briefing =
        latest && latest.briefing
            ? String(latest.briefing).trim()
            : "";


    /**
     * -----------------------------------------------------
     * 无简报 → 隐藏整张卡，不在卡片里留任何占位。
     * 这是用户明确要求的行为：
     * 「如果能够读取到简报内容，就添加并显示
     *    经营简报 的UI，没有读取到就不显示」
     * -----------------------------------------------------
     */

    if (!briefing) {

        section.hidden = true;

        return;

    }


    const contentEl =
        document.getElementById(
            "a2BriefingContent"
        );


    if (contentEl) {

        /**
         * textContent 自动 escape，不会执行 HTML，
         * 与 white-space: pre-wrap 配合使用：
         *   - 保留「空行 → 段落分隔」
         *   - 保留「  · 外卖运营费…」缩进
         *   - 长行自动换行（word-break 兜底）
         */

        contentEl.textContent =
            briefing;

    }


    section.hidden = false;

}


/**
 * =========================================================
 * 筛选交互
 * =========================================================
 */

function bindA2Filters() {

    const chips =
        document.querySelectorAll(
            ".a2-chip-group .a2-chip"
        );


    chips.forEach(chip => {

        chip.addEventListener(
            "click",
            () => {

                const group =
                    chip.parentElement;

                const filter =
                    group.dataset.filter;

                group
                    .querySelectorAll(
                        ".a2-chip"
                    )
                    .forEach(
                        c =>
                            c.classList.remove(
                                "active"
                            )
                    );

                chip.classList.add(
                    "active"
                );


                const v =
                    chip.dataset.value;


                if (filter === "range") {

                    a2Range =
                        Number(v);


                    renderKPI();

                    renderTrend();

                    renderCostStack();

                    renderCostPie();

                    renderWaterfall();

                } else if (
                    filter === "metric"
                ) {

                    a2Metric = v;


                    renderTrend();

                }

            }
        );

    });


    const yoyBox =
        document.getElementById(
            "a2ToggleYoY"
        );


    if (yoyBox) {

        yoyBox.addEventListener(
            "change",
            () => {

                a2ShowYoY =
                    yoyBox.checked;


                renderTrend();

            }
        );

    }


    const avgBox =
        document.getElementById(
            "a2ToggleAvg"
        );


    if (avgBox) {

        avgBox.addEventListener(
            "change",
            () => {

                a2ShowAvg =
                    avgBox.checked;


                renderTrend();

            }
        );

    }


    /**
     * 成本结构：饼图分隔条上的
     * 「× 恢复最新」按钮，
     * 清掉柱状图的选中状态，
     * 让饼图回到「最新月」默认数据
     */

    const resetBtn =
        document.getElementById(
            "a2CostPieReset"
        );


    if (resetBtn) {

        resetBtn.addEventListener(
            "click",
            () => {

                if (!a2SelectedMonth) {

                    return;

                }


                a2SelectedMonth = "";

                renderCostStack();

                renderCostPie();

            }
        );

    }

}


/**
 * =========================================================
 * 窗口尺寸变化
 * =========================================================
 */

function resizeAnalysis2Charts() {

    if (!window.charts) {

        return;

    }


    /**
     * 瀑布图特殊处理：
     * chart.resize() 只重排画布，不能改 X 轴字号 / rotate /
     * 短标签。如果当前断点发生了变化，则销毁旧实例并
     * 重新走 renderWaterfall()，让 a2WaterfallLayout() 重新
     * 给出这一格的预设。
     *
     * 同断点内只需要 .resize()，避免无谓的销毁。
     */

    if (
        window.charts.a2Waterfall
        && !window.charts.a2Waterfall.isDisposed()
    ) {

        const nextBucket =
            a2WaterfallLayout().bucket;


        if (
            a2WaterfallBucket
            && nextBucket !== a2WaterfallBucket
        ) {

            window.charts.a2Waterfall.dispose();

            window.charts.a2Waterfall = null;


            if (
                typeof renderWaterfall ===
                "function"
            ) {

                renderWaterfall();

            }

        } else {

            window.charts.a2Waterfall.resize();

        }

    }


    [
        "a2Trend",
        "a2CostStack",
        "a2CostPie"
    ].forEach(key => {

        if (
            window.charts[key]
            && !window.charts[key].isDisposed()
        ) {

            window.charts[key].resize();

        }

    });

}