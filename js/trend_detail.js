/**
 * =========================================================
 * 通用趋势图详情页
 * =========================================================
 *
 * 通过 loadPage("trendDetail") 动态加载
 *
 * URL 参数：
 *
 * ?page=trendDetail
 * &store=西乡店
 * &month=2026-08
 * &title=店铺租金
 * &field=rent
 *
 * =========================================================
 */


/**
 * 当前参数
 */
let trendStore = "";
let trendMonth = "";
let trendTitle = "费用趋势";
let trendField = "";

function getTrendQueryParams() {

    console.log(
        "========== 获取趋势详情参数 =========="
    );


    /**
     * loadPage() 动态加载时
     * 从全局参数读取
     */
    const params =
        window.trendDetailParams;


    if (!params) {

        console.error(
            "没有找到 trendDetailParams"
        );

        return false;

    }


    trendStore =
        params.store || "";


    trendMonth =
        params.month || "";


    trendTitle =
        params.title || "费用趋势";


    trendField =
        params.field || "";


    console.log(
        "门店：",
        trendStore
    );

    console.log(
        "月份：",
        trendMonth
    );

    console.log(
        "标题：",
        trendTitle
    );

    console.log(
        "字段：",
        trendField
    );


    return true;

}


/**
 * ECharts 实例
 */
let trendChart = null;




/**
 * =========================================================
 * 初始化页面
 * =========================================================
 *
 * 注意：
 *
 * 这个方法由 app.js 的 loadPage()
 * 主动调用。
 *
 * 不再依赖 DOMContentLoaded。
 * =========================================================
 */
async function initTrendDetailPage() {

    console.log(
        "========== 初始化趋势详情页 =========="
    );


    /**
     * 获取趋势参数
     */
    const hasParams = getTrendQueryParams();


    if (!hasParams) {

        console.error(
            "趋势详情页参数获取失败"
        );

        return;

    }


    /**
     * 检查门店
     */
    if (!trendStore) {

        console.error(
            "趋势详情页没有门店参数"
        );

        return;

    }


    /**
     * 检查字段
     */
    if (!trendField) {

        console.error(
            "趋势详情页没有 field 参数"
        );

        return;

    }


    console.log(
        "开始初始化：",
        trendStore,
        trendMonth,
        trendTitle,
        trendField
    );


    /**
     * 更新标题
     * （使用公共 PageHeader 组件渲染的固定 ID）
     */
    const titleElement =
        document.getElementById(
            "pageHeaderTitle"
        );


    if (titleElement) {

        titleElement.textContent =
            trendTitle;

    }


    /**
     * 更新副标题
     */
    const subtitleElement =
        document.getElementById(
            "trendDetailSubtitle"
        );


    if (subtitleElement) {

        subtitleElement.textContent =
            `${trendStore} · 近12个月`;

    }


    /**
     * 更新图表标题
     */
    const chartTitleElement =
        document.getElementById(
            "trendChartTitle"
        );


    if (chartTitleElement) {

        chartTitleElement.textContent =
            `${trendTitle}趋势`;

    }


    /**
     * 更新图表副标题
     */
    const chartSubtitleElement =
        document.getElementById(
            "trendChartSubtitle"
        );


    if (chartSubtitleElement) {

        chartSubtitleElement.textContent =
            `${trendStore} · 近12个月`;

    }


    /**
     * 返回按钮
     * 注：返回按钮的渲染与点击由 PageHeader 组件统一处理，
     * 默认行为即 history.back() → loadPage("home")，
     * 故此处不再单独绑定。
     */


    /**
     * 加载趋势数据
     */
    await loadTrendData();


    /**
     * 调整图表尺寸
     */
    setTimeout(
        function () {

            if (trendChart) {

                trendChart.resize();

            }

        },
        100
    );

}


/**
 * =========================================================
 * 加载近12个月数据
 * =========================================================
 */
async function loadTrendData() {

    console.log(
        "========== 开始加载趋势数据 =========="
    );


    /**
     * 获取门店历史月份
     */
    const months =
        getMonths(
            trendStore
        );


    console.log(
        "门店可用月份：",
        months
    );


    if (
        !months ||
        months.length === 0
    ) {

        console.warn(
            "没有找到门店历史月份：",
            trendStore
        );


        renderTrendChart(
            [],
            []
        );


        return;

    }


    /**
     * 最近12个月
     */
    const targetMonths =
        months
            .slice()
            .sort()
            .reverse()
            .slice(
                0,
                12
            )
            .reverse();


    console.log(
        "趋势图读取月份：",
        targetMonths
    );


    const labels = [];

    const values = [];


    /**
     * 逐月读取
     */
    for (
        const month of targetMonths
    ) {

        try {

            console.log(
                "正在读取：",
                trendStore,
                month
            );


            const record =
                await loadStoreData(
                    trendStore,
                    month
                );


            console.log(
                "解析结果：",
                record
            );


            if (!record) {

                continue;

            }


            const rawValue =
                record[
                trendField
                ];


            const value =
                Number(
                    rawValue
                );


            console.log(
                `${month} ${trendField}:`,
                rawValue,
                "=>",
                value
            );


            labels.push(
                month
            );


            values.push(

                Number.isFinite(value)
                    ? value
                    : 0

            );


        } catch (error) {

            console.error(
                `读取 ${month} 失败：`,
                error
            );

        }

    }


    console.log(
        "========== 最终趋势图数据 =========="
    );

    console.log(
        "labels =",
        labels
    );

    console.log(
        "values =",
        values
    );


    renderTrendChart(
        labels,
        values
    );

}


/**
 * =========================================================
 * 创建趋势图
 * =========================================================
 */
function renderTrendChart(
    labels,
    values
) {

    const chartDom =
        document.getElementById(
            "trendDetailChart"
        );


    if (!chartDom) {

        console.error(
            "找不到 trendDetailChart"
        );

        return;

    }


    /**
     * ECharts 是否已经加载
     */
    if (
        typeof echarts ===
        "undefined"
    ) {

        console.error(
            "ECharts 没有加载"
        );

        return;

    }


    /**
     * 如果之前存在图表
     * 先销毁
     */
    if (trendChart) {

        trendChart.dispose();

        trendChart = null;

    }


    /**
     * 创建 ECharts
     */
    trendChart =
        echarts.init(
            chartDom
        );


    /**
     * 图表配置
     */
    const option = {

        tooltip: {

            trigger: "axis",

            formatter: function (
                params
            ) {

                if (
                    !params ||
                    params.length === 0
                ) {

                    return "";

                }


                const item =
                    params[0];


                const value =
                    Number(
                        item.value
                    );


                return `
                    ${item.axisValue}<br>
                    ${trendTitle}：
                    <strong>
                        ¥${value.toLocaleString(
                    "zh-CN",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                )}
                    </strong>
                `;

            }

        },


        grid: {

            left: 60,

            right: 20,

            top: 30,

            bottom: 50

        },


        xAxis: {

            type: "category",

            data: labels,

            boundaryGap: false

        },


        yAxis: {

            type: "value",

            axisLabel: {

                formatter: function (
                    value
                ) {

                    return (
                        "¥" +
                        Number(
                            value
                        ).toLocaleString(
                            "zh-CN"
                        )
                    );

                }

            }

        },


        series: [

            {

                name:
                    trendTitle,

                type:
                    "line",

                data:
                    values,

                smooth:
                    true,

                symbol:
                    "circle",

                symbolSize:
                    7,

                areaStyle:
                    {}

            }

        ]

    };


    trendChart.setOption(
        option
    );


    /**
     * 强制刷新尺寸
     */
    setTimeout(
        function () {

            if (trendChart) {

                trendChart.resize();

            }

        },
        50
    );

}


/**
 * =========================================================
 * 调整图表尺寸
 * =========================================================
 */
function resizeTrendDetailChart() {

    if (trendChart) {

        trendChart.resize();

    }

}


/**
 * =========================================================
 * 窗口尺寸变化
 * =========================================================
 */
window.addEventListener(
    "resize",
    function () {

        resizeTrendDetailChart();

    }
);