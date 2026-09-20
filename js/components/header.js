/* =========================================================
   header.js
   页面级通用头部组件（PageHeader）
   -
   用法：
     HTML 占位符：
         <div id="pageHeader"
              data-title="页面标题"
              data-subtitle-id="副标题元素的 ID"
              data-show-back="true | false">
         </div>

     或 JS 直接调用：
         mountPageHeader({
             title: '页面标题',
             subtitleId: 'subtitleElId',
             showBack: true,
             onBack: () => { ... }
         });

   行为：
   - showBack = true 时渲染返回按钮，点击默认 history.back()
   - showBack = false 时不渲染返回按钮（一级页面：首页/历史/数据分析）
   - 副标题元素会自动注入指定 ID，业务 JS 可直接 $('subtitleElId').textContent = ...
   ========================================================= */

(function (global) {

    /**
     * 渲染页面头部到指定容器
     * @param {Object} options
     * @param {string}  [options.title]       标题文本
     * @param {string}  [options.subtitle]    静态副标题文本
     * @param {string}  [options.subtitleId]  副标题 <p> 的 ID（业务 JS 可按 ID 后续更新）
     * @param {boolean} [options.showBack]    是否显示返回按钮（默认 false）
     * @param {Function}[options.onBack]      自定义返回逻辑；不传则 history.back() → loadPage('home')
     * @param {string}  [options.container]   容器选择器，默认 '#pageHeader'
     * @returns {boolean} 是否成功渲染
     */
    function mountPageHeader(options) {

        options = options || {};

        var title       = options.title       || '';
        var subtitle    = options.subtitle    || '';
        var subtitleId  = options.subtitleId  || '';
        var showBack    = !!options.showBack;
        var onBack      = options.onBack;
        var container   = options.container   || '#pageHeader';

        var el = document.querySelector(container);

        if (!el) {
            return false;
        }

        var backBtnHtml = showBack
            ? '<button class="page-header-back" type="button" aria-label="返回">‹</button>'
            : '';

        /* 副标题：动态 ID 优先（业务 JS 可后续更新），否则用静态文本 */
        var subtitleHtml = '';

        if (subtitleId) {
            subtitleHtml =
                '<p id="' + subtitleId + '">' +
                escapeHtml(subtitle) +
                '</p>';
        } else if (subtitle) {
            subtitleHtml = '<p>' + escapeHtml(subtitle) + '</p>';
        }

        /*
         * 关键：给容器加上 .page-header class，
         * css/header.css 中的 .page-header { display:flex; position:relative; ... }
         * 都是作用在容器上的，容器没有这个 class 时样式完全不生效。
         */
        el.classList.add('page-header');

        el.innerHTML =
            backBtnHtml +
            '<div class="page-header-title">' +
                '<h1 id="pageHeaderTitle">' + escapeHtml(title) + '</h1>' +
                subtitleHtml +
            '</div>';

        /*
         * 有返回按钮时给容器加 .has-back，
         * 配合 css/header.css 中的 padding-left 调整，
         * 让标题区不会与左侧绝对定位的返回按钮重叠。
         */
        if (showBack) {

            el.classList.add('has-back');

        } else {

            el.classList.remove('has-back');

        }

        if (showBack) {

            var backBtn = el.querySelector('.page-header-back');

            if (backBtn) {

                backBtn.addEventListener('click', function () {

                    if (typeof onBack === 'function') {

                        onBack();
                        return;
                    }

                    /* 默认行为：浏览器历史回退；无历史则回首页 */
                    if (
                        global.history &&
                        global.history.length > 1
                    ) {
                        global.history.back();
                    } else if (typeof global.loadPage === 'function') {
                        global.loadPage('home');
                    }

                });
            }
        }

        return true;
    }


    /**
     * 从 #pageHeader 容器的 data-* 属性读取配置并渲染
     * 供 app.js 在 loadPage() 注入页面后统一调用
     *
     *   data-title        标题
     *   data-subtitle     静态副标题
     *   data-subtitle-id  动态副标题 <p> 的 ID
     *   data-show-back    "true" / "false"
     */
    function mountPageHeaderFromContainer() {

        var el = document.getElementById('pageHeader');

        if (!el) {
            return false;
        }

        return mountPageHeader({
            title:      el.dataset.title      || '',
            subtitle:   el.dataset.subtitle   || '',
            subtitleId: el.dataset.subtitleId || '',
            showBack:   el.dataset.showBack === 'true'
        });
    }


    /* 简单 HTML 转义，防止标题里出现 < > & 破坏结构 */
    function escapeHtml(str) {

        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }


    /* 暴露到全局 */
    global.mountPageHeader           = mountPageHeader;
    global.mountPageHeaderFromContainer = mountPageHeaderFromContainer;

})(window);