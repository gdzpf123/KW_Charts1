/**
 * =========================================================
 * 数据管理
 * =========================================================
 *
 * TXT 文件目录：
 *
 * data/
 * ├── 西乡店/
 * │   ├── 2026-07.txt
 * │   └── 2026-08.txt
 * │
 * ├── 碧海湾店/
 * │   ├── 2026-07.txt
 * │   └── 2026-08.txt
 * │
 * └── ...
 *
 */


/**
 * 当前已经加载的数据
 */
let STORE_DATA = [];


/**
 * =========================================================
 * 获取 TXT 文件路径
 * =========================================================
 */
function getDataFilePath(store, month) {

    return `data/${store}/${month}.txt`;

}


/**
 * =========================================================
 * 读取 TXT 文件
 * =========================================================
 */
async function loadStoreData(store, month) {

    const path =
        getDataFilePath(
            store,
            month
        );


    console.log(
        "开始读取数据：",
        path
    );


    try {

        const response =
            await fetch(path);


        if (!response.ok) {

            throw new Error(
                `TXT 文件读取失败：${response.status}`
            );

        }


        const text =
            await response.text();


        console.log(
            "TXT 原始数据：",
            text
        );


        const record =
            parseStoreTxt(
                text,
                store,
                month
            );


        if (!record) {

            throw new Error(
                "TXT 数据解析失败"
            );

        }


        console.log(
            "解析后的数据：",
            record
        );


        return record;


    } catch (error) {

        console.error(
            "读取门店数据失败：",
            error
        );


        throw error;

    }

}


/**
 * =========================================================
 * 批量读取某门店的多个月份数据
 * =========================================================
 *
 * 并发请求，解析失败的月份会被跳过。
 * 加载完成后会按月份升序覆盖 STORE_DATA，
 * 供分析页/历史页消费。
 *
 * =========================================================
 */
async function loadStoreMonthsData(
    store,
    months
) {

    const results =
        await Promise.all(
            months.map(
                month =>
                    loadStoreData(
                        store,
                        month
                    )
                        .catch(
                            err => {
                                console.warn(
                                    `加载 ${store}/${month} 失败:`,
                                    err.message
                                );
                                return null;
                            }
                        )
            )
        );


    const records =
        results
            .filter(
                r => r !== null
            )
            .sort(
                (a, b) =>
                    a.month.localeCompare(b.month)
            );


    STORE_DATA =
        records;

    return records;

}


/**
 * =========================================================
 * 从 TXT 中读取某一项「本月」数据
 *
 * 例如：
 *
 * 总营业额(+)本月 1019173.38,上月...
 *
 * 获取：
 *
 * 1019173.38
 *
 * =========================================================
 */
function getCurrentValue(text, name) {

    const escapedName =
        name.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );


    const regex =
        new RegExp(
            escapedName +
            "本月\\s*([-+]?\\d+(?:\\.\\d+)?)"
        );


    const match =
        text.match(regex);


    if (!match) {

        console.warn(
            "没有找到数据：",
            name
        );


        return 0;

    }


    return Number(
        match[1]
    );

}

/**
 * =========================================================
 * 从 TXT 中解析某一项的完整数据行
 *
 * 例如：
 *
 * 经营实收本月 743075.56,上月 695071.25,去年8月 768163.94,去年平均 745687.69
 *
 * 获取：
 *
 * {
 *     current:     743075.56,   // 本月
 *     prev:        695071.25,   // 上月（环比基准）
 *     lastYear:    768163.94,   // 去年同月（同比基准）
 *     lastYearAvg: 745687.69    // 去年每月平均
 * }
 *
 * 某一段不存在时对应字段为 null。
 * =========================================================
 */
function getValueParts(text, name) {

    const escapedName =
        name.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );


    const regex =
        new RegExp(
            escapedName +
            "本月\\s*([-+]?\\d+(?:\\.\\d+)?)%?" +
            "(?:,上月\\s*([-+]?\\d+(?:\\.\\d+)?)%?)?" +
            "(?:,去年\\d+月\\s*([-+]?\\d+(?:\\.\\d+)?)%?)?" +
            "(?:,去年平均\\s*([-+]?\\d+(?:\\.\\d+)?)%?)?"
        );


    const match =
        text.match(regex);


    if (!match) {

        console.warn(
            "没有找到数据：",
            name
        );

        return {
            current: 0,
            prev: null,
            lastYear: null,
            lastYearAvg: null
        };

    }


    return {
        current: Number(match[1]),
        prev: match[2] !== undefined
            ? Number(match[2])
            : null,
        lastYear: match[3] !== undefined
            ? Number(match[3])
            : null,
        lastYearAvg: match[4] !== undefined
            ? Number(match[4])
            : null
    };

}


/**
 * =========================================================
 * 从 TXT 中读取「经营简报」段
 * =========================================================
 *
 * TXT 格式：
 *
 * 经营简报:
 * 8 月份报表及分析报告已出...
 * （空行）
 * 西乡店本月净利润 68064 元...
 * ...
 *
 * 「经营简报:」一行标记开始，之后所有内容（含空行、
 *   · 外卖运营费 3131 元
 *   等子条目）都会被原样捕获，直到文末。
 *
 * 找不到标记时返回 null；调用方据此决定是否渲染 UI。
 * =========================================================
 */

function getBriefing(text) {

    const marker = "经营简报:";


    /**
     * -----------------------------------------------------
     * 找「经营简报:」所在的字符位置。
     * 单独以「行首 + 经营简报:」匹配，避免文本里「本月
     * 经营实收…」，「环比经营…」之类的相同片段误命中。
     * -----------------------------------------------------
     */

    const startMatch =
        text.match(
            /(?:^|\n)\s*经营简报:\s*\n/
        );


    if (!startMatch) {

        return null;

    }


    const startIdx =
        startMatch.index +
            startMatch[0].length -
            1;   // 跳过分隔符之前的换行符


    /**
     * -----------------------------------------------------
     * 截取「经营简报:」之后的所有内容。
     * 去尾部空白行，保留段落内的空行作为分段。
     * -----------------------------------------------------
     */

    const tail =
        text
            .slice(startIdx)
            .replace(/\r\n/g, "\n");


    /**
     * 若文件意外以「经营简报:」结束，没有正文，返回 null。
     */

    if (!tail || tail.trim().length === 0) {

        return null;

    }


    return tail.trimEnd();

}

/**
 * =========================================================
 * 解析供应商明细
 *
 * TXT 格式：
 *
 * 食材货佬款项
 * 豆腐供应商,5940.00
 * 广园丰食品,400.00
 * ...
 * 小计,272269.06
 *
 * 非食材货佬款项
 * 诚伟纸塑,3339.00
 * ...
 * 小计,24185.00
 * =========================================================
 */
function getSupplierDetails(text) {

    const result = {

        food: [],

        nonFood: []

    };


    /**
     * -----------------------------------------------------
     * 解析某一个供应商区域
     * -----------------------------------------------------
     */
    function parseSection(startTitle, endTitle) {

        const startIndex =
            text.indexOf(startTitle);


        if (startIndex === -1) {

            return [];

        }


        let endIndex =
            text.length;


        if (endTitle) {

            const tempIndex =
                text.indexOf(
                    endTitle,
                    startIndex + startTitle.length
                );


            if (tempIndex !== -1) {

                endIndex = tempIndex;

            }

        }


        const section =
            text.substring(
                startIndex + startTitle.length,
                endIndex
            );


        const lines =
            section.split(/\r?\n/);


        const list = [];


        lines.forEach(line => {

            line =
                line.trim();


            if (!line) {

                return;

            }


            const parts =
                line.split(",");


            if (parts.length < 2) {

                return;

            }


            const name =
                parts[0].trim();


            const amount =
                Number(
                    parts[1].trim()
                );


            if (!name) {

                return;

            }


            if (
                name === "小计" ||
                name === "总计"
            ) {

                return;

            }


            if (
                Number.isNaN(amount)
            ) {

                return;

            }


            list.push({

                name,

                amount

            });

        });


        return list;

    }


    /**
     * 食材供应商
     */
    result.food =
        parseSection(
            "食材货佬款项",
            "非食材货佬款项"
        );


    /**
     * 非食材供应商
     *
     * 注意：
     *
     * 这里不是「非食材耗材」，
     * 而是「非食材货佬款项」。
     */
    result.nonFood =
        parseSection(
            "非食材货佬款项",
            "下面是耗材的金额数据"
        );


    /**
     * -----------------------------------------------------
     * 计算合计
     * -----------------------------------------------------
     */

    result.foodTotal =
        result.food.reduce(
            (sum, item) =>
                sum + item.amount,
            0
        );


    result.nonFoodTotal =
        result.nonFood.reduce(
            (sum, item) =>
                sum + item.amount,
            0
        );


    result.total =
        result.foodTotal +
        result.nonFoodTotal;


    return result;

}


/**
 * =========================================================
 * 从 TXT 中读取货佬款项「小计」
 *
 * TXT 格式：
 *
 * 食材货佬款项
 * 豆腐供应商,5940.00
 * ...
 * 小计,272269.06
 *
 * 非食材货佬款项
 * 诚伟纸塑,3339.00
 * ...
 * 小计,24185.00
 *
 * =========================================================
 */
function getSupplierSubtotal(
    text,
    sectionName
) {

    /**
     * 找到对应的区块
     *
     * 例如：
     *
     * 食材货佬款项
     * ...
     * 小计,272269.06
     *
     * 截止到下一个：
     *
     * 非食材货佬款项
     *
     * 或：
     *
     * 耗材
     *
     * 或文本结束
     */

    const escapedSectionName =
        sectionName.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );


    const regex =
        new RegExp(
            escapedSectionName +
            "[\\s\\S]*?小计\\s*,\\s*([-+]?\\d+(?:\\.\\d+)?)",
            "i"
        );


    const match =
        text.match(regex);


    if (!match) {

        console.warn(
            "没有找到货佬款项小计：",
            sectionName
        );


        return 0;

    }


    return Number(
        match[1]
    );

}

/**
 * =========================================================
 * 解析非食材耗材明细
 * =========================================================
 */
function getConsumableDetails(text) {

    const result = [];


    const startTitle =
        "下面是耗材的金额数据";


    const startIndex =
        text.indexOf(startTitle);


    if (startIndex === -1) {

        console.warn(
            "没有找到耗材数据"
        );

        return result;

    }


    const section =
        text.substring(
            startIndex + startTitle.length
        );


    const lines =
        section.split(/\r?\n/);


    lines.forEach(line => {

        line =
            line.trim();


        if (!line) {

            return;

        }


        const parts =
            line.split(",");


        /**
         * 格式：
         *
         * 名称,
         * 类型,
         * 日期,
         * 单号,
         * 金额
         */
        if (parts.length < 5) {

            return;

        }


        const name =
            parts[0].trim();


        const category =
            parts[1].trim();


        const date =
            parts[2].trim();


        const orderNo =
            parts[3].trim();


        const amount =
            Number(
                parts[4].trim()
            );


        if (!name) {

            return;

        }


        if (
            name === "总计"
        ) {

            return;

        }


        if (
            Number.isNaN(amount)
        ) {

            return;

        }


        result.push({

            name,

            category,

            date,

            orderNo,

            amount

        });

    });


    return result;

}

/**
 * =========================================================
 * 解析 TXT 中的「X月 成本数据」段（成本结构分析专用）
 * =========================================================
 *
 * TXT 格式（2026-09-21 起由门店补充）：
 *
 *   8月 成本数据:
 *   总成本：675011.62
 *   货佬款项：296454.09
 *   固定支出：321267.31
 *   其他耗材支出：34162.23
 *   总公司运营支出：23128.00
 *
 *   固定支出数据如下:
 *   固定支出:321267.31
 *   店铺租金:98387.00
 *   物业服务费:0.00
 *   停车费:0.00
 *   店铺水电费:30545.00
 *   宿舍房租:5450.00
 *   宿舍水电燃气管理费:1498.00
 *   员工工资:166654.06
 *   员工社保:18733.25
 *   绩效奖金:0.00
 *
 * 解析要点：
 *
 *   1. 汇总 5 行用全角冒号「：」，明细块用半角冒号「:」，
 *      这里统一按 [:：] 任一冒号切分，两种写法都能吃下。
 *   2. TXT 行尾是 \r\n，先按 \r?\n 拆行再 trim，避免
 *      尾部的 \r 破坏名称精确匹配。
 *   3. 取值只在「成本数据」标记行之后、下一段正文之前
 *      的区间里搜索，避免误命中正文中同名的「本月」格式行
 *      （如「店铺租金本月 98387.00,...」）。
 *   4. 找不到「成本数据」标记时返回 null，
 *      调用方据此回退到旧口径，保证其它门店不受影响。
 * =========================================================
 */

function getCostStructure(text) {

    if (
        !text
        || text.indexOf("成本数据") < 0
    ) {

        return null;

    }


    /**
     * 拆行 + 去 \r + 去首尾空白
     */

    const lines =
        text
            .split(/\r?\n/)
            .map(
                line => line.trim()
            );


    const startIdx =
        lines.findIndex(
            line =>
                line.indexOf("成本数据") >= 0
        );


    if (startIdx < 0) {

        return null;

    }


    /**
     * 段落终点：下一个正文段落标题 / 经营简报，
     * 找不到就一直到文末。
     */

    let endIdx =
        lines.findIndex(
            (line, i) =>
                i > startIdx
                && (
                    /^下面是/.test(line)
                    || /^经营简报/.test(line)
                )
        );


    if (endIdx < 0) {

        endIdx = lines.length;

    }


    /**
     * 在 [startIdx, endIdx) 区间内按名称取数。
     *
     * 名称精确匹配（trim 后相等），支持全角 / 半角冒号。
     * 找不到返回 0。
     */

    function pick(name) {

        for (
            let i = startIdx;
            i < endIdx;
            i++
        ) {

            const line =
                lines[i];


            if (!line) {

                continue;

            }


            const match =
                line.match(
                    /^([^:：]+)[:：]\s*([-+]?\d+(?:\.\d+)?)/
                );


            if (!match) {

                continue;

            }


            if (
                match[1].trim() === name
            ) {

                return Number(
                    match[2]
                );

            }

        }


        return 0;

    }


    return {

        /**
         * 汇总
         */

        total:
            pick("总成本"),

        supplierPayment:
            pick("货佬款项"),

        fixedTotal:
            pick("固定支出"),

        consumable:
            pick("其他耗材支出"),

        hqExpense:
            pick("总公司运营支出"),


        /**
         * 固定支出明细
         */

        fixed: {

            rent:
                pick("店铺租金"),

            propertyFee:
                pick("物业服务费"),

            parking:
                pick("停车费"),

            waterElectricity:
                pick("店铺水电费"),

            dormitoryRent:
                pick("宿舍房租"),

            dormitoryUtility:
                pick("宿舍水电燃气管理费"),

            salary:
                pick("员工工资"),

            socialSecurity:
                pick("员工社保"),

            bonus:
                pick("绩效奖金")

        }

    };

}


/**
 * =========================================================
 * 固定支出明细取值（全站统一入口）
 * =========================================================
 *
 * TXT 里的「固定支出数据如下」块
 * （解析为 record.costStructure.fixed）是固定支出明细的
 * 权威来源，包含 9 项：
 *
 *   店铺租金 / 物业服务费 / 停车费 / 店铺水电费 /
 *   宿舍房租 / 宿舍水电燃气管理费 / 员工工资 /
 *   员工社保 / 绩效奖金
 *
 * 关键：这几项在经营简报（record.xxx）里大部分是重复的，
 * 但「宿舍水电燃气管理费」例外 —— 简报里恒为 0，
 * 只有固定支出块里才有真实值。
 *
 * 因此凡是展示固定支出明细的图表，都必须通过本函数取值，
 * 不要直接读 record.xxx，否则「宿舍水电」会显示成 0。
 *
 * 未补「成本数据」段的旧 TXT 回退经营简报字段，
 * 保证历史月份仍有值可显示。
 * =========================================================
 */

function getFixedItem(record, key) {

    if (!record) {

        return 0;

    }


    const fixed =
        (
            record.costStructure
            && record.costStructure.fixed
        )
        || null;


    if (
        fixed
        && fixed[key] != null
    ) {

        return Number(
            fixed[key] || 0
        );

    }


    return Number(
        record[key] || 0
    );

}


/**
 * =========================================================
 * 解析 TXT
 * =========================================================
 */
function parseStoreTxt(
    text,
    store,
    month
) {

    /**
     * -----------------------------------------------------
     * 基础经营数据
     * -----------------------------------------------------
     */

    const totalRevenue =
        getCurrentValue(
            text,
            "总营业额(+)"
        );


    const totalDiscount =
        getCurrentValue(
            text,
            "总优惠减免(-)"
        );


    const totalFee =
        getCurrentValue(
            text,
            "总手续费/服务费(-)"
        );


    const hqExpense =
        getCurrentValue(
            text,
            "总公司运营支出(-)"
        );


    /**
     * -----------------------------------------------------
     * 固定支出
     * -----------------------------------------------------
     */

    const rent =
        getCurrentValue(
            text,
            "店铺租金"
        );


    const propertyFee =
        getCurrentValue(
            text,
            "物业服务费"
        );


    const waterElectricity =
        getCurrentValue(
            text,
            "店铺水电费"
        );


    const dormitoryRent =
        getCurrentValue(
            text,
            "宿舍房租"
        );


    const salary =
        getCurrentValue(
            text,
            "员工工资"
        );


    const socialSecurity =
        getCurrentValue(
            text,
            "员工社保"
        );


    /**
     * -----------------------------------------------------
     * 耗材
     * -----------------------------------------------------
     */

    const consumableExpense =
        getCurrentValue(
            text,
            "非食材 耗材 支出"
        );


    /**
     * -----------------------------------------------------
     * 货佬款项总额
     *
     * 例如：
     *
     * 货佬款项(-)本月 296454.09
     * -----------------------------------------------------
     */

    const supplierPayment =
        getCurrentValue(
            text,
            "货佬款项(-)"
        );

    const supplierDetails =
        getSupplierDetails(text);

    const consumableDetails =
    getConsumableDetails(text);


    /**
     * -----------------------------------------------------
     * 食材货佬款项
     *
     * 例如：
     *
     * 食材货佬款项
     * ...
     * 小计,272269.06
     * -----------------------------------------------------
     */

    const foodPayment =
        getSupplierSubtotal(
            text,
            "食材货佬款项"
        );


    /**
     * -----------------------------------------------------
     * 非食材货佬款项
     *
     * 例如：
     *
     * 非食材货佬款项
     * ...
     * 小计,24185.00
     * -----------------------------------------------------
     */

    const nonFoodPayment =
        getSupplierSubtotal(
            text,
            "非食材货佬款项"
        );


    /**
     * -----------------------------------------------------
     * 校验货佬款项
     *
     * 食材 + 非食材
     *
     * 应该等于：
     *
     * 货佬款项总额
     *
     * -----------------------------------------------------
     */

    const supplierPaymentDetail =
        foodPayment +
        nonFoodPayment;


    console.log(
        "========== 货佬款项解析 =========="
    );


    console.log(
        "食材货佬款项：",
        foodPayment
    );


    console.log(
        "非食材货佬款项：",
        nonFoodPayment
    );


    console.log(
        "货佬款项明细合计：",
        supplierPaymentDetail
    );


    console.log(
        "货佬款项总额：",
        supplierPayment
    );


    if (
        Math.abs(
            supplierPaymentDetail -
            supplierPayment
        ) > 0.01
    ) {

        console.warn(
            "⚠️ 货佬款项明细合计与总额不一致：",
            supplierPaymentDetail,
            supplierPayment
        );

    }


    /**
     * -----------------------------------------------------
     * 净利润
     * -----------------------------------------------------
     */

    const netProfit =
        getCurrentValue(
            text,
            "净利润"
        );


    /**
     * -----------------------------------------------------
     * 毛利率
     * -----------------------------------------------------
     */

    const grossMargin =
        getCurrentValue(
            text,
            "毛利率(仅食材)"
        );


    /**
     * -----------------------------------------------------
     * 净利率
     * -----------------------------------------------------
     */

    const netMargin =
        getCurrentValue(
            text,
            "净利率"
        );


    /**
     * -----------------------------------------------------
     * 营业收入
     *
     * 总营业额 - 总优惠减免
     *
     * -----------------------------------------------------
     */

    const revenue =
        totalRevenue -
        totalDiscount;


    /**
     * -----------------------------------------------------
     * 其他收入
     *
     * 跟随营业收入一并从 TXT 读取，参与「经营实收」公式展示。
     *
     * 业务备注（2026-09-20）：
     * 「经营实收」的展示值不按公式计算，而直接从 TXT 中的
     *   经营实收本月 743075.56,上月 695071.25,
     *   去年8月 768163.94,去年平均 745687.69
     * 一行读取，视为权威口径。下面的公式块仅作为
     * UI 文字提示，不参与数值计算。
     *
     * -----------------------------------------------------
     */

    const otherIncome =
        getCurrentValue(
            text,
            "其他收入(+)"
        );


    /**
     * -----------------------------------------------------
     * 经营实收
     *
     * 【公式】营业收入 − 总手续费 + 其他收入
     *
     * 【真实值】此处直接读取 TXT 中「经营实收」行的本月字段，
     * 不通过上方公式计算。TXT 中的「经营实收」已经包含了
     * 平台对账后的所有调整，公式只能做展示性提示，不可作为
     * 数据推导依据。
     *
     * -----------------------------------------------------
     */

    const operatingIncome =
        getCurrentValue(
            text,
            "经营实收"
        );


    /**
     * -----------------------------------------------------
     * 固定支出
     * -----------------------------------------------------
     */

    const fixedExpense =
        rent +
        propertyFee +
        waterElectricity +
        dormitoryRent +
        salary +
        socialSecurity;


    /**
     * -----------------------------------------------------
     * 成本结构（TXT 新增段「X月 成本数据」）
     *
     * 西乡店各月已补充，其它门店暂未提供。
     * 解析失败 / 缺失时为 null，
     * 成本结构分析图表据此回退到旧口径。
     * -----------------------------------------------------
     */

    const costStructure =
        getCostStructure(text);


    /**
     * -----------------------------------------------------
     * 环比 / 同比 / 去年平均 基准值
     *
     * TXT 每一行自带「本月,上月,去年N月,去年平均」，
     * 解析出来供分析页直接使用，
     * 不再依赖本店历史 TXT 是否齐全。
     * -----------------------------------------------------
     */

    const operatingIncomeParts =
        getValueParts(
            text,
            "经营实收"
        );

    const totalFeeParts =
        getValueParts(
            text,
            "总手续费/服务费(-)"
        );

    const netProfitParts =
        getValueParts(
            text,
            "净利润"
        );

    const grossMarginParts =
        getValueParts(
            text,
            "毛利率(仅食材)"
        );

    const netMarginParts =
        getValueParts(
            text,
            "净利率"
        );


    /**
     * 营业收入（经营实收 - 总手续费）的基准值
     */

    const revenuePrev =
        operatingIncomeParts.prev !== null
        && totalFeeParts.prev !== null
            ? operatingIncomeParts.prev -
                totalFeeParts.prev
            : null;

    const revenueLastYear =
        operatingIncomeParts.lastYear !== null
        && totalFeeParts.lastYear !== null
            ? operatingIncomeParts.lastYear -
                totalFeeParts.lastYear
            : null;

    const revenueLastYearAvg =
        operatingIncomeParts.lastYearAvg !== null
        && totalFeeParts.lastYearAvg !== null
            ? operatingIncomeParts.lastYearAvg -
                totalFeeParts.lastYearAvg
            : null;


    /**
     * -----------------------------------------------------
     * 返回统一数据结构
     * -----------------------------------------------------
     */

    return {

        store,

        month,


        /**
         * =================================================
         * 收入
         * =================================================
         */

        totalRevenue,

        totalDiscount,

        revenue,

        totalFee,

        operatingIncome,


        /**
         * =================================================
         * 会员
         * =================================================
         */

        memberRecharge:
            getCurrentValue(
                text,
                "会员充值(+)"
            ),


        memberConsumption:
            getCurrentValue(
                text,
                "会员消费(-)"
            ),


        /**
         * =================================================
         * 货佬款项
         * =================================================
         *
         * foodPayment
         *     食材货佬款项
         *
         * nonFoodPayment
         *     非食材货佬款项
         *
         * supplierPayment
         *     货佬款项总额
         *
         */

        foodPayment,

        nonFoodPayment,

        supplierPayment,
        
        //耗材明细
        consumableDetails,

    /**
     * 供应商明细
     */
        supplierDetails,

        /**
         * =================================================
         * 毛利
         * =================================================
         */

        grossProfit:
            operatingIncome -
            supplierPayment,

        grossMargin,


        /**
         * =================================================
         * 固定支出
         * =================================================
         */

        fixedExpense,

        rent,

        propertyFee,

        waterElectricity,

        dormitoryRent,

        salary,

        socialSecurity,


        /**
         * =================================================
         * 成本结构（TXT「X月 成本数据」段）
         *
         * 结构：
         *   {
         *     total, supplierPayment, fixedTotal,
         *     consumable, hqExpense,
         *     fixed: { rent, propertyFee, parking,
         *              waterElectricity, dormitoryRent,
         *              dormitoryUtility, salary,
         *              socialSecurity, bonus }
         *   }
         *
         * 缺失时为 null（其它门店尚未补充该段）。
         * =================================================
         */

        costStructure,


        /**
         * =================================================
         * 其他支出
         * =================================================
         *
         * 注意：
         *
         * 这里的耗材支出和非食材货佬款项
         * 是两个不同的数据。
         *
         */

        otherExpense:
            consumableExpense,


        consumableExpense,


        /**
         * =================================================
         * 总公司运营支出
         * =================================================
         */

        hqExpense,


        /**
         * =================================================
         * 净利润
         * =================================================
         */

        netProfit,

        netMargin,


        /**
         * =================================================
         * 环比 / 同比 基准值（TXT 自带）
         * =================================================
         *
         * 后缀含义：
         *
         *     Prev        上月值（环比基准）
         *     LastYear    去年同月值（同比基准）
         *     LastYearAvg 去年每月平均值
         *
         * 数据源缺该段时为 null。
         */

        revenuePrev,

        revenueLastYear,

        revenueLastYearAvg,

        operatingIncomePrev:
            operatingIncomeParts.prev,

        operatingIncomeLastYear:
            operatingIncomeParts.lastYear,

        operatingIncomeLastYearAvg:
            operatingIncomeParts.lastYearAvg,

        totalFeePrev:
            totalFeeParts.prev,

        totalFeeLastYear:
            totalFeeParts.lastYear,

        totalFeeLastYearAvg:
            totalFeeParts.lastYearAvg,

        netProfitPrev:
            netProfitParts.prev,

        netProfitLastYear:
            netProfitParts.lastYear,

        netProfitLastYearAvg:
            netProfitParts.lastYearAvg,

        grossMarginPrev:
            grossMarginParts.prev,

        grossMarginLastYear:
            grossMarginParts.lastYear,

        grossMarginLastYearAvg:
            grossMarginParts.lastYearAvg,

        netMarginPrev:
            netMarginParts.prev,

        netMarginLastYear:
            netMarginParts.lastYear,

        netMarginLastYearAvg:
            netMarginParts.lastYearAvg,


        /**
         * =================================================
         * 经营简报（可缺席）
         * =================================================
         *
         * TXT 中「经营简报:」段落解析出的纯文本。
         * 没有该段时为 null，UI 据此决定是否展示简报卡。
         * =================================================
         */

        briefing:
            getBriefing(text)

    };

}


/**
 * =========================================================
 * 获取门店历史月份
 *
 * 浏览器无法直接读取服务器目录，
 * 所以暂时手工维护可用月份。
 *
 * 后面可以改成 manifest.json。
 * =========================================================
 */

const STORE_MONTHS = {

    "西乡店": [
        "2026-08",
        "2026-07",
        "2026-06",
        "2026-05",
        "2026-04",
        "2026-03",
        "2026-02",
        "2026-01",
    ],
    "碧海湾店": [
         "2026-08",
        "2026-07",
        "2026-06",
        "2026-05",
        "2026-04",
        "2026-03",
        "2026-02",
        "2026-01",
    ],
    "沙井店": [
         "2026-08",
        "2026-07",
        "2026-06",
        "2026-05",
        "2026-04",
        "2026-03",
        "2026-02",
        "2026-01",
    ],
    "塘头店": [
         "2026-08",
        "2026-07",
        "2026-06",
        "2026-05",
        "2026-04",
        "2026-03",
        "2026-02",
        "2026-01",
    ],
    "石龙仔店": [
         "2026-08",
        "2026-07",
        "2026-06",
        "2026-05",
        "2026-04",
        "2026-03",
        "2026-02",
        "2026-01",
    ]
};


/**
 * =========================================================
 * 获取门店
 * =========================================================
 */

function getStores() {

    return Object.keys(
        STORE_MONTHS
    );

}


/**
 * =========================================================
 * 获取月份
 * =========================================================
 */

function getMonths(store) {

    return (
        STORE_MONTHS[store] || []
    )
    .slice()
    .sort()
    .reverse();

}


