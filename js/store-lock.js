/**
 * =========================================================
 * 单门店锁定
 * =========================================================
 *
 * 开发版（项目根目录）不设置 window.__KW_LOCKED_STORE__，
 * 门店依旧由 URL 的 ?store= 参数决定，行为与改动前完全一致。
 *
 * 分享版由 build/build-sites.js 为每家门店单独生成
 * js/build-config.js，其中写死本店门店名。
 * 于是 URL 参数一律被忽略，页面里也不存在其它门店。
 *
 * 本文件必须在 data.js 之前加载。
 * =========================================================
 */


/**
 * 当前被锁定的门店（未锁定返回 null）
 */
function getLockedStore() {

    return (
        typeof window !== "undefined"
        && window.__KW_LOCKED_STORE__
    ) || null;

}


/**
 * 统一的门店解析入口
 *
 * 优先级：锁定门店 > URL 参数 > 兜底默认门店
 */
function resolveStoreFromURL(fallback) {

    const locked =
        getLockedStore();

    if (locked) {

        return locked;

    }

    const params =

        new URLSearchParams(

            window.location.search

        );

    return (

        params.get("store")

        || fallback

        || "西乡店"

    );

}
