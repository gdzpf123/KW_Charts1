/**
 * ==============================
 * 公共状态
 * ==============================
 */

let charts = {};

let currentStore = "西乡店";

let currentMonth = "2026-08";


const $ = (id) => document.getElementById(id);


/**
 * ==============================
 * 金额格式化
 * ==============================
 */

function money(value) {

    return "¥" + Number(value || 0).toLocaleString(
        "zh-CN",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }
    );

}


/**
 * ==============================
 * 万元格式化
 * ==============================
 */

function wan(value) {

    const n = Number(value || 0) / 10000;

    return n.toFixed(
        n >= 100 ? 0 : 1
    ) + "万";

}


/**
 * ==============================
 * 月份格式化
 * ==============================
 */

function monthText(month) {

    const [y, m] = month.split("-");

    return `${y}年${Number(m)}月`;

}


/**
 * ==============================
 * 获取门店
 * ==============================
 */

function getStores() {

    return [
        ...new Set(
            STORE_DATA.map(x => x.store)
        )
    ];

}


/**
 * ==============================
 * 获取月份
 * ==============================
 */

function getMonths(store = null) {

    return [
        ...new Set(

            STORE_DATA

                .filter(
                    x =>
                        !store ||
                        x.store === store
                )

                .map(
                    x => x.month
                )

        )
    ]

    .sort()
    .reverse();

}


/**
 * ==============================
 * 获取指定数据
 * ==============================
 */

function getRecord(store, month) {

    return STORE_DATA.find(
        x =>
            x.store === store &&
            x.month === month
    );

}


/**
 * ==============================
 * 获取门店历史数据
 * ==============================
 */

function getStoreRecords(store) {

    return STORE_DATA

        .filter(
            x => x.store === store
        )

        .sort(
            (a, b) =>
                a.month.localeCompare(b.month)
        );

}


/**
 * ==============================
 * 初始化 ECharts
 * ==============================
 */

function initChart(name, elementId) {

    const el = $(elementId);

    if (!el) {
        return null;
    }


    if (!charts[name]) {

        charts[name] =
            echarts.init(el);

    }


    return charts[name];

}