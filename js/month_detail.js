/**
 * =========================================================
 * 月结详情页（initMonthDetailPage）
 * =========================================================
 *
 * UI 与首页一致，但门店/月份只读展示，
 * 不可切换。复用 home.js 中的：
 *   - renderHome / renderBusinessOverview / renderComposition
 *   - bindTrendCard / initSupplierPaymentClick / initConsumableExpenseClick
 *
 * 数据源：window.__pendingMonthDetail（由 history.js 跳转时设置）
 *         兜底从 URL ?store=xxx&month=yyy 读取
 *
 * 副作用：会把 currentStore / currentMonth 写入全局，
 *         让从本页继续跳出的二级详情页（supplier_detail 等）
 *         也能正确读取这两个值。
 * =========================================================
 */

async function initMonthDetailPage() {

    console.log(
        "========== 月结详情页初始化 =========="
    );


    /**
     * ==========================================
     * 解析参数
     * ==========================================
     *
     * 优先从 window.__pendingMonthDetail 读取，
     * 其次从 URL ?store=&month= 读取，
     * 最终兜底：店=西乡店，月=该店最新月份。
     */
    const pending =
        window.__pendingMonthDetail;

    let store;
    let month;

    if (pending && pending.store && pending.month) {

        store = pending.store;
        month = pending.month;

    } else {

        const params =
            new URLSearchParams(
                window.location.search
            );

        store =
            params.get("store") || "西乡店";

        month =
            params.get("month");

    }


    /**
     * 兜底：如果 month 仍然为空（比如直接刷新页面），
     * 用该店最新月份填充。
     */
    if (
        !month
        && typeof getMonths === "function"
    ) {

        const months =
            getMonths(store);

        month = months[0] || "";

    }


    console.log(
        "详情页目标：",
        store,
        month
    );


    /**
     * 写入全局变量（裸名 = 动态改 ES6 顶层 let binding），
     * 让从本页继续点击的
     * supplier_detail / consumable_detail / trend_detail 等
     * 都能读到正确的 store+month。
     *
     * 注意：不能写 window.currentStore —— app.js 的
     * `let currentStore` 不挂在 window 上，写到 window
     * 反而与裸名 currentStore 解耦，导致渲染函数看不到。
     */
    currentStore = store;
    currentMonth = month;


    /**
     * ==========================================
     * 渲染头部副标题与只读 selector
     * ==========================================
     */
    const subtitleText =
        (typeof monthText === "function"
            ? `${monthText(month)}`
            : month)
        + " · " + store;

    const subtitleEl =
        document.getElementById(
            "monthDetailSubtitle"
        );

    if (subtitleEl) {

        subtitleEl.textContent =
            subtitleText;

    }


    const storeEl =
        document.getElementById(
            "storeName"
        );

    if (storeEl) {

        storeEl.textContent = store;

    }


    const monthEl =
        document.getElementById(
            "monthName"
        );

    if (monthEl && typeof monthText === "function") {

        monthEl.textContent =
            monthText(month);

    } else if (monthEl) {

        monthEl.textContent = month;

    }


    /**
     * ==========================================
     * 加载该月份数据
     * ==========================================
     */
    try {

        if (typeof loadStoreData !== "function") {

            throw new Error(
                "loadStoreData 不存在"
            );

        }

        const record =
            await loadStoreData(
                store,
                month
            );

        if (!record) {

            throw new Error(
                "TXT 数据为空"
            );

        }

        STORE_DATA = [record];

        console.log(
            "详情页数据：",
            record
        );


        /**
         * ==========================================
         * 复用首页的渲染函数
         * ==========================================
         */
        if (typeof renderHome === "function") {

            renderHome();

        } else if (
            typeof renderBusinessOverview === "function"
        ) {

            renderBusinessOverview();
            renderComposition();

        }


        /**
         * ==========================================
         * 复用首页的趋势卡片点击绑定
         * ==========================================
         */
        if (typeof bindTrendCard === "function") {

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

        }


        /**
         * 货佬/耗材点击绑定
         */
        if (typeof initSupplierPaymentClick === "function") {

            initSupplierPaymentClick();

        }

        if (typeof initConsumableExpenseClick === "function") {

            initConsumableExpenseClick();

        }


        /**
         * ==========================================
         * 覆盖返回按钮：跳回历史列表而不是 history.back()
         * （SPA 模式下浏览器历史栈没有真实导航记录）
         * ==========================================
         */
        const backBtn =
            document.querySelector(
                ".page-header-back"
            );

        if (backBtn) {

            /**
             * cloneNode(true) 替换原节点，
             * 原节点上由 mountPageHeader 绑定的
             * click listener 会被丢弃
             */
            const fresh =
                backBtn.cloneNode(true);

            backBtn.parentNode
                .replaceChild(
                    fresh,
                    backBtn
                );

            fresh.addEventListener(
                "click",
                function () {

                    /**
                     * 清理本次跳转的临时参数，
                     * 避免下次进入详情页时误用
                     */
                    window.__pendingMonthDetail = null;

                    loadPage("history");

                }
            );

        }


        /**
         * 调整图表尺寸
         */
        if (typeof resizeHomeCharts === "function") {

            setTimeout(
                function () {

                    resizeHomeCharts();

                },
                300
            );

        }

    } catch (error) {

        console.error(
            "加载月结详情失败：",
            error
        );

        if (typeof showHomeError === "function") {

            showHomeError(
                "数据加载失败，请检查 TXT 文件是否存在"
            );

        }

    }

}
