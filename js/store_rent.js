/**
 * =========================================================
 * 店铺租金详情页
 * =========================================================
 */

let storeRentChart = null;


/**
 * =========================================================
 * 获取 URL 中的门店
 * =========================================================
 */
function getStoreRentStore() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return (
        params.get("store") ||
        "西乡店"
    );

}


/**
 * =========================================================
 * 初始化
 * =========================================================
 */
async function initStoreRentPage() {

    console.log(
        "========== 店铺租金页面初始化 =========="
    );

    /**
     * 自定义返回逻辑：
     * 跳转到带当前门店参数的首页（store 参数会从 URL 读取）
     *
     * 这里重新调用 mountPageHeader（传入完整参数），
     * 主要是为了覆盖默认的返回行为。
     */
    mountPageHeader({
        title: "店铺租金",
        subtitleId: "storeRentSubtitle",
        showBack: true,
        onBack: function () {

            const store =
                getStoreRentStore();

            window.location.href =
                "index.html?store=" +
                encodeURIComponent(store);

        }
    });

    const store =
        getStoreRentStore();


    console.log(
        "当前门店：",
        store
    );


    const subtitle =
        document.getElementById(
            "storeRentSubtitle"
        );


    if (subtitle) {

        subtitle.textContent =
            `${store} · 近一年租金趋势`;

    }


    /**
     * -----------------------------------------------------
     * 获取当前门店月份
     * -----------------------------------------------------
     */

    const months =
        getMonths(store);


    console.log(
        "可用月份：",
        months
    );


    if (!months || months.length === 0) {

        console.warn(
            "没有找到门店月份数据：",
            store
        );

        return;

    }


    /**
     * -----------------------------------------------------
     * 近一年
     *
     * 目前 TXT 有几个就读取几个。
     *
     * 后续月份增加以后自动形成近一年趋势。
     * -----------------------------------------------------
     */

    const recentMonths =
        months
            .slice(0, 12)
            .reverse();


    console.log(
        "读取租金月份：",
        recentMonths
    );


    const labels = [];

    const values = [];


    /**
     * -----------------------------------------------------
     * 逐月读取 TXT
     * -----------------------------------------------------
     */

    for (
        const month of recentMonths
    ) {

        try {

            const record =
                await loadStoreData(
                    store,
                    month
                );


            console.log(
                `【${month}】租金：`,
                record.rent
            );


            labels.push(
                month
            );


            values.push(
                Number(record.rent || 0)
            );


        } catch (error) {

            console.error(
                `读取 ${month} 租金失败：`,
                error
            );


            labels.push(
                month
            );


            values.push(
                0
            );

        }

    }


    console.log(
        "租金趋势数据：",
        labels,
        values
    );


    /**
     * -----------------------------------------------------
     * 当前月份
     * -----------------------------------------------------
     */

    const latestMonth =
        recentMonths[
            recentMonths.length - 1
        ];


    const latestIndex =
        recentMonths.length - 1;


    const currentRent =
        values[latestIndex] || 0;


    const currentMonthElement =
        document.getElementById(
            "currentRentMonth"
        );


    if (currentMonthElement) {

        currentMonthElement.textContent =
            latestMonth;

    }


    const currentRentElement =
        document.getElementById(
            "currentRent"
        );


    if (currentRentElement) {

        currentRentElement.textContent =
            formatMoney(currentRent);

    }


    /**
     * -----------------------------------------------------
     * 创建图表
     * -----------------------------------------------------
     */

    renderStoreRentChart(
        labels,
        values
    );

}


/**
 * =========================================================
 * 金额格式化
 * =========================================================
 */
function formatMoney(value) {

    return "¥" +
        Number(value || 0)
            .toLocaleString(
                "zh-CN",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

}


/**
 * =========================================================
 * 创建租金趋势图
 * =========================================================
 */
function renderStoreRentChart(
    labels,
    values
) {

    const element =
        document.getElementById(
            "storeRentTrend"
        );


    if (!element) {

        console.error(
            "找不到 storeRentTrend"
        );

        return;

    }


    if (
        typeof echarts ===
        "undefined"
    ) {

        console.error(
            "ECharts 未加载"
        );

        return;

    }


    /**
     * 如果之前存在图表
     * 先销毁
     */

    if (storeRentChart) {

        storeRentChart.dispose();

        storeRentChart = null;

    }


    storeRentChart =
        echarts.init(
            element
        );


    const option = {

        tooltip: {

            trigger: "axis",

            formatter: function(params) {

                if (
                    !params ||
                    params.length === 0
                ) {

                    return "";

                }


                const item =
                    params[0];


                return `
                    ${item.axisValue}<br>
                    店铺租金：
                    <strong>
                        ${formatMoney(item.value)}
                    </strong>
                `;

            }

        },


        grid: {

            left: 15,

            right: 15,

            top: 30,

            bottom: 30,

            containLabel: true

        },


        xAxis: {

            type: "category",

            data: labels,

            boundaryGap: false

        },


        yAxis: {

            type: "value",

            axisLabel: {

                formatter: function(value) {

                    return (
                        "¥" +
                        Number(value)
                            .toLocaleString(
                                "zh-CN"
                            )
                    );

                }

            }

        },


        series: [

            {

                name: "店铺租金",

                type: "line",

                data: values,

                smooth: true,

                symbol: "circle",

                symbolSize: 7,

                areaStyle: {},

                label: {

                    show: true,

                    formatter: function(params) {

                        return formatMoney(
                            params.value
                        );

                    }

                }

            }

        ]

    };


    storeRentChart.setOption(
        option
    );

}


/**
 * =========================================================
 * 调整图表尺寸
 * =========================================================
 */
function resizeStoreRentCharts() {

    if (storeRentChart) {

        storeRentChart.resize();

    }

}


/**
 * =========================================================
 * 页面尺寸变化
 * =========================================================
 */
window.addEventListener(
    "resize",
    resizeStoreRentCharts
);


/* 返回按钮的渲染与默认行为由 PageHeader 组件处理；
   store_rent.js 在 initStoreRentPage 中通过 mountPageHeader
   传入自定义 onBack 覆盖默认逻辑。 */
