/**
 * =========================================================
 * 非食材耗材详情页
 * =========================================================
 */


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
        new URLSearchParams(
            window.location.search
        ).get("store") ||
        "西乡店";


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