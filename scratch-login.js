/*!
 * ScratchLoginSystem
 * Scratchアカウントでホームページにログインできるようにするツール
 * 共同制作: suzunokana × tr3131kami
 * https://tr3131kami.github.io/ScratchLoginSystem/
 */
(function (global) {
  'use strict';

  var DEFAULT_PROJECT_ID = '1436331790';
  var config = {
    projectId: DEFAULT_PROJECT_ID,
    onLogin: null,
    onLogout: null,
    storageKey: 'sls_user'
  };

  var currentCode = null;
  var issuedAt = 0;
  var els = null;
  var pollTimer = null;
  var pollToken = 0;

  function getUser() {
    try { return localStorage.getItem(config.storageKey) || null; } catch (e) { return null; }
  }
  function setUser(user) {
    try {
      if (user) localStorage.setItem(config.storageKey, user);
      else localStorage.removeItem(config.storageKey);
    } catch (e) { /* 保存できなくてもログイン自体は続ける */ }
  }

  function genCode() {
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var code = 'SLS-';
    for (var i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function projectUrl() {
    return 'https://scratch.mit.edu/projects/' + config.projectId + '/';
  }

  function buildModal() {
    if (els) return;
    var wrap = document.createElement('div');
    wrap.id = 'slsModal';
    wrap.setAttribute('style', 'position:fixed;inset:0;background:rgba(20,16,24,.55);display:none;align-items:center;justify-content:center;z-index:9999;padding:20px;font-family:sans-serif;');
    wrap.innerHTML =
      '<div style="background:#fff;border-radius:20px;max-width:420px;width:100%;padding:28px 24px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.3);color:#2b2b2b;">' +
        '<img src="https://tr3131kami.github.io/ScratchLoginSystem/logo.png" alt="ScratchLoginSystem" style="width:76px;height:76px;border-radius:50%;margin-bottom:10px;">' +
        '<h3 style="margin:0 0 6px;font-size:1.15rem;">Scratchでログイン</h3>' +
        '<p style="margin:0 0 14px;font-size:.85rem;color:#666;line-height:1.7;">下の認証コードを、認証用プロジェクトに<br>そのままコメントしてください。</p>' +
        '<div id="slsCode" style="font-size:1.7rem;font-weight:800;letter-spacing:.12em;background:#fff4e5;border:2px dashed #ff8c1a;border-radius:14px;padding:12px 6px;margin-bottom:10px;">----</div>' +
        '<button id="slsCopy" type="button" style="border:none;background:#eee;border-radius:999px;padding:7px 16px;font-size:.8rem;cursor:pointer;margin-bottom:16px;">コードをコピー</button>' +
        '<div style="display:flex;flex-direction:column;gap:10px;">' +
          '<a id="slsProjectLink" href="#" target="_blank" rel="noopener" style="display:block;background:#4c97ff;color:#fff;text-decoration:none;border-radius:999px;padding:12px;font-weight:700;font-size:.92rem;">認証用プロジェクトを開く</a>' +
          '<button id="slsDone" type="button" style="border:none;background:#ff8c1a;color:#fff;border-radius:999px;padding:12px;font-weight:700;font-size:.92rem;cursor:pointer;">コメントしたので完了</button>' +
          '<button id="slsCancel" type="button" style="border:none;background:transparent;color:#888;padding:6px;font-size:.85rem;cursor:pointer;">キャンセル</button>' +
        '</div>' +
        '<p id="slsStatus" style="min-height:1.4em;margin:12px 0 0;font-size:.83rem;color:#d9534f;line-height:1.6;"></p>' +
      '</div>';
    document.body.appendChild(wrap);
    els = {
      wrap: wrap,
      code: wrap.querySelector('#slsCode'),
      copy: wrap.querySelector('#slsCopy'),
      link: wrap.querySelector('#slsProjectLink'),
      done: wrap.querySelector('#slsDone'),
      cancel: wrap.querySelector('#slsCancel'),
      status: wrap.querySelector('#slsStatus')
    };
    els.cancel.addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    els.copy.addEventListener('click', function () {
      if (navigator.clipboard && currentCode) {
        navigator.clipboard.writeText(currentCode).then(function () {
          els.status.style.color = '#4c97ff';
          els.status.textContent = 'コピーしました。そのまま貼り付けてコメントしてください。';
        });
      }
    });
    els.done.addEventListener('click', verify);
  }

  function open() {
    buildModal();
    currentCode = genCode();
    issuedAt = Date.now();
    els.code.textContent = currentCode;
    els.link.href = projectUrl();
    els.status.textContent = '';
    els.wrap.style.display = 'flex';
  }
  function stopPolling() {
    pollToken++;
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    if (els) els.done.disabled = false;
  }
  function close() {
    stopPolling();
    if (els) els.wrap.style.display = 'none';
  }

  function fetchCommentsPage(page) {
    var url = 'https://scratch.mit.edu/site-api/comments/project/' + config.projectId + '/?page=' + page + '&_=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('コメントを取得できませんでした');
      return res.text();
    });
  }

  function findCodeIn(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var comments = doc.querySelectorAll('.comment');
    for (var i = 0; i < comments.length; i++) {
      var contentEl = comments[i].querySelector('.content');
      var userEl = comments[i].querySelector('[data-comment-user]');
      if (!contentEl || !userEl) continue;
      if (contentEl.textContent.indexOf(currentCode) === -1) continue;
      var timeEl = comments[i].querySelector('.time');
      if (timeEl && timeEl.getAttribute('title')) {
        var t = Date.parse(timeEl.getAttribute('title'));
        if (!isNaN(t) && issuedAt - t > 60 * 60 * 1000) continue;
      }
      return userEl.getAttribute('data-comment-user');
    }
    return null;
  }

  function verify() {
    if (!currentCode) return;
    stopPolling();
    var token = pollToken;
    var deadline = Date.now() + 60 * 1000;
    els.done.disabled = true;
    function attempt() {
      if (token !== pollToken) return;
      els.status.style.color = '#666';
      els.status.textContent = '確認中です…（自動で再チェックしています）';
      fetchCommentsPage(1)
        .then(function (html) {
          if (token !== pollToken) return null;
          var user = findCodeIn(html);
          if (user) return user;
          return fetchCommentsPage(2).then(function (html2) {
            return token === pollToken ? findCodeIn(html2) : null;
          });
        })
        .then(function (user) {
          if (token !== pollToken) return;
          if (user) {
            stopPolling();
            setUser(user);
            els.status.style.color = '#2e9e5b';
            els.status.textContent = 'ログイン完了！ @' + user;
            if (typeof config.onLogin === 'function') config.onLogin(user);
            setTimeout(close, 900);
          } else if (Date.now() < deadline) {
            pollTimer = setTimeout(attempt, 3000);
          } else {
            stopPolling();
            els.status.style.color = '#d9534f';
            els.status.textContent = 'まだコードが見つかりませんでした。コメントが反映されるまで少し時間がかかることがあります。少し待ってから、もう一度押してみてください。';
          }
        })
        .catch(function () {
          if (token !== pollToken) return;
          if (Date.now() < deadline) {
            pollTimer = setTimeout(attempt, 3000);
          } else {
            stopPolling();
            els.status.style.color = '#d9534f';
            els.status.textContent = '確認に失敗しました。ネットの接続を確かめて、もう一度押してみてください。';
          }
        });
    }
    attempt();
  }

  var api = {
    init: function (options) {
      options = options || {};
      if (options.projectId) config.projectId = String(options.projectId);
      if (typeof options.onLogin === 'function') config.onLogin = options.onLogin;
      if (typeof options.onLogout === 'function') config.onLogout = options.onLogout;
      if (options.storageKey) config.storageKey = String(options.storageKey);
      return api;
    },
    login: function () { open(); },
    logout: function () {
      setUser(null);
      if (typeof config.onLogout === 'function') config.onLogout();
    },
    getUser: getUser,
    projectUrl: projectUrl
  };

  global.ScratchLogin = api;
  global.ScratchLoginSystem = api;
})(window);
